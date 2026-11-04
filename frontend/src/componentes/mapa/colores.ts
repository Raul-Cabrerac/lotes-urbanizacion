import type { EstadoLote } from '../../api/tipos';

/** Color de cada estado: el mismo en el mapa, la leyenda, la lista de lotes y los contadores. */
export const COLOR_ESTADO: Record<EstadoLote, string> = {
  DISPONIBLE: '#2e8b57',
  RESERVADO: '#e0a21b',
  VENDIDO: '#cf4a47',
  BLOQUEADO: '#7b8794',
};

/** Borde del lote seleccionado y trazo del polígono que se está dibujando. */
export const AZUL_SELECCION = '#1d4ed8';

/** Perímetro del proyecto: celeste, visible tanto en el mapa de calles como en el satelital. */
export const COLOR_PERIMETRO = '#0ea5e9';
