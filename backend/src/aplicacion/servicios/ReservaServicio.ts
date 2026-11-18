import { ErrorConflicto, ErrorNoEncontrado } from '../../dominio/errores';
import type { FechaISO } from '../../dominio/fechas';
import { validarCambioEstado, validarLoteReservable } from '../../dominio/lote';
import { estaVencida, validarFechaVencimiento, validarReservaCancelable } from '../../dominio/reserva';
import type { FiltrosReservas, Reloj, ReservaVista, UnidadDeTrabajo, UsuarioActual } from '../puertos';

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
    validarFechaVencimiento(entrada.fechaVencimiento, this.reloj.hoy());

    const reservaId = await this.uow.transaccion(async (repos) => {
      const lote = await repos.lotes.buscarPorId(entrada.loteId);
      if (!lote) throw new ErrorNoEncontrado('Lote no encontrado.');
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

  /** Cancela una reserva activa y devuelve el lote a DISPONIBLE (si no existe una venta). */
  async cancelar(id: number, motivo: string, usuario: UsuarioActual): Promise<ReservaVista> {
    await this.uow.transaccion(async (repos) => {
      const reserva = await repos.reservas.buscarPorId(id);
      if (!reserva) throw new ErrorNoEncontrado('Reserva no encontrada.');
      validarReservaCancelable(reserva);
      validarCambioEstado('RESERVADO', 'DISPONIBLE');

      // Primero la reserva y después el lote, el mismo orden que usan la venta y el vencimiento.
      const motivoFinal = motivo.trim() || `Cancelada por ${usuario.nombre}`;
      const cancelada = await repos.reservas.finalizar(id, 'CANCELADA', this.reloj.ahora(), motivoFinal);
      if (!cancelada) {
        throw new ErrorConflicto(
          'RESERVA_NO_ACTIVA',
          'La reserva acaba de cambiar de estado: otro usuario la canceló o vendió el lote, o venció.',
        );
      }
      await repos.lotes.cambiarEstadoSi(reserva.loteId, 'RESERVADO', 'DISPONIBLE');
    });
    return this.obtener(id);
  }

  /**
   * Marca como VENCIDAS las reservas activas cuya fecha de vencimiento ya pasó
   * y libera sus lotes. Se ejecuta antes de atender cada petición a la API
   * (ver app.ts). Devuelve cuántas venció.
   */
  async procesarVencidas(): Promise<number> {
    const hoy = this.reloj.hoy();
    const candidatas = await this.uow.repos.reservas.listarActivasVencidas(hoy);
    if (candidatas.length === 0) return 0;

    return this.uow.transaccion(async (repos) => {
      let vencidas = 0;
      for (const candidata of candidatas) {
        const reserva = await repos.reservas.buscarPorId(candidata.id);
        if (!reserva || !estaVencida(reserva, hoy)) continue; // otra petición ya la procesó
        const vencida = await repos.reservas.finalizar(reserva.id, 'VENCIDA', this.reloj.ahora(), 'Venció el plazo de la reserva');
        if (!vencida) continue; // otra operación la cerró en este mismo instante
        await repos.lotes.cambiarEstadoSi(reserva.loteId, 'RESERVADO', 'DISPONIBLE');
        vencidas++;
      }
      return vencidas;
    });
  }
}
