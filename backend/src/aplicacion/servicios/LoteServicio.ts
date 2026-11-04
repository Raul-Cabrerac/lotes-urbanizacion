import { redondear } from '../../dominio/dinero';
import { ErrorConflicto, ErrorNoEncontrado } from '../../dominio/errores';
import { calcularAreaM2, normalizarPoligono, sugerirDimensiones } from '../../dominio/geometria';
import { validarCambioEstadoManual, validarDatosComerciales, validarLoteEliminable } from '../../dominio/lote';
import { resumirPlan } from '../../dominio/planPagos';
import type { EstadoLote, Lote } from '../../dominio/tipos';
import type { DatosLote, FiltrosLotes, Reloj, UnidadDeTrabajo, UsuarioActual } from '../puertos';
import { normalizarCodigo, prepararDatosLote, type EntradaLote } from './datosLote';
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
    const [reserva] = await this.uow.repos.reservas.listar({ loteId: id, estado: 'ACTIVA' });
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

  /** Crea un lote dibujado en el mapa. Un lote siempre pertenece a un proyecto (consigna §3). */
  async crear(proyectoId: number, entrada: EntradaLote): Promise<Lote> {
    await this.proyectos.buscarExistente(proyectoId);
    const datos = prepararDatosLote(entrada);
    await this.validarCodigoUnico(proyectoId, datos.codigo);
    return this.uow.repos.lotes.crear(proyectoId, datos);
  }

  /** Edita datos y/o geometría. El estado NO se cambia aquí (ver cambiarEstado, reservas y ventas). */
  async actualizar(id: number, cambios: Partial<EntradaLote>): Promise<Lote> {
    const actual = await this.buscar(id);
    const cambiaGeometria = cambios.geometria !== undefined;
    const geometria = cambiaGeometria ? normalizarPoligono(cambios.geometria) : actual.geometria;
    // superficieM2 = null significa "recalcular desde el polígono".
    const superficieM2 =
      cambios.superficieM2 === null
        ? calcularAreaM2(geometria)
        : (cambios.superficieM2 ?? (cambiaGeometria ? calcularAreaM2(geometria) : actual.superficieM2));

    const datos: DatosLote = {
      codigo: cambios.codigo !== undefined ? normalizarCodigo(cambios.codigo) : actual.codigo,
      manzano: cambios.manzano?.trim() ?? actual.manzano,
      etapa: cambios.etapa?.trim() ?? actual.etapa,
      precio: cambios.precio !== undefined ? redondear(cambios.precio) : actual.precio,
      superficieM2: redondear(superficieM2),
      dimensiones:
        cambios.dimensiones?.trim() || (cambiaGeometria ? sugerirDimensiones(geometria) : actual.dimensiones),
      geometria,
    };
    validarDatosComerciales(datos);
    if (datos.codigo !== actual.codigo) await this.validarCodigoUnico(actual.proyectoId, datos.codigo);
    return this.uow.repos.lotes.actualizar(id, datos);
  }

  /** El administrador solo puede bloquear y desbloquear a mano (consigna §5, BLOQUEADO). */
  async cambiarEstado(id: number, nuevoEstado: EstadoLote): Promise<Lote> {
    const lote = await this.buscar(id);
    validarCambioEstadoManual(lote.estado, nuevoEstado);
    const cambiado = await this.uow.repos.lotes.cambiarEstadoSi(id, lote.estado, nuevoEstado);
    if (!cambiado) {
      throw new ErrorConflicto(
        'LOTE_MODIFICADO',
        'Otro usuario modificó el lote. Actualice la página e intente de nuevo.',
      );
    }
    return this.buscar(id);
  }

  async eliminar(id: number): Promise<void> {
    const lote = await this.buscar(id);
    validarLoteEliminable(lote, await this.uow.repos.lotes.tieneOperaciones(id));
    await this.uow.repos.lotes.eliminar(id);
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

  private async validarCodigoUnico(proyectoId: number, codigo: string): Promise<void> {
    if (await this.uow.repos.lotes.buscarPorCodigo(proyectoId, codigo)) {
      throw new ErrorConflicto(
        'CODIGO_LOTE_DUPLICADO',
        `Ya existe un lote con el código ${codigo} en este proyecto.`,
      );
    }
  }
}
