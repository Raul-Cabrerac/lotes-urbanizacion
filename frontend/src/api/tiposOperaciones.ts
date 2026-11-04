/** Tipos de las operaciones comerciales tal como los devuelve la API: reservas, ventas, plan de pagos, reportes y portal. */
import type {
  Cliente,
  ClienteResumen,
  ConteoPorEstado,
  EstadoCuota,
  EstadoPago,
  EstadoProyecto,
  EstadoReserva,
  EstadoVenta,
  LoteResumen,
  MetodoPago,
  Modalidad,
  Referencia,
  Rol,
} from './tipos';

export interface Reserva {
  id: number;
  loteId: number;
  clienteId: number;
  asesorId: number;
  fecha: string;
  fechaVencimiento: string | null;
  observacion: string;
  estado: EstadoReserva;
  motivoFinalizacion: string | null;
  finalizadaEn: string | null;
  lote: LoteResumen;
  cliente: ClienteResumen;
  asesor: Referencia;
}

export interface Cuota {
  id: number;
  ventaId: number;
  numero: number;
  concepto: string;
  monto: number;
  fechaVencimiento: string;
  montoPagado: number;
  montoPendiente: number;
  estado: EstadoCuota;
}

export interface Pago {
  id: number;
  cuotaId: number;
  monto: number;
  metodo: MetodoPago;
  referencia: string;
  fecha: string;
  estado: EstadoPago;
  motivoAnulacion: string | null;
  anuladoEn: string | null;
  cuotaNumero: number;
  cuotaConcepto: string;
  registradoPor: Referencia;
  anuladoPor: Referencia | null;
}

export interface ResumenPlan {
  totalPagado: number;
  saldoPendiente: number;
  cuotasPagadas: number;
  cuotasVencidas: number;
  montoVencido: number;
  proximaCuota: Cuota | null;
  saldada: boolean;
}

export interface Venta {
  id: number;
  loteId: number;
  clienteId: number;
  reservaId: number | null;
  fecha: string;
  precioPactado: number;
  modalidad: Modalidad;
  cuotaInicial: number;
  numeroCuotas: number;
  estado: EstadoVenta;
  motivoAnulacion: string | null;
  anuladaEn: string | null;
  lote: LoteResumen;
  cliente: ClienteResumen;
  asesor: Referencia;
  anuladaPor: Referencia | null;
  cuotas: Cuota[];
  pagos: Pago[];
  resumen: ResumenPlan;
}

export interface CuotaSimulada {
  numero: number;
  concepto: string;
  monto: number;
  fechaVencimiento: string;
}

export interface ClienteDetalle extends Cliente {
  reservas: Reserva[];
  ventas: Venta[];
}

export interface UsuarioListado {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  clienteId: number | null;
  creadoEn: string;
  cliente: Referencia | null;
}

export interface FilaReporte {
  proyecto: { id: number; nombre: string; estado: EstadoProyecto };
  lotes: { total: number; porEstado: ConteoPorEstado };
  reservasActivas: number;
  ventasVigentes: number;
  montoVendido: number;
  totalCobrado: number;
  saldoPorCobrar: number;
  cuotasVencidas: number;
  montoVencido: number;
}

export interface Reporte {
  generadoEn: string;
  proyectos: FilaReporte[];
  totales: { montoVendido: number; totalCobrado: number; saldoPorCobrar: number; montoVencido: number };
}

export interface PortalCliente {
  cliente: Cliente;
  ventas: Venta[];
  reservas: Reserva[];
}

export interface ResultadoImportacion {
  lotesCreados: number;
  limiteImportado: boolean;
  elementosOmitidos: number;
}
