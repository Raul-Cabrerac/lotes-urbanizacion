/**
 * Conversiones entre el GeoJSON que guarda el backend y lo que usa Google Maps.
 *
 * - GeoJSON: coordenadas [longitud, latitud] y el anillo repite el primer punto al final.
 * - Google Maps: puntos { lat, lng } y el polígono se cierra solo (no se repite el primero).
 */
import type { Poligono } from '../../api/tipos';

export type Punto = google.maps.LatLngLiteral;

export function aRuta(poligono: Poligono): Punto[] {
  const puntos = (poligono.coordinates[0] ?? []).map(([lng, lat]) => ({ lat, lng }));
  const primero = puntos[0];
  const ultimo = puntos[puntos.length - 1];
  if (primero && ultimo && primero.lat === ultimo.lat && primero.lng === ultimo.lng) puntos.pop();
  return puntos;
}

/** Recibe al menos 3 puntos y devuelve el polígono GeoJSON cerrado. */
export function aPoligono(ruta: Punto[]): Poligono {
  const anillo = ruta.map(({ lat, lng }): [number, number] => [lng, lat]);
  return { type: 'Polygon', coordinates: [[...anillo, anillo[0]]] };
}

/** Centro aproximado del lote (promedio de sus vértices): ahí va la etiqueta con el código. */
export function centroDe(ruta: Punto[]): Punto {
  const suma = ruta.reduce((total, p) => ({ lat: total.lat + p.lat, lng: total.lng + p.lng }), {
    lat: 0,
    lng: 0,
  });
  return { lat: suma.lat / ruta.length, lng: suma.lng / ruta.length };
}

/**
 * Si `punto` está a `radioPx` píxeles o menos de alguno de los `candidatos`, devuelve el más
 * cercano. Sirve para "pegar" un vértice nuevo al vértice de un lote vecino: así los lotes quedan
 * contiguos, sin huecos ni superposiciones por unos centímetros.
 */
export function verticeCercano(
  punto: Punto,
  candidatos: Punto[],
  proyeccion: google.maps.MapCanvasProjection,
  radioPx: number,
): Punto | null {
  const enPantalla = proyeccion.fromLatLngToContainerPixel(punto);
  if (!enPantalla) return null;
  let elegido: Punto | null = null;
  let menorDistancia = radioPx;
  for (const candidato of candidatos) {
    const otro = proyeccion.fromLatLngToContainerPixel(candidato);
    if (!otro) continue;
    const distancia = Math.hypot(enPantalla.x - otro.x, enPantalla.y - otro.y);
    if (distancia <= menorDistancia) {
      elegido = candidato;
      menorDistancia = distancia;
    }
  }
  return elegido;
}
