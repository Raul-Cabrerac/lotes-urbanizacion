import { ErrorConflicto, ErrorNoEncontrado } from '../../dominio/errores';
import { calcularAreaM2, normalizarPoligono, sugerirDimensiones } from '../../dominio/geometria';
import { validarCambioEstadoManual, validarLoteEliminable, validarPrecioLoteReservado } from '../../dominio/lote';
import { resumirPlan } from '../../dominio/planPagos';
import { validarSinSuperposicion } from '../../dominio/superposicion';
import type { EstadoLote, Lote } from '../../dominio/tipos';
import type { FiltrosLotes, Reloj, Repositorios, UnidadDeTrabajo, UsuarioActual } from '../puertos';
import { prepararCambiosLote, prepararDatosLote, type EntradaLote } from './datosLote';
import type { ProyectoServicio } from './ProyectoServicio';

/** Gestión de lotes y su geometría (consigna §3 y §4). La importación KML está en ImportacionKmlServicio. */
export class LoteServicio {
  constructor(
    private readonly uow: UnidadDeTrabajo,
    private readonly proyectos: ProyectoServicio,
    private readonly reloj: Reloj,
  ) {}

  async listar(proyectoId: number, filtros: FiltrosLotes, usuario: UsuarioActual): Promise<Lote[]> {
    await this.proyectos.buscarVisible(proyectoId, usuario);
    return this.uow.repos.lotes.listarPorProyecto(proyectoId, filtros);
  }

  /** Detalle completo de un lote: se carga "bajo demanda" al hacer clic en el polígono (consigna §11). */
  async obtenerDetalle(id: number, usuario: UsuarioActual) {
    const lote = await this.buscar(id);
    const proyecto = await this.proyectos.buscarVisible(lote.proyectoId, usuario);
    const reserva = await this.uow.repos.reservas.buscarActivaPorLote(id);
    const [venta] = await this.uow.repos.ventas.listar({ loteId: id, estado: 'VIGENTE' });
    const resumenVenta = venta
      ? resumirPlan(venta.precioPactado, venta.cuotas, venta.pagos, this.reloj.hoy())
      : null;

    return {
      ...lote,
      proyecto: { id: proyecto.id, nombre: proyecto.nombre, estado: proyecto.estado },
      reservaActiva: reserva
        ? {
            id: reserva.id,
            fecha: reserva.fecha,
            fechaVencimiento: reserva.fechaVencimiento,
            observacion: reserva.observacion,
            anticipo: reserva.anticipo,
            metodoAnticipo: reserva.metodoAnticipo,
            cliente: reserva.cliente,
            asesor: reserva.asesor,
          }
        : null,
      ventaVigente:
        venta && resumenVenta
          ? {
              id: venta.id,
              fecha: venta.fecha,
              precioPactado: venta.precioPactado,
              modalidad: venta.modalidad,
              cliente: venta.cliente,
              asesor: venta.asesor,
              totalPagado: resumenVenta.totalPagado,
              saldoPendiente: resumenVenta.saldoPendiente,
            }
          : null,
    };
  }

  /**
   * Crea un lote dibujado en el mapa. Un lote siempre pertenece a un proyecto (consigna §3) y no
   * puede ocupar terreno de otro lote del mismo proyecto (consigna §11).
   */
  async crear(proyectoId: number, entrada: EntradaLote): Promise<Lote> {
    await this.proyectos.buscarExistente(proyectoId);
    const datos = prepararDatosLote(entrada);
    validarSinSuperposicion(datos, await this.uow.repos.lotes.listarPorProyecto(proyectoId));
    await this.validarCodigoUnico(this.uow.repos, proyectoId, datos.codigo);
    return this.uow.repos.lotes.crear(proyectoId, datos);
  }

