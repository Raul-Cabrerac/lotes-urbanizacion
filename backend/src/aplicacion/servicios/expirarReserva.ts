import { ErrorConflicto } from '../../dominio/errores';
import type { FechaISO } from '../../dominio/fechas';
import { estaVencida } from '../../dominio/reserva';
import type { EstadoReserva } from '../../dominio/tipos';
import type { Repositorios } from '../puertos';

export const MOTIVO_VENCIMIENTO_RESERVA = 'Venció el plazo de la reserva';

/**
 * Si una reserva ACTIVA ya superó su fecha de vencimiento, la cierra como VENCIDA
 * y devuelve su lote a DISPONIBLE siguiendo el orden de bloqueo reserva -> lote.
 */
export async function expirarReservaSiVencida(
  repos: Repositorios,
  reserva: { id: number; loteId: number; estado: EstadoReserva; fechaVencimiento: FechaISO | null },
  hoy: FechaISO,
  ahora: Date,
): Promise<boolean> {
  if (!estaVencida(reserva, hoy)) return false;
  const vencida = await repos.reservas.finalizar(reserva.id, 'VENCIDA', ahora, MOTIVO_VENCIMIENTO_RESERVA);
  if (!vencida) return false;
  const liberado = await repos.lotes.cambiarEstadoSi(reserva.loteId, 'RESERVADO', 'DISPONIBLE');
  if (!liberado) {
    throw new ErrorConflicto('LOTE_MODIFICADO', 'El lote de la reserva vencida no estaba en estado RESERVADO.');
  }
  return true;
}
