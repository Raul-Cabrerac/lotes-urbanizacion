/**
 * Tipos del dominio: estados válidos y forma de las entidades.
 * Son objetos planos (sin dependencias de la base de datos ni de Express).
 */
import type { PoligonoGeoJSON } from './geometria';
import type { FechaISO } from './fechas';

export const ROLES = ['ADMIN', 'ASESOR', 'CLIENTE'] as const;
export type Rol = (typeof ROLES)[number];

export const ESTADOS_PROYECTO = ['BORRADOR', 'PUBLICADO'] as const;
export type EstadoProyecto = (typeof ESTADOS_PROYECTO)[number];

export const ESTADOS_LOTE = ['DISPONIBLE', 'RESERVADO', 'VENDIDO', 'BLOQUEADO'] as const;
export type EstadoLote = (typeof ESTADOS_LOTE)[number];

export const ESTADOS_RESERVA = ['ACTIVA', 'CANCELADA', 'VENCIDA', 'CONVERTIDA'] as const;
export type EstadoReserva = (typeof ESTADOS_RESERVA)[number];

export const ESTADOS_VENTA = ['VIGENTE', 'ANULADA'] as const;
export type EstadoVenta = (typeof ESTADOS_VENTA)[number];

export const MODALIDADES_PAGO = ['CONTADO', 'FINANCIADO'] as const;
export type ModalidadPago = (typeof MODALIDADES_PAGO)[number];

export const ESTADOS_CUOTA = ['PENDIENTE', 'PAGADA', 'VENCIDA'] as const;
export type EstadoCuota = (typeof ESTADOS_CUOTA)[number];

export const ESTADOS_PAGO = ['VALIDO', 'ANULADO'] as const;
export type EstadoPago = (typeof ESTADOS_PAGO)[number];

export const METODOS_PAGO = ['EFECTIVO', 'TRANSFERENCIA', 'QR', 'TARJETA'] as const;
export type MetodoPago = (typeof METODOS_PAGO)[number];

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  clienteId: number | null;
  creadoEn: Date;
}

export interface UsuarioConCredenciales extends Usuario {
  passwordHash: string;
}

export interface Proyecto {
  id: number;
  nombre: string;
  descripcion: string;
  ubicacion: string;
  estado: EstadoProyecto;
  limite: PoligonoGeoJSON | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface Lote {
  id: number;
  proyectoId: number;
  codigo: string;
  manzano: string;
  etapa: string;
  superficieM2: number;
  dimensiones: string;
  precio: number;
  estado: EstadoLote;
  geometria: PoligonoGeoJSON;
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface Cliente {
  id: number;
  nombreCompleto: string;
  documento: string;
  telefono: string;
  email: string;
  direccion: string;
  creadoEn: Date;
}

export interface Reserva {
  id: number;
  loteId: number;
  clienteId: number;
  asesorId: number;
  fecha: Date;
  fechaVencimiento: FechaISO | null;
  observacion: string;
  estado: EstadoReserva;
  motivoFinalizacion: string | null;
  finalizadaEn: Date | null;
}

export interface Venta {
  id: number;
  loteId: number;
  clienteId: number;
  asesorId: number;
  reservaId: number | null;
  fecha: Date;
  precioPactado: number;
  modalidad: ModalidadPago;
  cuotaInicial: number;
  numeroCuotas: number;
  estado: EstadoVenta;
  motivoAnulacion: string | null;
  anuladaEn: Date | null;
  anuladaPorId: number | null;
}

export interface Cuota {
  id: number;
  ventaId: number;
  numero: number;
  concepto: string;
  monto: number;
  fechaVencimiento: FechaISO;
}

export interface Pago {
  id: number;
  cuotaId: number;
  monto: number;
  metodo: MetodoPago;
  referencia: string;
  fecha: Date;
  registradoPorId: number;
  estado: EstadoPago;
  motivoAnulacion: string | null;
  anuladoEn: Date | null;
  anuladoPorId: number | null;
}
