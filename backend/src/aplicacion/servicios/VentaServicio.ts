import { ErrorConflicto, ErrorNoEncontrado, ErrorSinPermiso } from '../../dominio/errores';
import type { FechaISO } from '../../dominio/fechas';
import { validarCambioEstado, validarLoteVendible } from '../../dominio/lote';
import { generarPlanDePagos, resumirPlan } from '../../dominio/planPagos';
import type { MetodoPago, ModalidadPago } from '../../dominio/tipos';
import { validarVentaAnulable } from '../../dominio/venta';
import type { FiltrosVentas, Reloj, UnidadDeTrabajo, UsuarioActual, VentaVista } from '../puertos';

export interface EntradaVenta {
  loteId: number;
  clienteId: number;
  modalidad: ModalidadPago;
  precioPactado?: number; // por defecto, el precio actual del lote
  cuotaInicial?: number;
  numeroCuotas?: number;
  fechaPrimeraCuota?: FechaISO;
  metodoPago?: MetodoPago; // cómo se cobra la cuota inicial o el pago al contado
}

export type EntradaSimulacion = Omit<EntradaVenta, 'loteId' | 'clienteId' | 'metodoPago'> & { precioPactado: number };

/** Ventas de lotes y su plan de pagos (consigna, secciones 8 y 9). */
export class VentaServicio {
  constructor(
    private readonly uow: UnidadDeTrabajo,
    private readonly reloj: Reloj,
  ) {}

  /** Un cliente solo ve sus propias ventas, aunque pida las de otro. */
  async listar(filtros: FiltrosVentas, usuario: UsuarioActual) {
    const filtrosEfectivos = usuario.rol === 'CLIENTE' ? { ...filtros, clienteId: usuario.clienteId ?? -1 } : filtros;
    const ventas = await this.uow.repos.ventas.listar(filtrosEfectivos);
    return ventas.map((venta) => this.conResumen(venta));
  }

  async obtener(id: number, usuario: UsuarioActual) {
    const venta = await this.uow.repos.ventas.buscarPorId(id);
    if (!venta) throw new ErrorNoEncontrado('Venta no encontrada.');
    if (usuario.rol === 'CLIENTE' && venta.clienteId !== usuario.clienteId) {
      throw new ErrorSinPermiso('Solo puede consultar sus propias operaciones.');
    }
    return this.conResumen(venta);
  }

  /** Vista previa del cronograma antes de confirmar la venta (no guarda nada). */
  simularPlan(entrada: EntradaSimulacion) {
    return generarPlanDePagos({ ...entrada, fechaVenta: this.reloj.hoy() });
  }

  /**
   * Registra la venta en UNA transacción:
   *   lote -> VENDIDO, reserva -> CONVERTIDA, venta + cuotas, y el cobro de la
   *   cuota inicial (o del pago al contado).
   * Si cualquier paso falla no se guarda nada (no quedan estados parciales).
   * El precio pactado queda guardado en la venta: si después cambia el precio
   * del lote, la venta no se modifica.
   */
  async registrar(entrada: EntradaVenta, usuario: UsuarioActual) {
    const ventaId = await this.uow.transaccion(async (repos) => {
      const lote = await repos.lotes.buscarPorId(entrada.loteId);
      if (!lote) throw new ErrorNoEncontrado('Lote no encontrado.');
      const cliente = await repos.clientes.buscarPorId(entrada.clienteId);
      if (!cliente) throw new ErrorNoEncontrado('Cliente no encontrado.');
      const proyecto = await repos.proyectos.buscarPorId(lote.proyectoId);
      if (!proyecto) throw new ErrorNoEncontrado('Proyecto no encontrado.');
      const reservaActiva = await repos.reservas.buscarActivaPorLote(lote.id);

      validarLoteVendible(lote, proyecto.estado, cliente.id, reservaActiva);

      const ahora = this.reloj.ahora();
      const precioPactado = entrada.precioPactado ?? lote.precio;
      const esFinanciada = entrada.modalidad === 'FINANCIADO';
      const cuotas = generarPlanDePagos({
        precioPactado,
        modalidad: entrada.modalidad,
        cuotaInicial: entrada.cuotaInicial,
        numeroCuotas: entrada.numeroCuotas,
        fechaVenta: this.reloj.hoy(),
        fechaPrimeraCuota: entrada.fechaPrimeraCuota,
      });

      validarCambioEstado(lote.estado, 'VENDIDO');
      const vendido = await repos.lotes.cambiarEstadoSi(lote.id, lote.estado, 'VENDIDO');
      if (!vendido) {
        throw new ErrorConflicto('LOTE_NO_DISPONIBLE', `El lote ${lote.codigo} acaba de ser modificado por otro usuario.`);
      }
      if (reservaActiva) await repos.reservas.finalizar(reservaActiva.id, 'CONVERTIDA', ahora);

      const venta = await repos.ventas.crear(
        {
          loteId: lote.id,
          clienteId: cliente.id,
          asesorId: usuario.id,
          reservaId: reservaActiva?.id ?? null,
          fecha: ahora,
          precioPactado,
          modalidad: entrada.modalidad,
          cuotaInicial: esFinanciada ? (entrada.cuotaInicial ?? 0) : 0,
          numeroCuotas: esFinanciada ? (entrada.numeroCuotas ?? 0) : 0,
        },
        cuotas,
      );

      // La cuota inicial (o el pago al contado) se cobra al firmar la venta.
      const cuotaAlFirmar = venta.cuotas.find((cuota) => cuota.numero === 0);
      if (cuotaAlFirmar) {
        await repos.pagos.crear({
          cuotaId: cuotaAlFirmar.id,
          monto: cuotaAlFirmar.monto,
          metodo: entrada.metodoPago ?? 'EFECTIVO',
          referencia: 'Cobrado al registrar la venta',
          fecha: ahora,
          registradoPorId: usuario.id,
        });
      }
      return venta.id;
    });

    return this.obtener(ventaId, usuario);
  }

  /** Anula una venta vigente (solo administrador): el lote vuelve a DISPONIBLE y los pagos quedan como historial. */
  async anular(id: number, motivo: string, usuario: UsuarioActual) {
    await this.uow.transaccion(async (repos) => {
      const venta = await repos.ventas.buscarPorId(id);
      if (!venta) throw new ErrorNoEncontrado('Venta no encontrada.');
      validarVentaAnulable(venta, motivo);
      validarCambioEstado('VENDIDO', 'DISPONIBLE');

      await repos.ventas.anular(id, { motivo: motivo.trim(), anuladaPorId: usuario.id, fecha: this.reloj.ahora() });
      await repos.lotes.cambiarEstadoSi(venta.loteId, 'VENDIDO', 'DISPONIBLE');
    });
    return this.obtener(id, usuario);
  }

  /** Agrega el estado de cada cuota, el total pagado y el saldo (calculados, no guardados). */
  private conResumen(venta: VentaVista) {
    const { cuotas, ...resumen } = resumirPlan(venta.precioPactado, venta.cuotas, venta.pagos, this.reloj.hoy());
    return { ...venta, cuotas, resumen };
  }
}
