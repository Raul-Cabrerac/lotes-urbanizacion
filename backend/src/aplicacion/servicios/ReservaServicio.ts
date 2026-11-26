import { ErrorAplicacion, ErrorConflicto, ErrorNoEncontrado } from '../../dominio/errores';
import type { FechaISO } from '../../dominio/fechas';
import { OPERACIONES_LOTE, validarLoteReservable } from '../../dominio/lote';
import type { Pagina, Paginacion } from '../../dominio/paginacion';
import { METODO_PAGO_POR_DEFECTO } from '../../dominio/planPagos';
import {
  estaVencida,
  OPERACIONES_RESERVA,
  validarAnticipo,
  validarFechaVencimiento,
  validarReservaCancelable,
} from '../../dominio/reserva';
import type { MetodoPago } from '../../dominio/tipos';
import type { FiltrosReservas, Reloj, ReservaVista, UnidadDeTrabajo, UsuarioActual } from '../puertos';
import { cerrarReservaYLiberarLote, vencerReserva, vencerReservaDelLote } from './expirarReserva';

export interface EntradaReserva {
  loteId: number;
  clienteId: number;
  fechaVencimiento?: FechaISO | null;
  observacion?: string;
  /** Lo que el cliente paga para apartar el lote: obligatorio, al menos el 10 % de su precio. */
  anticipo: number;
  metodoAnticipo?: MetodoPago;
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

  listarPagina(filtros: FiltrosReservas, paginacion: Paginacion): Promise<Pagina<ReservaVista>> {
    return this.uow.repos.reservas.listarPagina(filtros, paginacion);
  }

  async obtener(id: number): Promise<ReservaVista> {
    const reserva = await this.uow.repos.reservas.buscarPorId(id);
    if (!reserva) throw new ErrorNoEncontrado('Reserva no encontrada.');
    return reserva;
  }

  /**
   * Reserva un lote para un cliente, que paga un anticipo para apartarlo.
   * Regla crítica: dos usuarios no pueden reservar el mismo lote a la vez.
   * Todo ocurre en una transacción y el cambio de estado del lote es un UPDATE
   * condicional (solo si sigue DISPONIBLE): si otro usuario lo reservó un
   * instante antes, esta operación se rechaza con LOTE_NO_DISPONIBLE (409).
   */
  async crear(entrada: EntradaReserva, usuario: UsuarioActual): Promise<ReservaVista> {
    validarFechaVencimiento(entrada.fechaVencimiento, this.reloj.hoy());
    await vencerReservaDelLote(this.uow, this.reloj, entrada.loteId);

    const reservaId = await this.uow.transaccion(async (repos) => {
      // Bloquea el lote para serializar contra un cambio de precio a Bs 0 o su eliminación.
      await repos.lotes.bloquearPorId(entrada.loteId);
      const lote = await repos.lotes.buscarPorId(entrada.loteId);
      if (!lote) throw new ErrorNoEncontrado('Lote no encontrado.');
      const cliente = await repos.clientes.buscarPorId(entrada.clienteId);
      if (!cliente) throw new ErrorNoEncontrado('Cliente no encontrado.');
      const proyecto = await repos.proyectos.buscarPorId(lote.proyectoId);
      if (!proyecto) throw new ErrorNoEncontrado('Proyecto no encontrado.');

      validarLoteReservable(lote, proyecto.estado);
      validarAnticipo(entrada.anticipo, lote.precio);

      const reservado = await repos.lotes.cambiarEstadoSi(lote.id, OPERACIONES_LOTE.reservar);
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
        anticipo: entrada.anticipo,
        metodoAnticipo: entrada.metodoAnticipo ?? METODO_PAGO_POR_DEFECTO,
      });
      return reserva.id;
    });

    return this.obtener(reservaId);
  }

  /** Cancela una reserva activa y devuelve el lote a DISPONIBLE. Una reserva que ya venció no se cancela. */
  async cancelar(id: number, motivo: string, usuario: UsuarioActual): Promise<ReservaVista> {
    await vencerReserva(this.uow, this.reloj, id);
    await this.uow.transaccion(async (repos) => {
      const reserva = await repos.reservas.buscarPorId(id);
      if (!reserva) throw new ErrorNoEncontrado('Reserva no encontrada.');
      validarReservaCancelable(reserva);

      const motivoFinal = motivo.trim() || `Cancelada por ${usuario.nombre}`;
      const cancelada = await cerrarReservaYLiberarLote(
        repos,
        reserva,
        OPERACIONES_RESERVA.cancelar,
        this.reloj.ahora(),
        motivoFinal,
      );
      if (!cancelada) {
        throw new ErrorConflicto(
          'RESERVA_NO_ACTIVA',
          'La reserva acaba de cambiar de estado: otro usuario la canceló o vendió el lote, o venció.',
        );
      }
    });
    return this.obtener(id);
  }

  /** Marca como VENCIDAS las reservas activas cuyo plazo ya pasó, cada una en su propia transacción. */
  async procesarVencidas(): Promise<number> {
    const hoy = this.reloj.hoy();
    const candidatas = (await this.uow.repos.reservas.listarCandidatasAVencer()).filter((reserva) =>
      estaVencida(reserva, hoy),
    );
    let vencidas = 0;
    for (const candidata of candidatas) {
      try {
        if (await vencerReserva(this.uow, this.reloj, candidata.id)) vencidas++;
      } catch (error) {
        // Corre antes de cada petición: un lote inconsistente (otro usuario o un cambio a mano en la
        // base lo sacó de RESERVADO) no debe frenar toda la API. Esa reserva queda ACTIVA, se avisa
        // en el log y las demás se procesan; operar sobre ese lote sí responde 409.
        if (!(error instanceof ErrorAplicacion && error.codigo === 'LOTE_MODIFICADO')) throw error;
        console.warn(`[reservas] No se venció la reserva ${candidata.id}: ${error.message}`);
      }
    }
    return vencidas;
  }
}
