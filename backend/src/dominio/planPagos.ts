/**
 * Plan de pagos, cuotas, pagos y saldo (consigna, sección 9).
 *
 * Regla central: el saldo NO se guarda, se calcula siempre como
 *   saldo pendiente = precio pactado - suma de pagos VÁLIDOS
 * y nunca puede ser negativo.
 */
import { comparar, dividirEnPartes, esMontoValido, restar, sumar } from './dinero';
import { ErrorConflicto, ErrorReglaNegocio } from './errores';
import { sumarMeses, type FechaISO } from './fechas';
import type { EstadoCuota, EstadoPago, EstadoVenta, ModalidadPago } from './tipos';
import { validarMotivo } from './venta';

export const MAX_CUOTAS = 240;

export interface CuotaNueva {
  numero: number; // 0 = cuota inicial o pago al contado
  concepto: string;
  monto: number;
  fechaVencimiento: FechaISO;
}

export interface CondicionesVenta {
  precioPactado: number;
  modalidad: ModalidadPago;
  cuotaInicial?: number; // solo FINANCIADO
  numeroCuotas?: number; // solo FINANCIADO
  fechaVenta: FechaISO;
  fechaPrimeraCuota?: FechaISO; // por defecto: un mes después de la venta
}

/**
 * Genera el cronograma de pagos de una venta.
 * - CONTADO: una sola cuota (número 0) por el total, que vence el día de la venta.
 * - FINANCIADO: cuota inicial opcional (número 0, vence el día de la venta) y
 *   N cuotas mensuales iguales; los centavos sobrantes van en la última cuota.
 */
export function generarPlanDePagos(c: CondicionesVenta): CuotaNueva[] {
  if (!esMontoValido(c.precioPactado)) {
    throw new ErrorReglaNegocio(
      'PRECIO_PACTADO_INVALIDO',
      'El precio pactado debe ser mayor a 0, tener como máximo 2 decimales y no superar Bs 999.999.999,99.',
    );
  }
  if (c.modalidad === 'CONTADO') {
    return [{ numero: 0, concepto: 'Pago al contado', monto: c.precioPactado, fechaVencimiento: c.fechaVenta }];
  }

  const inicial = c.cuotaInicial ?? 0;
  const numeroCuotas = c.numeroCuotas ?? 0;
  if (inicial !== 0 && !esMontoValido(inicial)) {
    throw new ErrorReglaNegocio('CUOTA_INICIAL_INVALIDA', 'La cuota inicial debe ser 0 o un monto positivo con máximo 2 decimales.');
  }
  if (comparar(inicial, c.precioPactado) >= 0) {
    throw new ErrorReglaNegocio('CUOTA_INICIAL_INVALIDA', 'La cuota inicial debe ser menor al precio pactado.');
  }
  if (!Number.isInteger(numeroCuotas) || numeroCuotas < 1 || numeroCuotas > MAX_CUOTAS) {
    throw new ErrorReglaNegocio(
      'NUMERO_CUOTAS_INVALIDO',
      `El número de cuotas debe ser un entero entre 1 y ${MAX_CUOTAS}.`,
    );
  }
  if (c.fechaPrimeraCuota && c.fechaPrimeraCuota < c.fechaVenta) {
    throw new ErrorReglaNegocio(
      'FECHA_PRIMERA_CUOTA_INVALIDA',
      'La primera cuota no puede vencer antes de la fecha de venta.',
    );
  }

  const montos = dividirEnPartes(restar(c.precioPactado, inicial), numeroCuotas);
  if (montos.some((monto) => comparar(monto, 0) <= 0)) {
    throw new ErrorReglaNegocio('NUMERO_CUOTAS_INVALIDO', 'Hay demasiadas cuotas para el monto a financiar.');
  }

  const cuotas: CuotaNueva[] = [];
  if (inicial > 0) {
    cuotas.push({ numero: 0, concepto: 'Cuota inicial', monto: inicial, fechaVencimiento: c.fechaVenta });
  }
  // Cada fecha se calcula desde la fecha base (no encadenada) para no perder días:
  // venta el 31/01 => cuotas el 28/02, 31/03, 30/04...
  const vencimiento = (i: number) =>
    c.fechaPrimeraCuota ? sumarMeses(c.fechaPrimeraCuota, i) : sumarMeses(c.fechaVenta, i + 1);
  montos.forEach((monto, i) => {
    cuotas.push({ numero: i + 1, concepto: `Cuota ${i + 1}`, monto, fechaVencimiento: vencimiento(i) });
  });
  return cuotas;
}

/** Una cuota está PAGADA si se cubrió su monto; si no, VENCIDA si su fecha ya pasó; si no, PENDIENTE. */
export function calcularEstadoCuota(
  monto: number,
  montoPagado: number,
  fechaVencimiento: FechaISO,
  hoy: FechaISO,
): EstadoCuota {
  if (comparar(montoPagado, monto) >= 0) return 'PAGADA';
  return fechaVencimiento < hoy ? 'VENCIDA' : 'PENDIENTE';
}

