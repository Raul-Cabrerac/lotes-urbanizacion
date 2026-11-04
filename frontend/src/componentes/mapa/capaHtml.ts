/**
 * Capa de elementos HTML ubicados en coordenadas del mapa: las etiquetas con el código de cada
 * lote y los vértices mientras se dibuja.
 *
 * Google Maps dibuja los polígonos dentro de un canvas, sin un elemento HTML por polígono. Por eso
 * cada lote tiene además una etiqueta HTML propia: lleva data-testid="poligono-<código>" y
 * data-estado, y al hacer clic selecciona el lote. Así las pruebas E2E pueden encontrarlo.
 */
import type { Punto } from './geometriaMapa';

export interface ElementoEnMapa {
  posicion: Punto;
  elemento: HTMLElement;
  /** Si se indica, el elemento se muestra compacto (un punto) cuando no cabe en estos límites. */
  limites?: google.maps.LatLngBounds;
}

export interface CapaHtml {
  mostrar(elementos: ElementoEnMapa[]): void;
  /** false: los clics atraviesan la capa y llegan al mapa (por ejemplo, al dibujar). */
  interactiva(valor: boolean): void;
  proyeccion(): google.maps.MapCanvasProjection | null;
  quitar(): void;
}

export function crearCapaHtml(maps: google.maps.MapsLibrary, mapa: google.maps.Map): CapaHtml {
  // La clase se declara aquí porque google.maps.OverlayView solo existe después de cargar la API.
  class Capa extends maps.OverlayView {
    readonly contenedor = document.createElement('div');
    private elementos: ElementoEnMapa[] = [];
    private readonly medidas = new WeakMap<HTMLElement, { ancho: number; alto: number }>();

    onAdd() {
      this.contenedor.classList.add('capa-html'); // add y no className: conserva "inactiva"
      this.getPanes()?.overlayMouseTarget.appendChild(this.contenedor);
    }

    onRemove() {
      this.contenedor.remove();
    }

    /** Google Maps llama a draw() cada vez que el mapa se mueve o cambia de zoom. */
    draw() {
      const proyeccion = this.getProjection();
      if (!proyeccion) return;
      for (const { posicion, elemento, limites } of this.elementos) {
        const punto = proyeccion.fromLatLngToDivPixel(posicion);
        if (!punto) continue;
        elemento.style.left = `${punto.x}px`;
        elemento.style.top = `${punto.y}px`;
        if (limites) elemento.classList.toggle('compacta', !this.cabe(elemento, limites, proyeccion));
      }
    }

    mostrar(elementos: ElementoEnMapa[]) {
      this.elementos = elementos;
      this.contenedor.replaceChildren(...elementos.map((e) => e.elemento));
      // Un clic en una etiqueta no debe llegar al mapa (ni moverlo).
      for (const { elemento } of elementos) maps.OverlayView.preventMapHitsAndGesturesFrom(elemento);
      this.draw();
    }

    /** ¿El elemento, a su tamaño normal, entra dentro de los límites del lote en pantalla? */
    private cabe(
      elemento: HTMLElement,
      limites: google.maps.LatLngBounds,
      proyeccion: google.maps.MapCanvasProjection,
    ) {
      const medida = this.medirUnaVez(elemento);
      const noreste = proyeccion.fromLatLngToDivPixel(limites.getNorthEast());
      const suroeste = proyeccion.fromLatLngToDivPixel(limites.getSouthWest());
      if (!medida || !noreste || !suroeste) return true;
      const ancho = Math.abs(noreste.x - suroeste.x);
      const alto = Math.abs(noreste.y - suroeste.y);
      return ancho >= medida.ancho + 4 && alto >= medida.alto + 2;
    }

    private medirUnaVez(elemento: HTMLElement) {
      const guardada = this.medidas.get(elemento);
      if (guardada) return guardada;
      if (elemento.offsetWidth === 0) return null; // todavía no está en pantalla
      const medida = { ancho: elemento.offsetWidth, alto: elemento.offsetHeight };
      this.medidas.set(elemento, medida);
      return medida;
    }
  }

  const capa = new Capa();
  capa.setMap(mapa);
  return {
    mostrar: (elementos) => capa.mostrar(elementos),
    interactiva: (valor) => capa.contenedor.classList.toggle('inactiva', !valor),
    proyeccion: () => capa.getProjection() ?? null,
    quitar: () => capa.setMap(null),
  };
}
