/** Tipos de los datos que devuelve la API REST (mismos nombres que en el backend). */

import type {
  ConteoPorEstado,
  EstadoLote,
  EstadoProyecto,
  MetodoPago,
  ModalidadPago,
  Permiso,
  Rol,
} from '../dominio';

/** Polígono GeoJSON: coordenadas [longitud, latitud]. */
export interface Poligono {
  type: 'Polygon';
  coordinates: [number, number][][];
}

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

interface ResumenManzano {
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
    anticipo: number;
    metodoAnticipo: MetodoPago;
    cliente: ClienteResumen;
    asesor: Referencia;
  } | null;
  ventaVigente: {
    id: number;
    fecha: string;
    precioPactado: number;
    modalidad: ModalidadPago;
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
