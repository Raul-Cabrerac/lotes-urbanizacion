/** Cómo se ve cada lote en el mapa: el polígono y su etiqueta con el código. */
import type { Poligono } from '../../api/tipos';
import type { EstadoLote } from '../../dominio';
import { ASPECTO_ESTADO, COLOR_SELECCION, estiloEstado } from '../../utilidades/estados';

export interface LoteEnMapa {
  id: number;
  codigo: string;
  estado: EstadoLote;
  geometria: Poligono;
}

/** Relleno del color del estado; el lote seleccionado lleva borde azul grueso y queda encima. */
export function estiloLote(estado: EstadoLote, seleccionado: boolean): google.maps.PolygonOptions {
  const color = ASPECTO_ESTADO[estado].color;
  return {
    strokeColor: seleccionado ? COLOR_SELECCION : color,
    strokeWeight: seleccionado ? 4 : 2,
    fillColor: color,
    fillOpacity: seleccionado ? 0.75 : 0.5,
    zIndex: seleccionado ? 2 : 1,
  };
}

/**
 * Etiqueta HTML con el código del lote, centrada sobre su polígono. Para los E2E lleva
 * data-testid="poligono-<código>" y data-estado; un clic en ella selecciona el lote.
 */
export function crearEtiqueta(lote: LoteEnMapa, alHacerClic: () => void): HTMLElement {
  const { etiqueta: estado } = ASPECTO_ESTADO[lote.estado];
  const etiqueta = document.createElement('div');
  etiqueta.className = 'etiqueta-lote';
  etiqueta.textContent = lote.codigo;
  etiqueta.title = `Lote ${lote.codigo} · ${estado}`;
  etiqueta.dataset.testid = `poligono-${lote.codigo}`;
  etiqueta.dataset.estado = lote.estado;
  for (const [propiedad, valor] of Object.entries(estiloEstado(lote.estado))) {
    etiqueta.style.setProperty(propiedad, String(valor));
  }
  etiqueta.addEventListener('click', alHacerClic);
  return etiqueta;
}