/** Datos mínimos de una cuota y de un pago para calcular el resumen. */
export interface CuotaBase {
  id: number;
  numero: number;
  concepto: string;
  monto: number;
  fechaVencimiento: FechaISO;
}

export interface PagoBase {
  cuotaId: number;
  monto: number;
  estado: EstadoPago;
}

export type DetalleCuota<C extends CuotaBase = CuotaBase> = C & {
  montoPagado: number;
  montoPendiente: number;
  estado: EstadoCuota;
};

export interface ResumenPlan<C extends CuotaBase = CuotaBase> {
  cuotas: DetalleCuota<C>[];
  totalPagado: number;
  saldoPendiente: number;
  cuotasPagadas: number;
  cuotasVencidas: number;
  montoVencido: number;
  proximaCuota: DetalleCuota<C> | null;
  saldada: boolean;
}

/**
 * Calcula el estado de cada cuota, el total pagado y el saldo pendiente.
 * Los pagos ANULADOS no cuentan.
 */
export function resumirPlan<C extends CuotaBase>(
  precioPactado: number,
  cuotas: C[],
  pagos: PagoBase[],
  hoy: FechaISO,
): ResumenPlan<C> {
  const pagosValidos = pagos.filter((pago) => pago.estado === 'VALIDO');

  const detalle: DetalleCuota<C>[] = [...cuotas]
    .sort((a, b) => a.numero - b.numero)
    .map((cuota) => {
      const montoPagado = sumar(...pagosValidos.filter((p) => p.cuotaId === cuota.id).map((p) => p.monto));
      return {
        ...cuota,
        montoPagado,
        montoPendiente: Math.max(0, restar(cuota.monto, montoPagado)),
        estado: calcularEstadoCuota(cuota.monto, montoPagado, cuota.fechaVencimiento, hoy),
      };
    });

  const totalPagado = sumar(...pagosValidos.map((p) => p.monto));
  const saldoPendiente = restar(precioPactado, totalPagado);
  if (saldoPendiente < 0) {
    // No debería ocurrir nunca: validarPago lo impide. Si pasa, hay datos corruptos.
    throw new Error(`Inconsistencia: lo pagado (${totalPagado}) supera el precio pactado (${precioPactado}).`);
  }

  const vencidas = detalle.filter((c) => c.estado === 'VENCIDA');
  return {
    cuotas: detalle,
    totalPagado,
    saldoPendiente,
    cuotasPagadas: detalle.filter((c) => c.estado === 'PAGADA').length,
    cuotasVencidas: vencidas.length,
    montoVencido: sumar(...vencidas.map((c) => c.montoPendiente)),
    proximaCuota: detalle.find((c) => c.estado !== 'PAGADA') ?? null,
    saldada: saldoPendiente === 0,
  };
}

/**
 * Valida un pago antes de registrarlo:
 * monto válido, venta vigente, cuota no pagada y sin superar el saldo
 * (así el saldo nunca queda negativo).
 */
export function validarPago(
  monto: unknown,
  estadoVenta: EstadoVenta,
  cuota: { concepto: string; estado: EstadoCuota; montoPendiente: number },
  saldoPendiente: number,
): asserts monto is number {
  if (!esMontoValido(monto)) {
    throw new ErrorReglaNegocio('MONTO_INVALIDO', 'El monto del pago debe ser mayor a 0 (mínimo Bs 0,01) y tener como máximo 2 decimales.');
  }
  if (estadoVenta !== 'VIGENTE') {
    throw new ErrorConflicto('VENTA_NO_VIGENTE', 'La venta está anulada; no se pueden registrar pagos.');
  }
  if (cuota.estado === 'PAGADA') {
    throw new ErrorConflicto('CUOTA_YA_PAGADA', `La ${cuota.concepto.toLowerCase()} ya está pagada.`);
  }
  if (comparar(monto, saldoPendiente) > 0) {
    throw new ErrorReglaNegocio(
      'MONTO_EXCEDE_SALDO',
      `El pago (Bs ${monto}) supera el saldo pendiente de la venta (Bs ${saldoPendiente}).`,
    );
  }
  if (comparar(monto, cuota.montoPendiente) > 0) {
    throw new ErrorReglaNegocio(
      'MONTO_EXCEDE_CUOTA',
      `El pago (Bs ${monto}) supera lo pendiente de la ${cuota.concepto.toLowerCase()} (Bs ${cuota.montoPendiente}).`,
    );
  }
}

/**
 * Un pago no se borra ni vuelve atrás por una operación ordinaria: solo el
 * administrador puede ANULARLO indicando el motivo (queda registrado).
 */
export function validarPagoAnulable(pago: { estado: EstadoPago }, motivo: string): void {
  if (pago.estado !== 'VALIDO') {
    throw new ErrorConflicto('PAGO_YA_ANULADO', 'El pago ya fue anulado.');
  }
  validarMotivo(motivo);
}
