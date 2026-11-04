/**
 * Forma de las filas tal como las devuelve PostgreSQL (columnas en snake_case).
 * Los estados llegan como texto: `conversiones.ts` los pasa a los tipos del dominio.
 */
import type { PoligonoGeoJSON } from '../../../dominio/geometria';

export interface FilaProyecto {
  id: number;
  nombre: string;
  descripcion: string;
  ubicacion: string;
  estado: string;
  limite: PoligonoGeoJSON | null;
  creado_en: Date;
  actualizado_en: Date;
}

export interface FilaLote {
  id: number;
  proyecto_id: number;
  codigo: string;
  manzano: string;
  etapa: string;
  superficie_m2: number;
  dimensiones: string;
  precio: number;
  estado: string;
  geometria: PoligonoGeoJSON;
  creado_en: Date;
  actualizado_en: Date;
}

export interface FilaCliente {
  id: number;
  nombre_completo: string;
  documento: string;
  telefono: string;
  email: string;
  direccion: string;
  creado_en: Date;
}

export interface FilaUsuario {
  id: number;
  nombre: string;
  email: string;
  password_hash: string;
  rol: string;
  activo: boolean;
  cliente_id: number | null;
  creado_en: Date;
}

export interface FilaReserva {
  id: number;
  lote_id: number;
  cliente_id: number;
  asesor_id: number;
  fecha: Date;
  fecha_vencimiento: string | null;
  observacion: string;
  estado: string;
  motivo_finalizacion: string | null;
  finalizada_en: Date | null;
}

export interface FilaVenta {
  id: number;
  lote_id: number;
  cliente_id: number;
  asesor_id: number;
  reserva_id: number | null;
  fecha: Date;
  precio_pactado: number;
  modalidad: string;
  cuota_inicial: number;
  numero_cuotas: number;
  estado: string;
  motivo_anulacion: string | null;
  anulada_en: Date | null;
  anulada_por_id: number | null;
}

export interface FilaCuota {
  id: number;
  venta_id: number;
  numero: number;
  concepto: string;
  monto: number;
  fecha_vencimiento: string;
}

export interface FilaPago {
  id: number;
  cuota_id: number;
  monto: number;
  metodo: string;
  referencia: string;
  fecha: Date;
  registrado_por_id: number;
  estado: string;
  motivo_anulacion: string | null;
  anulado_en: Date | null;
  anulado_por_id: number | null;
}

/**
 * Columnas del lote y de su proyecto que se agregan a una reserva o venta. Llevan prefijo para no
 * chocar con las columnas de la tabla principal (por ejemplo, `estado`).
 */
export const COLUMNAS_LOTE = `
  l.codigo AS l_codigo, l.manzano AS l_manzano, l.etapa AS l_etapa, l.superficie_m2 AS l_superficie_m2,
  l.precio AS l_precio, l.estado AS l_estado, l.geometria AS l_geometria,
  p.id AS p_id, p.nombre AS p_nombre`;

export interface ColumnasLote {
  lote_id: number;
  l_codigo: string;
  l_manzano: string;
  l_etapa: string;
  l_superficie_m2: number;
  l_precio: number;
  l_estado: string;
  l_geometria: PoligonoGeoJSON;
  p_id: number;
  p_nombre: string;
}

export interface ColumnasCliente {
  c_nombre_completo: string;
  c_documento: string;
  c_telefono: string;
}

export type FilaReservaVista = FilaReserva & ColumnasLote & ColumnasCliente & { a_nombre: string };

export type FilaVentaVista = FilaVenta &
  ColumnasLote &
  ColumnasCliente & { a_nombre: string; an_nombre: string | null };

export type FilaPagoVista = FilaPago & {
  venta_id: number;
  cuota_numero: number;
  cuota_concepto: string;
  registrado_por_nombre: string;
  anulado_por_nombre: string | null;
};
