import { ErrorConflicto, ErrorNoEncontrado, ErrorSinPermiso } from '../../dominio/errores';
import type { FechaISO } from '../../dominio/fechas';
import { OPERACIONES_LOTE, validarLoteVendible } from '../../dominio/lote';
import { alcanzaCliente, clienteDelAlcance } from '../../dominio/permisos';
import {
  condicionesEfectivas,
  generarPlanDePagos,
  METODO_PAGO_POR_DEFECTO,
  NUMERO_CUOTA_AL_FIRMAR,
  resumirPlan,
} from '../../dominio/planPagos';
import { OPERACIONES_RESERVA } from '../../dominio/reserva';
import type { MetodoPago, ModalidadPago } from '../../dominio/tipos';
import { restringir } from '../../dominio/transiciones';
import { validarVentaAnulable, ventaYaAnulada } from '../../dominio/venta';
import type { FiltrosVentas, Reloj, UnidadDeTrabajo, UsuarioActual, VentaVista } from '../puertos';
import { vencerReservaDelLote } from './expirarReserva';

export interface EntradaVenta {
  loteId: number;
  clienteId: number;
  modalidad: ModalidadPago;
  precioPactado?: number; // por defecto, el precio actual del lote
  cuotaInicial?: number;
  numeroCuotas?: number;
  fechaPrimeraCuota?: FechaISO;
  metodoPago?: MetodoPago; // cómo se cobra la cuota inicial o el pago al contado
}

export type EntradaSimulacion = Omit<EntradaVenta, 'loteId' | 'clienteId' | 'metodoPago'> & { precioPactado: number };

/** Ventas de lotes y su plan de pagos (consigna, secciones 8 y 9). */
export class VentaServicio {
  constructor(
    private readonly uow: UnidadDeTrabajo,
    private readonly reloj: Reloj,
  ) {}

  /** Un cliente solo ve sus propias ventas, aunque pida las de otro. */
  async listar(filtros: FiltrosVentas, usuario: UsuarioActual) {
    const clienteId = clienteDelAlcance(usuario);
    const ventas = await this.uow.repos.ventas.listar(clienteId === undefined ? filtros : { ...filtros, clienteId });
    return ventas.map((venta) => this.conResumen(venta));
  }

  async obtener(id: number, usuario: UsuarioActual) {
    const venta = await this.uow.repos.ventas.buscarPorId(id);
    if (!venta) throw new ErrorNoEncontrado('Venta no encontrada.');
    if (!alcanzaCliente(usuario, venta.clienteId)) {
      throw new ErrorSinPermiso('Solo puede consultar sus propias operaciones.');
    }
    return this.conResumen(venta);
  }

  /** Vista previa del cronograma antes de confirmar la venta (no guarda nada). */
  simularPlan(entrada: EntradaSimulacion) {
    return generarPlanDePagos({ ...entrada, fechaVenta: this.reloj.hoy() });
  }

