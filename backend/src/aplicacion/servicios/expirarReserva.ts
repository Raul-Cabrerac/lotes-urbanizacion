import { ErrorConflicto } from '../../dominio/errores';
import { OPERACIONES_LOTE } from '../../dominio/lote';
import { estaVencida, OPERACIONES_RESERVA } from '../../dominio/reserva';
import type { EstadoReserva } from '../../dominio/tipos';
import type { Transicion } from '../../dominio/transiciones';
import type { Reloj, Repositorios, ReservaVista, UnidadDeTrabajo } from '../puertos';

export const MOTIVO_VENCIMIENTO_RESERVA = 'Venció el plazo de la reserva';

/*
 * Una reserva vencida se cierra en su PROPIA transacción, antes de cualquier operación sobre su
 * lote (reservar, vender, cancelar) y antes de cada petición (ver app.ts). Así el vencimiento queda
 * guardado aunque la operación que sigue falle, y las operaciones ven el lote ya liberado sin
 * casos especiales.
 */

/** Vence la reserva indicada si su plazo ya pasó. Devuelve true si la venció. */
export function vencerReserva(uow: UnidadDeTrabajo, reloj: Reloj, reservaId: number): Promise<boolean> {
  return uow.transaccion(async (repos) => {
    const reserva = await repos.reservas.buscarPorId(reservaId);
    return reserva ? vencerSiCorresponde(repos, reloj, reserva) : false;
  });
}

/** Vence la reserva activa del lote si su plazo ya pasó. Devuelve true si la venció. */
export function vencerReservaDelLote(uow: UnidadDeTrabajo, reloj: Reloj, loteId: number): Promise<boolean> {
  return uow.transaccion(async (repos) => {
    const activa = await repos.reservas.buscarActivaPorLote(loteId);
    return activa ? vencerSiCorresponde(repos, reloj, activa) : false;
  });
}

async function vencerSiCorresponde(repos: Repositorios, reloj: Reloj, reserva: ReservaVista): Promise<boolean> {
  if (!estaVencida(reserva, reloj.hoy())) return false;
  return cerrarReservaYLiberarLote(repos, reserva, OPERACIONES_RESERVA.vencer, reloj.ahora(), MOTIVO_VENCIMIENTO_RESERVA);
}

/**
 * Cierra una reserva activa (al cancelarla o al vencer) y devuelve su lote a DISPONIBLE, dentro de
 * la transacción de `repos`, en el orden de bloqueo reserva -> lote (ver UnidadDeTrabajo en
 * puertos.ts). Devuelve false si la reserva ya no estaba activa: otra operación la cerró antes.
 */
export async function cerrarReservaYLiberarLote(
  repos: Repositorios,
  reserva: { id: number; loteId: number },
  transicion: Transicion<EstadoReserva>,
  fecha: Date,
  motivo: string,
): Promise<boolean> {
  if (!(await repos.reservas.finalizar(reserva.id, transicion, fecha, motivo))) return false;
  if (!(await repos.lotes.cambiarEstadoSi(reserva.loteId, OPERACIONES_LOTE.liberarReserva))) {
    throw new ErrorConflicto('LOTE_MODIFICADO', 'El lote de la reserva ya no estaba en estado RESERVADO.');
  }
  return true;
}
