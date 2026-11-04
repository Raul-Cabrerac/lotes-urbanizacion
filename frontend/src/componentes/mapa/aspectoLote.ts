/** Cómo se ve cada lote en el mapa: el polígono y su etiqueta con el código. */
import type { EstadoLote, Poligono } from '../../api/tipos';
import { AZUL_SELECCION, COLOR_ESTADO } from './colores';

export interface LoteEnMapa {
  id: number;
  codigo: string;
  estado: EstadoLote;
  geometria: Poligono;
}

/** Relleno del color del estado; el lote seleccionado lleva borde azul grueso y queda encima. */
export function estiloLote(estado: EstadoLote, seleccionado: boolean): google.maps.PolygonOptions {
  return {
    strokeColor: seleccionado ? AZUL_SELECCION : COLOR_ESTADO[estado],
    strokeWeight: seleccionado ? 4 : 2,
    fillColor: COLOR_ESTADO[estado],
    fillOpacity: seleccionado ? 0.75 : 0.5,
    zIndex: seleccionado ? 2 : 1,
  };
}

/**
 * Etiqueta HTML con el código del lote, centrada sobre su polígono. Para los E2E lleva
 * data-testid="poligono-<código>" y data-estado; un clic en ella selecciona el lote.
 */
export function crearEtiqueta(lote: LoteEnMapa, alHacerClic: () => void): HTMLElement {
  const etiqueta = document.createElement('div');
  etiqueta.className = 'etiqueta-lote';
  etiqueta.textContent = lote.codigo;
  etiqueta.title = `Lote ${lote.codigo} · ${lote.estado}`;
  etiqueta.dataset.testid = `poligono-${lote.codigo}`;
  etiqueta.dataset.estado = lote.estado;
  etiqueta.style.setProperty('--color-estado', COLOR_ESTADO[lote.estado]);
  etiqueta.addEventListener('click', alHacerClic);
  return etiqueta;
}
