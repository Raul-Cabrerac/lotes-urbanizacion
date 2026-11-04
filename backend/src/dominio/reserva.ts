/**
 * Reglas de las reservas (consigna, secciones 5 y 7).
 */
import { ErrorConflicto, ErrorReglaNegocio } from './errores';
import type { FechaISO } from './fechas';
import type { EstadoReserva } from './tipos';

interface ReservaVencible {
  estado: EstadoReserva;
  fechaVencimiento: FechaISO | null;
}

/**
 * Una reserva ACTIVA vence cuando su fecha de vencimiento ya pasó.
 * Si vence hoy, todavía es válida durante todo el día.
 */
export function estaVencida(reserva: ReservaVencible, hoy: FechaISO): boolean {
  return reserva.estado === 'ACTIVA' && reserva.fechaVencimiento !== null && reserva.fechaVencimiento < hoy;
}

/** La fecha de vencimiento es opcional, pero si se indica no puede ser anterior a hoy. */
export function validarFechaVencimiento(fecha: FechaISO | null | undefined, hoy: FechaISO): void {
  if (fecha && fecha < hoy) {
    throw new ErrorReglaNegocio(
      'FECHA_VENCIMIENTO_INVALIDA',
      'La fecha de vencimiento de la reserva no puede ser anterior a hoy.',
    );
  }
}

/** Solo una reserva ACTIVA se puede cancelar (una reserva convertida en venta ya no). */
export function validarReservaCancelable(reserva: { estado: EstadoReserva }): void {
  if (reserva.estado !== 'ACTIVA') {
    throw new ErrorConflicto(
      'RESERVA_NO_ACTIVA',
      `Solo se pueden cancelar reservas activas (estado actual: ${reserva.estado}).`,
    );
  }
}
