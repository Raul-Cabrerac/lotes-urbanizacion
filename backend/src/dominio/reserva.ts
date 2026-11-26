/**
 * Reglas de las reservas (consigna, secciones 5 y 7).
 */
import { comparar, enBolivianos, esMontoValido, redondear } from './dinero';
import { ErrorConflicto, ErrorReglaNegocio } from './errores';
import type { FechaISO } from './fechas';
import type { EstadoReserva } from './tipos';
import { admite, type Transicion } from './transiciones';

export type OperacionReserva = 'cancelar' | 'vencer' | 'convertir';

/** La máquina de estados de la reserva: solo una reserva ACTIVA cambia de estado, y una sola vez. */
export const OPERACIONES_RESERVA: Readonly<Record<OperacionReserva, Transicion<EstadoReserva>>> = {
  cancelar: { de: ['ACTIVA'], a: 'CANCELADA' },
  vencer: { de: ['ACTIVA'], a: 'VENCIDA' },
  convertir: { de: ['ACTIVA'], a: 'CONVERTIDA' }, // al vender el lote reservado
};

interface ReservaVencible {
  estado: EstadoReserva;
  fechaVencimiento: FechaISO | null;
}

/**
 * Una reserva ACTIVA vence cuando su fecha de vencimiento ya pasó.
 * Si vence hoy, todavía es válida durante todo el día.
 */
export function estaVencida(reserva: ReservaVencible, hoy: FechaISO): boolean {
  return (
    admite(OPERACIONES_RESERVA.vencer, reserva.estado) &&
    reserva.fechaVencimiento !== null &&
    reserva.fechaVencimiento < hoy
  );
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

/** Porcentaje del precio del lote que se exige, como mínimo, de anticipo para reservarlo. */
export const PORCENTAJE_MINIMO_ANTICIPO = 10;

/** El anticipo mínimo para reservar un lote de ese precio: el 10 %. */
export function anticipoMinimo(precioLote: number): number {
  return redondear((precioLote * PORCENTAJE_MINIMO_ANTICIPO) / 100);
}

/**
 * Reservar exige un anticipo: el cliente paga para apartar el lote (docs/DECISIONES.md §18).
 * Debe ser un monto válido, de al menos el 10 % del precio del lote y menor a ese precio.
 */
export function validarAnticipo(anticipo: unknown, precioLote: number): void {
  if (!esMontoValido(anticipo)) {
    throw new ErrorReglaNegocio(
      'ANTICIPO_INVALIDO',
      'El anticipo de la reserva debe ser mayor a 0 (mínimo Bs 0,01) y tener como máximo 2 decimales.',
    );
  }
  const minimo = anticipoMinimo(precioLote);
  if (comparar(anticipo, minimo) < 0) {
    throw new ErrorReglaNegocio(
      'ANTICIPO_INSUFICIENTE',
      `El anticipo (${enBolivianos(anticipo)}) debe ser al menos el ${PORCENTAJE_MINIMO_ANTICIPO} % del precio del lote ` +
        `(${enBolivianos(minimo)}).`,
    );
  }
  if (comparar(anticipo, precioLote) >= 0) {
    throw new ErrorReglaNegocio(
      'ANTICIPO_EXCEDE_PRECIO',
      `El anticipo (${enBolivianos(anticipo)}) debe ser menor al precio del lote (${enBolivianos(precioLote)}).`,
    );
  }
}

/** Solo una reserva ACTIVA se puede cancelar (una reserva convertida en venta ya no). */
export function validarReservaCancelable(reserva: { estado: EstadoReserva }): void {
  if (!admite(OPERACIONES_RESERVA.cancelar, reserva.estado)) {
    throw new ErrorConflicto(
      'RESERVA_NO_ACTIVA',
      `Solo se pueden cancelar reservas activas (estado actual: ${reserva.estado}).`,
    );
  }
}