  /**
   * Registra la venta en UNA transacción:
   *   lote -> VENDIDO, reserva -> CONVERTIDA, venta + cuotas, y el cobro de la
   *   cuota inicial (o del pago al contado).
   * Si cualquier paso falla no se guarda nada (no quedan estados parciales).
   * El precio pactado queda guardado en la venta: si después cambia el precio
   * del lote, la venta no se modifica.
   */
  async registrar(entrada: EntradaVenta, usuario: UsuarioActual) {
    await vencerReservaDelLote(this.uow, this.reloj, entrada.loteId);
    const ventaId = await this.uow.transaccion(async (repos) => {
      const lote = await repos.lotes.buscarPorId(entrada.loteId);
      if (!lote) throw new ErrorNoEncontrado('Lote no encontrado.');
      const cliente = await repos.clientes.buscarPorId(entrada.clienteId);
      if (!cliente) throw new ErrorNoEncontrado('Cliente no encontrado.');
      const proyecto = await repos.proyectos.buscarPorId(lote.proyectoId);
      if (!proyecto) throw new ErrorNoEncontrado('Proyecto no encontrado.');
      const reservaActiva = await repos.reservas.buscarActivaPorLote(lote.id);
      const hoy = this.reloj.hoy();
      const ahora = this.reloj.ahora();

      validarLoteVendible(lote, proyecto.estado, cliente.id, reservaActiva);

      const precioPactado = entrada.precioPactado ?? lote.precio;
      const cuotas = generarPlanDePagos({
        precioPactado,
        modalidad: entrada.modalidad,
        cuotaInicial: entrada.cuotaInicial,
        numeroCuotas: entrada.numeroCuotas,
        fechaVenta: hoy,
        fechaPrimeraCuota: entrada.fechaPrimeraCuota,
      });

      // Orden de bloqueo: reserva -> lote (ver UnidadDeTrabajo en puertos.ts).
      const reservaConvertida = reservaActiva
        ? await repos.reservas.finalizar(reservaActiva.id, OPERACIONES_RESERVA.convertir, ahora)
        : true;
      // Desde el estado leído (DISPONIBLE o RESERVADO): si otro usuario lo cambió, no se vende.
      const vendido =
        reservaConvertida &&
        (await repos.lotes.cambiarEstadoSi(lote.id, restringir(OPERACIONES_LOTE.vender, lote.estado)));
      if (!vendido) {
        if (!(await repos.lotes.buscarPorId(lote.id))) throw new ErrorNoEncontrado('Lote no encontrado.');
        // El error deshace la transacción: si la reserva ya se había convertido, vuelve a ACTIVA.
        throw new ErrorConflicto('LOTE_NO_DISPONIBLE', `El lote ${lote.codigo} acaba de ser modificado por otro usuario.`);
      }

      const venta = await repos.ventas.crear(
        {
          loteId: lote.id,
          clienteId: cliente.id,
          asesorId: usuario.id,
          reservaId: reservaActiva?.id ?? null,
          fecha: ahora,
          precioPactado,
          modalidad: entrada.modalidad,
          ...condicionesEfectivas(entrada),
        },
        cuotas,
      );

      // La cuota inicial (o el pago al contado) se cobra al firmar la venta.
      const cuotaAlFirmar = venta.cuotas.find((cuota) => cuota.numero === NUMERO_CUOTA_AL_FIRMAR);
      if (cuotaAlFirmar) {
        await repos.pagos.crear({
          cuotaId: cuotaAlFirmar.id,
          monto: cuotaAlFirmar.monto,
          metodo: entrada.metodoPago ?? METODO_PAGO_POR_DEFECTO,
          referencia: 'Cobrado al registrar la venta',
          fecha: ahora,
          registradoPorId: usuario.id,
        });
      }
      return venta.id;
    });

    return this.obtener(ventaId, usuario);
  }

  /** Anula una venta vigente (solo administrador): el lote vuelve a DISPONIBLE y los pagos quedan como historial. */
  async anular(id: number, motivo: string, usuario: UsuarioActual) {
    await this.uow.transaccion(async (repos) => {
      const venta = await repos.ventas.buscarPorId(id);
      if (!venta) throw new ErrorNoEncontrado('Venta no encontrada.');
      validarVentaAnulable(venta, motivo);

      const anulada = await repos.ventas.anular(id, { motivo: motivo.trim(), anuladaPorId: usuario.id, fecha: this.reloj.ahora() });
      if (!anulada) throw ventaYaAnulada();
      const liberado = await repos.lotes.cambiarEstadoSi(venta.loteId, OPERACIONES_LOTE.anularVenta);
      if (!liberado) {
        throw new ErrorConflicto('LOTE_MODIFICADO', 'El lote de la venta ya no estaba en estado VENDIDO.');
      }
    });
    return this.obtener(id, usuario);
  }

  /** Agrega el estado de cada cuota, el total pagado y el saldo (calculados, no guardados). */
  private conResumen(venta: VentaVista) {
    const { cuotas, ...resumen } = resumirPlan(venta.precioPactado, venta.cuotas, venta.pagos, this.reloj.hoy());
    return { ...venta, cuotas, resumen };
  }
}
