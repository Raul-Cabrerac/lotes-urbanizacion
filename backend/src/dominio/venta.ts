/**
 * Reglas de la venta (consigna, sección 8).
 * La generación del cronograma y el cálculo del saldo están en planPagos.ts.
 */
import { sumar } from './dinero';
import { ErrorConflicto, ErrorReglaNegocio } from './errores';
import type { EstadoVenta } from './tipos';
import { admite, type Transicion } from './transiciones';

/** La máquina de estados de la venta. */
export const OPERACIONES_VENTA: Readonly<Record<'anular', Transicion<EstadoVenta>>> = {
  anular: { de: ['VIGENTE'], a: 'ANULADA' },
};

/** Largo mínimo del motivo de una anulación. */
export const LONGITUD_MINIMA_MOTIVO = 5;

/** Las operaciones que deshacen algo (anular venta o pago) exigen un motivo para dejar trazabilidad. */
export function validarMotivo(motivo: string): void {
  if (motivo.trim().length < LONGITUD_MINIMA_MOTIVO) {
    throw new ErrorReglaNegocio(
      'MOTIVO_REQUERIDO',
      `Indique el motivo de la anulación (mínimo ${LONGITUD_MINIMA_MOTIVO} caracteres).`,
    );
  }
}

/** Solo una venta VIGENTE se puede anular. Al anularla, el lote vuelve a quedar DISPONIBLE. */
export function validarVentaAnulable(venta: { estado: EstadoVenta }, motivo: string): void {
  if (!admite(OPERACIONES_VENTA.anular, venta.estado)) throw ventaYaAnulada();
  validarMotivo(motivo);
}

/** Lo que un cliente todavía debe: el saldo de sus ventas VIGENTES (una venta anulada no se cobra). */
export function saldoPendienteDelCliente(
  ventas: readonly { estado: EstadoVenta; resumen: { saldoPendiente: number } }[],
): number {
  return sumar(...ventas.filter((venta) => venta.estado === 'VIGENTE').map((venta) => venta.resumen.saldoPendiente));
}

/** El error de anular una venta ya anulada (también si otro usuario la anuló un instante antes). */
export function ventaYaAnulada(): ErrorConflicto {
  return new ErrorConflicto('VENTA_NO_VIGENTE', 'La venta ya fue anulada.');
}
