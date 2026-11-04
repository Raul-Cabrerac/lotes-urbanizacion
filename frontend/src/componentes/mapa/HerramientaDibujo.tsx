/**
 * Dibujo de un polígono sobre Google Maps (un lote nuevo o el perímetro del proyecto).
 *
 * - Cada clic en el mapa agrega un vértice.
 * - Un clic cerca de un vértice de otro lote se "pega" a ese vértice (lotes contiguos sin huecos).
 * - Un clic sobre el primer vértice, o el botón "Terminar", cierra el polígono.
 *
 * Solo existe mientras se dibuja: al terminar o cancelar se desmonta y los vértices se descartan.
 */
import { useEffect, useState } from 'react';
import type { Poligono } from '../../api/tipos';
import type { CapaHtml } from './capaHtml';
import { AZUL_SELECCION } from './colores';
import type { GoogleMaps } from './cargarGoogleMaps';
import { aPoligono, verticeCercano, type Punto } from './geometriaMapa';

/** Distancia en píxeles para pegar un clic a un vértice cercano. */
const RADIO_IMAN_PX = 12;
const MINIMO_VERTICES = 3;

interface Props {
  api: GoogleMaps;
  mapa: google.maps.Map;
  capaVertices: CapaHtml;
  /** Vértices de los lotes ya dibujados, a los que se pegan los clics cercanos. */
  verticesExistentes: Punto[];
  onTerminar: (poligono: Poligono) => void;
}

export function HerramientaDibujo({ api, mapa, capaVertices, verticesExistentes, onTerminar }: Props) {
  const [vertices, setVertices] = useState<Punto[]>([]);
  const puedeTerminar = vertices.length >= MINIMO_VERTICES;

  const terminar = () => {
    if (puedeTerminar) onTerminar(aPoligono(vertices));
  };

  // Mientras se dibuja: cursor en cruz y el doble clic no hace zoom.
  useEffect(() => {
    mapa.setOptions({ draggableCursor: 'crosshair', disableDoubleClickZoom: true });
    return () => mapa.setOptions({ draggableCursor: null, disableDoubleClickZoom: false });
  }, [mapa]);

  // Clic en el mapa: agrega un vértice o cierra el polígono.
  useEffect(() => {
    const escucha = mapa.addListener('click', (evento: google.maps.MapMouseEvent) => {
      const clic = evento.latLng?.toJSON();
      const proyeccion = capaVertices.proyeccion();
      if (!clic || !proyeccion) return;
      const primero = vertices[0];
      const ultimo = vertices[vertices.length - 1];
      if (primero && puedeTerminar && verticeCercano(clic, [primero], proyeccion, RADIO_IMAN_PX)) {
        onTerminar(aPoligono(vertices));
        return;
      }
      if (ultimo && verticeCercano(clic, [ultimo], proyeccion, 3)) return; // doble clic
      const pegado = verticeCercano(clic, verticesExistentes, proyeccion, RADIO_IMAN_PX);
      setVertices([...vertices, pegado ?? clic]);
    });
    return () => escucha.remove();
  }, [mapa, capaVertices, vertices, verticesExistentes, puedeTerminar, onTerminar]);

  // Vista previa: líneas entre los vértices, guía hasta el puntero y puntos en cada vértice.
  useEffect(() => {
    const opciones = { map: mapa, clickable: false, strokeColor: AZUL_SELECCION };
    const trazo = new api.maps.Polyline({ ...opciones, path: vertices, strokeWeight: 3 });
    const guia = new api.maps.Polyline({ ...opciones, strokeWeight: 2, strokeOpacity: 0.6 });
    const primero = vertices[0];
    const ultimo = vertices[vertices.length - 1];
    const seguirPuntero = mapa.addListener('mousemove', (evento: google.maps.MapMouseEvent) => {
      const puntero = evento.latLng?.toJSON();
      if (!puntero || !primero || !ultimo) return;
      guia.setPath(vertices.length >= 2 ? [ultimo, puntero, primero] : [ultimo, puntero]);
    });
    capaVertices.mostrar(
      vertices.map((posicion, indice) => ({ posicion, elemento: crearVertice(indice === 0) })),
    );
    return () => {
      trazo.setMap(null);
      guia.setMap(null);
      seguirPuntero.remove();
      capaVertices.mostrar([]);
    };
  }, [api, mapa, capaVertices, vertices]);

  return (
    <div className="herramienta-dibujo" data-testid="herramienta-dibujo">
      <span data-testid="dibujo-vertices">
        {vertices.length} {vertices.length === 1 ? 'vértice' : 'vértices'}
      </span>
      <button
        className="boton boton-chico"
        onClick={() => setVertices(vertices.slice(0, -1))}
        disabled={vertices.length === 0}
        data-testid="deshacer-vertice"
      >
        Deshacer punto
      </button>
      <button
        className="boton boton-chico boton-primario"
        onClick={terminar}
        disabled={!puedeTerminar}
        data-testid="terminar-dibujo"
      >
        Terminar polígono
      </button>
    </div>
  );
}

function crearVertice(esPrimero: boolean): HTMLElement {
  const punto = document.createElement('div');
  punto.className = esPrimero ? 'vertice-dibujo inicial' : 'vertice-dibujo';
  punto.dataset.testid = 'vertice-dibujo';
  if (esPrimero) punto.title = 'Haga clic aquí para cerrar el polígono';
  return punto;
}
