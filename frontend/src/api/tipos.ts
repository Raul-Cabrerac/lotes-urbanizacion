/** Tipos de los datos que devuelve la API REST (mismos nombres que en el backend). */

export type Rol = 'ADMIN' | 'ASESOR' | 'CLIENTE';
export type EstadoProyecto = 'BORRADOR' | 'PUBLICADO';
export type EstadoLote = 'DISPONIBLE' | 'RESERVADO' | 'VENDIDO' | 'BLOQUEADO';
export type EstadoReserva = 'ACTIVA' | 'CANCELADA' | 'VENCIDA' | 'CONVERTIDA';
export type EstadoVenta = 'VIGENTE' | 'ANULADA';
export type EstadoCuota = 'PENDIENTE' | 'PAGADA' | 'VENCIDA';
export type EstadoPago = 'VALIDO' | 'ANULADO';
export type Modalidad = 'CONTADO' | 'FINANCIADO';
export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'QR' | 'TARJETA';

export const ESTADOS_LOTE: EstadoLote[] = ['DISPONIBLE', 'RESERVADO', 'VENDIDO', 'BLOQUEADO'];
export const METODOS_PAGO: MetodoPago[] = ['EFECTIVO', 'TRANSFERENCIA', 'QR', 'TARJETA'];

export type Permiso =
  | 'proyectos:ver'
  | 'proyectos:gestionar'
  | 'lotes:ver'
  | 'lotes:gestionar'
  | 'clientes:ver'
  | 'clientes:gestionar'
  | 'reservas:ver'
  | 'reservas:gestionar'
  | 'ventas:ver'
  | 'ventas:registrar'
  | 'ventas:anular'
  | 'pagos:registrar'
  | 'pagos:anular'
  | 'usuarios:gestionar'
  | 'reportes:ver'
  | 'portal:ver';

/** Polígono GeoJSON: coordenadas [longitud, latitud]. */
export interface Poligono {
  type: 'Polygon';
  coordinates: [number, number][][];
}

export type ConteoPorEstado = Record<EstadoLote, number>;

export interface Referencia {
  id: number;
  nombre: string;
}

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  clienteId: number | null;
  permisos: Permiso[];
}

export interface Proyecto {
  id: number;
  nombre: string;
  descripcion: string;
  ubicacion: string;
  estado: EstadoProyecto;
  limite: Poligono | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ProyectoListado extends Proyecto {
  totalLotes: number;
  lotesPorEstado: ConteoPorEstado;
}

export interface ResumenManzano {
  manzano: string;
  etapa: string;
  total: number;
  porEstado: ConteoPorEstado;
}

export interface ProyectoDetalle extends Proyecto {
  resumen: {
    total: number;
    porEstado: ConteoPorEstado;
    superficieTotalM2: number;
    valorDisponible: number;
    etapas: string[];
    manzanos: string[];
    porManzano: ResumenManzano[];
  };
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
  geometria: Poligono;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ClienteResumen {
  id: number;
  nombreCompleto: string;
  documento: string;
  telefono: string;
}

export interface LoteDetalle extends Lote {
  proyecto: { id: number; nombre: string; estado: EstadoProyecto };
  reservaActiva: {
    id: number;
    fecha: string;
    fechaVencimiento: string | null;
    observacion: string;
    cliente: ClienteResumen;
    asesor: Referencia;
  } | null;
  ventaVigente: {
    id: number;
    fecha: string;
    precioPactado: number;
    modalidad: Modalidad;
    cliente: ClienteResumen;
    asesor: Referencia;
    totalPagado: number;
    saldoPendiente: number;
  } | null;
}

export interface LoteResumen {
  id: number;
  codigo: string;
  manzano: string;
  etapa: string;
  superficieM2: number;
  precio: number;
  estado: EstadoLote;
  geometria: Poligono;
  proyecto: Referencia;
}

export interface Cliente {
  id: number;
  nombreCompleto: string;
  documento: string;
  telefono: string;
  email: string;
  direccion: string;
  creadoEn: string;
}