  /** Edita datos y/o geometría. El estado NO se cambia aquí (ver cambiarEstado, reservas y ventas). */
  async actualizar(id: number, cambios: Partial<EntradaLote>): Promise<Lote> {
    return this.uow.transaccion(async (repos) => {
      await repos.lotes.bloquearPorId(id);
      const actual = await repos.lotes.buscarPorId(id);
      if (!actual) throw new ErrorNoEncontrado('Lote no encontrado.');

      const datos = prepararCambiosLote(actual, cambios);
      validarPrecioLoteReservado(actual.estado, datos.precio);
      if (cambios.geometria !== undefined) {
        const losDemas = (await repos.lotes.listarPorProyecto(actual.proyectoId)).filter((lote) => lote.id !== id);
        validarSinSuperposicion(datos, losDemas);
      }
      if (datos.codigo !== actual.codigo) await this.validarCodigoUnico(repos, actual.proyectoId, datos.codigo);
      return repos.lotes.actualizar(id, datos);
    });
  }

  /** El administrador solo puede bloquear y desbloquear a mano (consigna §5, BLOQUEADO). */
  async cambiarEstado(id: number, nuevoEstado: EstadoLote): Promise<Lote> {
    return this.uow.transaccion(async (repos) => {
      await repos.lotes.bloquearPorId(id);
      const lote = await repos.lotes.buscarPorId(id);
      if (!lote) throw new ErrorNoEncontrado('Lote no encontrado.');
      const transicion = validarCambioEstadoManual(lote.estado, nuevoEstado);
      const cambiado = await repos.lotes.cambiarEstadoSi(id, transicion);
      if (!cambiado) {
        throw new ErrorConflicto(
          'LOTE_MODIFICADO',
          'Otro usuario modificó el lote. Actualice la página e intente de nuevo.',
        );
      }
      const actualizado = await repos.lotes.buscarPorId(id);
      if (!actualizado) throw new ErrorNoEncontrado('Lote no encontrado.');
      return actualizado;
    });
  }

  async eliminar(id: number): Promise<void> {
    await this.uow.transaccion(async (repos) => {
      const inicial = await repos.lotes.buscarPorId(id);
      if (!inicial) throw new ErrorNoEncontrado('Lote no encontrado.');
      // Orden de bloqueo: proyecto -> lote (ver UnidadDeTrabajo en puertos.ts).
      await repos.proyectos.bloquearPorId(inicial.proyectoId);
      await repos.lotes.bloquearPorId(id);
      const lote = await repos.lotes.buscarPorId(id);
      if (!lote) throw new ErrorNoEncontrado('Lote no encontrado.');
      const proyecto = await repos.proyectos.buscarPorId(lote.proyectoId);
      if (!proyecto) throw new ErrorNoEncontrado('Proyecto no encontrado.');
      const [tieneOperaciones, lotesProyecto] = await Promise.all([
        repos.lotes.tieneOperaciones(id),
        repos.lotes.listarPorProyecto(lote.proyectoId),
      ]);
      validarLoteEliminable(lote, tieneOperaciones, proyecto.estado, lotesProyecto.length);
      await repos.lotes.eliminar(id);
    });
  }

  /** Valida un polígono dibujado y devuelve la superficie y dimensiones sugeridas (vista previa). */
  analizarGeometria(geometria: unknown) {
    const poligono = normalizarPoligono(geometria);
    return {
      geometria: poligono,
      superficieM2: calcularAreaM2(poligono),
      dimensiones: sugerirDimensiones(poligono),
    };
  }

  private async buscar(id: number): Promise<Lote> {
    const lote = await this.uow.repos.lotes.buscarPorId(id);
    if (!lote) throw new ErrorNoEncontrado('Lote no encontrado.');
    return lote;
  }

  private async validarCodigoUnico(repos: Repositorios, proyectoId: number, codigo: string): Promise<void> {
    if (await repos.lotes.buscarPorCodigo(proyectoId, codigo)) {
      throw new ErrorConflicto(
        'CODIGO_LOTE_DUPLICADO',
        `Ya existe un lote con el código ${codigo} en este proyecto.`,
      );
    }
  }
}
