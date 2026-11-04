/**
 * Reglas de la venta (consigna, sección 8).
 * La generación del cronograma y el cálculo del saldo están en planPagos.ts.
 */
import { ErrorConflicto, ErrorReglaNegocio } from './errores';
import type { EstadoVenta } from './tipos';

/** Las operaciones que deshacen algo (anular venta o pago) exigen un motivo para dejar trazabilidad. */
export function validarMotivo(motivo: string): void {
  if (motivo.trim().length < 5) {
    throw new ErrorReglaNegocio('MOTIVO_REQUERIDO', 'Indique el motivo de la anulación (mínimo 5 caracteres).');
  }
}

/** Solo una venta VIGENTE se puede anular. Al anularla, el lote vuelve a quedar DISPONIBLE. */
export function validarVentaAnulable(venta: { estado: EstadoVenta }, motivo: string): void {
  if (venta.estado !== 'VIGENTE') {
    throw new ErrorConflicto('VENTA_NO_VIGENTE', 'La venta ya fue anulada.');
  }
  validarMotivo(motivo);
}
