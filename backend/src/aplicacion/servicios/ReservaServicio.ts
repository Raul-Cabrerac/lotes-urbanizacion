import { ErrorConflicto, ErrorNoEncontrado } from '../../dominio/errores';
import type { FechaISO } from '../../dominio/fechas';
import { validarCambioEstado, validarLoteReservable } from '../../dominio/lote';
import { estaVencida, validarFechaVencimiento, validarReservaCancelable } from '../../dominio/reserva';
import type { FiltrosReservas, Reloj, ReservaVista, UnidadDeTrabajo, UsuarioActual } from '../puertos';
import { expirarReservaSiVencida } from './expirarReserva';

export interface EntradaReserva {
  loteId: number;
  clienteId: number;
  fechaVencimiento?: FechaISO | null;
  observacion?: string;
}

/** Reservas de lotes (consigna, secciones 5 y 7). */
export class ReservaServicio {
  constructor(
    private readonly uow: UnidadDeTrabajo,
    private readonly reloj: Reloj,
  ) {}

  listar(filtros: FiltrosReservas = {}): Promise<ReservaVista[]> {
    return this.uow.repos.reservas.listar(filtros);
  }

  async obtener(id: number): Promise<ReservaVista> {
    const reserva = await this.uow.repos.reservas.buscarPorId(id);
    if (!reserva) throw new ErrorNoEncontrado('Reserva no encontrada.');
    return reserva;
  }

  /**
   * Reserva un lote para un cliente.
   * Regla crítica: dos usuarios no pueden reservar el mismo lote a la vez.
   * Todo ocurre en una transacción y el cambio de estado del lote es un UPDATE
   * condicional (solo si sigue DISPONIBLE): si otro usuario lo reservó un
   * instante antes, esta operación se rechaza con LOTE_NO_DISPONIBLE (409).
   */
  async crear(entrada: EntradaReserva, usuario: UsuarioActual): Promise<ReservaVista> {
    const hoy = this.reloj.hoy();
    validarFechaVencimiento(entrada.fechaVencimiento, hoy);

    const reservaId = await this.uow.transaccion(async (repos) => {
      let lote = await repos.lotes.buscarPorId(entrada.loteId);
      if (!lote) throw new ErrorNoEncontrado('Lote no encontrado.');
      if (lote.estado === 'RESERVADO') {
        const activa = await repos.reservas.buscarActivaPorLote(lote.id);
        if (activa && (await expirarReservaSiVencida(repos, activa, hoy, this.reloj.ahora()))) {
          lote = { ...lote, estado: 'DISPONIBLE' };
        }
      }
      const cliente = await repos.clientes.buscarPorId(entrada.clienteId);
      if (!cliente) throw new ErrorNoEncontrado('Cliente no encontrado.');
      const proyecto = await repos.proyectos.buscarPorId(lote.proyectoId);
      if (!proyecto) throw new ErrorNoEncontrado('Proyecto no encontrado.');

      validarLoteReservable(lote, proyecto.estado);

      const reservado = await repos.lotes.cambiarEstadoSi(lote.id, 'DISPONIBLE', 'RESERVADO');
      if (!reservado) {
        throw new ErrorConflicto(
          'LOTE_NO_DISPONIBLE',
          `El lote ${lote.codigo} acaba de ser reservado o vendido por otro usuario.`,
        );
      }

      const reserva = await repos.reservas.crear({
        loteId: lote.id,
        clienteId: cliente.id,
        asesorId: usuario.id,
        fecha: this.reloj.ahora(),
        fechaVencimiento: entrada.fechaVencimiento ?? null,
        observacion: entrada.observacion?.trim() ?? '',
      });
      return reserva.id;
    });

    return this.obtener(reservaId);
  }

  /** Cancela una reserva activa y devuelve el lote a DISPONIBLE (si no venció ni existe venta). */
  async cancelar(id: number, motivo: string, usuario: UsuarioActual): Promise<ReservaVista> {
    const { yaVencida } = await this.uow.transaccion(async (repos) => {
      const reserva = await repos.reservas.buscarPorId(id);
      if (!reserva) throw new ErrorNoEncontrado('Reserva no encontrada.');
      const hoy = this.reloj.hoy();
      const ahora = this.reloj.ahora();
      if (estaVencida(reserva, hoy)) {
        await expirarReservaSiVencida(repos, reserva, hoy, ahora);
        return { yaVencida: true };
      }

      validarReservaCancelable(reserva);
      validarCambioEstado('RESERVADO', 'DISPONIBLE');

      // Primero la reserva y después el lote, el mismo orden que usan la venta y el vencimiento.
      const motivoFinal = motivo.trim() || `Cancelada por ${usuario.nombre}`;
      const cancelada = await repos.reservas.finalizar(id, 'CANCELADA', ahora, motivoFinal);
      if (!cancelada) {
        throw new ErrorConflicto(
          'RESERVA_NO_ACTIVA',
          'La reserva acaba de cambiar de estado: otro usuario la canceló o vendió el lote, o venció.',
        );
      }
      const liberado = await repos.lotes.cambiarEstadoSi(reserva.loteId, 'RESERVADO', 'DISPONIBLE');
      if (!liberado) {
        throw new ErrorConflicto('LOTE_MODIFICADO', 'El lote de la reserva ya no estaba en estado RESERVADO.');
      }
      return { yaVencida: false };
    });
    if (yaVencida) {
      throw new ErrorConflicto('RESERVA_NO_ACTIVA', 'La reserva ya venció y el lote fue liberado.');
    }
    return this.obtener(id);
  }

  /**
   * Marca como VENCIDAS las reservas activas cuya fecha de vencimiento ya pasó
   * y libera sus lotes en transacciones independientes y ordenadas para evitar deadlocks.
   */
  async procesarVencidas(): Promise<number> {
    const hoy = this.reloj.hoy();
    const candidatas = await this.uow.repos.reservas.listarActivasVencidas(hoy);
    let vencidas = 0;
    for (const candidata of candidatas) {
      const expiro = await this.uow.transaccion(async (repos) => {
        const reserva = await repos.reservas.buscarPorId(candidata.id);
        if (!reserva) return false;
        return expirarReservaSiVencida(repos, reserva, hoy, this.reloj.ahora());
      });
      if (expiro) vencidas++;
    }
    return vencidas;
  }
}
