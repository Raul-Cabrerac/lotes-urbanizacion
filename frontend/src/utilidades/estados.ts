/**
 * Cómo se presenta cada valor de los enums del dominio: el color y la etiqueta de cada estado
 * (lote, proyecto, reserva, venta, cuota y pago), el texto de cada modalidad y el nombre de cada
 * rol. Es el único lugar con esos datos: la insignia, el mapa, la leyenda, los contadores, las
 * listas y las tablas los leen de aquí.
 */
import type { CSSProperties } from 'react';
import type { EstadoCuota, EstadoLote, EstadoPago, EstadoProyecto, EstadoReserva, EstadoVenta, ModalidadPago, Rol } from '../dominio';

export type Estado = EstadoLote | EstadoProyecto | EstadoReserva | EstadoVenta | EstadoCuota | EstadoPago;

/** Tono de la insignia: la clase `insignia-<tono>` de estilos.css pone el texto y el fondo. */
type Tono = 'verde' | 'ambar' | 'rojo' | 'gris' | 'azul';

/**
 * Color fuerte de cada tono, en hexadecimal porque Google Maps no lee variables CSS. La interfaz
 * lo recibe por la variable `--color-estado` (punto de la insignia, leyenda, contadores...).
 */
const COLOR_TONO: Record<Tono, string> = {
  verde: '#2f8a55',
  ambar: '#e0a21b',
  rojo: '#cf4a47',
  gris: '#80867f',
  azul: '#1d4ed8',
};

interface AspectoEstado {
  tono: Tono;
  /** Color para Google Maps y para `--color-estado`. */
  color: string;
  /** 'Disponible' */
  etiqueta: string;
  /** 'Disponibles' */
  plural: string;
}

function aspecto(tono: Tono, etiqueta: string, plural: string): AspectoEstado {
  return { tono, color: COLOR_TONO[tono], etiqueta, plural };
}

export const ASPECTO_ESTADO: Record<Estado, AspectoEstado> = {
  // Lote
  DISPONIBLE: aspecto('verde', 'Disponible', 'Disponibles'),
  RESERVADO: aspecto('ambar', 'Reservado', 'Reservados'),
  VENDIDO: aspecto('rojo', 'Vendido', 'Vendidos'),
  BLOQUEADO: aspecto('gris', 'Bloqueado', 'Bloqueados'),
  // Proyecto
  BORRADOR: aspecto('gris', 'Borrador', 'Borradores'),
  PUBLICADO: aspecto('verde', 'Publicado', 'Publicados'),
  // Reserva (VENCIDA también es un estado de la cuota)
  ACTIVA: aspecto('ambar', 'Activa', 'Activas'),
  CANCELADA: aspecto('gris', 'Cancelada', 'Canceladas'),
  VENCIDA: aspecto('rojo', 'Vencida', 'Vencidas'),
  CONVERTIDA: aspecto('azul', 'Convertida', 'Convertidas en venta'),
  // Venta
  VIGENTE: aspecto('verde', 'Vigente', 'Vigentes'),
  ANULADA: aspecto('gris', 'Anulada', 'Anuladas'),
  // Cuota
  PENDIENTE: aspecto('ambar', 'Pendiente', 'Pendientes'),
  PAGADA: aspecto('verde', 'Pagada', 'Pagadas'),
  // Pago
  VALIDO: aspecto('verde', 'Válido', 'Válidos'),
  ANULADO: aspecto('gris', 'Anulado', 'Anulados'),
};

/** El color del estado en la variable `--color-estado`, para el `style` de un elemento. */
export function estiloEstado(estado: Estado): CSSProperties {
  return { '--color-estado': ASPECTO_ESTADO[estado].color } as CSSProperties;
}

/** Borde del lote seleccionado y trazo del polígono que se dibuja (el mismo azul que --seleccion). */
export const COLOR_SELECCION = COLOR_TONO.azul;

export const ETIQUETA_MODALIDAD: Record<ModalidadPago, string> = {
  CONTADO: 'Al contado',
  FINANCIADO: 'Crédito financiado',
};

export const NOMBRE_ROL: Record<Rol, string> = {
  ADMIN: 'Administrador',
  ASESOR: 'Asesor comercial',
  CLIENTE: 'Cliente',
};
