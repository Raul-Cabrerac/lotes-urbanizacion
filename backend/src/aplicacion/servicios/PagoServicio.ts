import { ErrorNoEncontrado } from '../../dominio/errores';
import { resumirPlan, validarPago, validarPagoAnulable } from '../../dominio/planPagos';
import type { MetodoPago } from '../../dominio/tipos';
import type { Reloj, UnidadDeTrabajo, UsuarioActual } from '../puertos';
import type { VentaServicio } from './VentaServicio';

export interface EntradaPago {
  cuotaId: number;
  monto: number;
  metodo?: MetodoPago;
  referencia?: string;
}

/** Registro y anulación de pagos de cuotas (consigna, sección 9). */
export class PagoServicio {
  constructor(
    private readonly uow: UnidadDeTrabajo,
    private readonly ventas: VentaServicio,
    private readonly reloj: Reloj,
  ) {}

  /**
   * Registra el pago de una cuota. El saldo se recalcula desde los pagos
   * válidos; la validación impide montos inválidos y que el saldo quede negativo.
   * Devuelve la venta actualizada (cuotas, total pagado y saldo).
   */
  async registrar(ventaId: number, entrada: EntradaPago, usuario: UsuarioActual) {
    await this.uow.transaccion(async (repos) => {
      // Consigna §9, el saldo nunca es negativo: con la venta bloqueada, dos pagos simultáneos se
      // atienden uno tras otro y el segundo se valida contra el saldo que dejó el primero.
      await repos.ventas.bloquearPorId(ventaId);
      const venta = await repos.ventas.buscarPorId(ventaId);
      if (!venta) throw new ErrorNoEncontrado('Venta no encontrada.');

      const resumen = resumirPlan(venta.precioPactado, venta.cuotas, venta.pagos, this.reloj.hoy());
      const cuota = resumen.cuotas.find((c) => c.id === entrada.cuotaId);
      if (!cuota) throw new ErrorNoEncontrado('La cuota no pertenece a esta venta.');

      validarPago(entrada.monto, venta.estado, cuota, resumen.saldoPendiente);

      await repos.pagos.crear({
        cuotaId: cuota.id,
        monto: entrada.monto,
        metodo: entrada.metodo ?? 'EFECTIVO',
        referencia: entrada.referencia?.trim() ?? '',
        fecha: this.reloj.ahora(),
        registradoPorId: usuario.id,
      });
    });
    return this.ventas.obtener(ventaId, usuario);
  }

  /** Anula un pago (solo administrador) conservando quién, cuándo y por qué. */
  async anular(pagoId: number, motivo: string, usuario: UsuarioActual) {
    const ventaId = await this.uow.transaccion(async (repos) => {
      const pago = await repos.pagos.buscarPorId(pagoId);
      if (!pago) throw new ErrorNoEncontrado('Pago no encontrado.');
      validarPagoAnulable(pago, motivo);
      await repos.pagos.anular(pagoId, { motivo: motivo.trim(), anuladoPorId: usuario.id, fecha: this.reloj.ahora() });
      return pago.ventaId;
    });
    return this.ventas.obtener(ventaId, usuario);
  }
}
