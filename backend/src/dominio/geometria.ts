/**
 * Geometría de los lotes (polígonos GeoJSON en coordenadas [longitud, latitud]).
 *
 * Funciones puras: validar un polígono, calcular su superficie en m² y
 * sugerir sus dimensiones. No dependen del mapa (Google Maps) ni de la base de datos.
 */
import { ErrorReglaNegocio } from './errores';

export type Posicion = [number, number]; // [longitud, latitud]

export interface PoligonoGeoJSON {
  type: 'Polygon';
  coordinates: Posicion[][];
}

/** Radio medio de la Tierra en metros (el mismo que usa Turf.js para áreas y distancias). */
const RADIO_TIERRA_M = 6371008.8;
const MAX_VERTICES = 500;
const AREA_MINIMA_M2 = 1;

const aRadianes = (grados: number): number => (grados * Math.PI) / 180;

function geometriaInvalida(motivo: string): ErrorReglaNegocio {
  return new ErrorReglaNegocio('GEOMETRIA_INVALIDA', `Geometría inválida: ${motivo}`);
}

/**
 * Valida un polígono y lo devuelve normalizado: sin puntos repetidos seguidos
 * y con el anillo cerrado (el último punto igual al primero).
 * Lanza GEOMETRIA_INVALIDA si no es un polígono simple y válido.
 */
export function normalizarPoligono(entrada: unknown): PoligonoGeoJSON {
  const geo = entrada as Partial<PoligonoGeoJSON> | null;
  if (!geo || geo.type !== 'Polygon' || !Array.isArray(geo.coordinates)) {
    throw geometriaInvalida('se esperaba un objeto GeoJSON de tipo "Polygon".');
  }
  if (geo.coordinates.length !== 1) {
    throw geometriaInvalida('el polígono debe tener un solo contorno (sin huecos).');
  }
  const anillo = geo.coordinates[0];
  if (!Array.isArray(anillo)) throw geometriaInvalida('contorno mal formado.');

  const vertices: Posicion[] = [];
  for (const punto of anillo) {
    if (!Array.isArray(punto) || punto.length < 2) throw geometriaInvalida('coordenada mal formada.');
    const [lng, lat] = punto;
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90) {
      throw geometriaInvalida(`coordenada fuera de rango (${lng}, ${lat}).`);
    }
    const anterior = vertices[vertices.length - 1];
    if (!anterior || anterior[0] !== lng || anterior[1] !== lat) vertices.push([lng, lat]);
  }
  // Quitar el punto de cierre para trabajar con los vértices únicos.
  if (vertices.length > 1) {
    const [primero, ultimo] = [vertices[0], vertices[vertices.length - 1]];
    if (primero[0] === ultimo[0] && primero[1] === ultimo[1]) vertices.pop();
  }

  if (vertices.length < 3) throw geometriaInvalida('se necesitan al menos 3 vértices distintos.');
  if (vertices.length > MAX_VERTICES) throw geometriaInvalida(`máximo ${MAX_VERTICES} vértices.`);
  if (tieneAutoInterseccion(vertices)) throw geometriaInvalida('los lados del polígono se cruzan entre sí.');
  if (areaDeVertices(vertices) < AREA_MINIMA_M2) throw geometriaInvalida('la superficie es prácticamente cero.');

  return { type: 'Polygon', coordinates: [[...vertices, [...vertices[0]] as Posicion]] };
}

/** Superficie en m² (fórmula esférica, la misma que usa Turf.js). */
export function calcularAreaM2(poligono: PoligonoGeoJSON): number {
  return Math.round(areaDeVertices(verticesUnicos(poligono)) * 100) / 100;
}

/**
 * Sugiere las dimensiones de un lote. Para lotes de 4 lados devuelve
 * "frente x fondo" (los dos primeros lados); para otras formas, "Irregular (n lados)".
 */
export function sugerirDimensiones(poligono: PoligonoGeoJSON): string {
  const v = verticesUnicos(poligono);
  if (v.length !== 4) return `Irregular (${v.length} lados)`;
  const formato = (metros: number) => metros.toFixed(1).replace(/\.0$/, '').replace('.', ',');
  return `${formato(distanciaMetros(v[0], v[1]))} x ${formato(distanciaMetros(v[1], v[2]))} m`;
}

/** Distancia en metros entre dos posiciones (fórmula de Haversine). */
export function distanciaMetros(a: Posicion, b: Posicion): number {
  const dLat = aRadianes(b[1] - a[1]);
  const dLng = aRadianes(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(aRadianes(a[1])) * Math.cos(aRadianes(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.sqrt(h));
}

/**
 * Crea un rectángulo a partir de medidas en metros, desplazado desde un origen.
 * Útil para datos de prueba: rectanguloEnMetros(origen, 0, 0, 12, 30) => lote de 12 x 30 m.
 */
export function rectanguloEnMetros(
  origen: Posicion,
  xMetros: number,
  yMetros: number,
  anchoMetros: number,
  fondoMetros: number,
): PoligonoGeoJSON {
  const metrosPorGradoLat = (Math.PI / 180) * RADIO_TIERRA_M;
  const metrosPorGradoLng = metrosPorGradoLat * Math.cos(aRadianes(origen[1]));
  const punto = (x: number, y: number): Posicion => [
    Number((origen[0] + x / metrosPorGradoLng).toFixed(10)),
    Number((origen[1] + y / metrosPorGradoLat).toFixed(10)),
  ];
  const [x0, y0, x1, y1] = [xMetros, yMetros, xMetros + anchoMetros, yMetros + fondoMetros];
  return { type: 'Polygon', coordinates: [[punto(x0, y0), punto(x1, y0), punto(x1, y1), punto(x0, y1), punto(x0, y0)]] };
}

// ----------------------------------------------------------------------------
// Funciones internas
// ----------------------------------------------------------------------------

function verticesUnicos(poligono: PoligonoGeoJSON): Posicion[] {
  const anillo = poligono.coordinates[0];
  const [primero, ultimo] = [anillo[0], anillo[anillo.length - 1]];
  const cerrado = primero[0] === ultimo[0] && primero[1] === ultimo[1];
  return cerrado ? anillo.slice(0, -1) : anillo;
}

function areaDeVertices(v: Posicion[]): number {
  let total = 0;
  for (let i = 0; i < v.length; i++) {
    const anterior = v[(i - 1 + v.length) % v.length];
    const siguiente = v[(i + 1) % v.length];
    total += (aRadianes(siguiente[0]) - aRadianes(anterior[0])) * Math.sin(aRadianes(v[i][1]));
  }
  return Math.abs((total * RADIO_TIERRA_M * RADIO_TIERRA_M) / 2);
}

/** true si dos lados NO consecutivos del polígono se tocan o se cruzan. */
function tieneAutoInterseccion(v: Posicion[]): boolean {
  const n = v.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const consecutivos = j === i + 1 || (i === 0 && j === n - 1);
      if (!consecutivos && segmentosSeCruzan(v[i], v[(i + 1) % n], v[j], v[(j + 1) % n])) return true;
    }
  }
  return false;
}

function orientacion(p: Posicion, q: Posicion, r: Posicion): number {
  const valor = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]);
  if (Math.abs(valor) < 1e-18) return 0;
  return valor > 0 ? 1 : 2;
}

function estaEnSegmento(p: Posicion, q: Posicion, r: Posicion): boolean {
  return (
    q[0] <= Math.max(p[0], r[0]) && q[0] >= Math.min(p[0], r[0]) &&
    q[1] <= Math.max(p[1], r[1]) && q[1] >= Math.min(p[1], r[1])
  );
}

function segmentosSeCruzan(p1: Posicion, q1: Posicion, p2: Posicion, q2: Posicion): boolean {
  const o1 = orientacion(p1, q1, p2);
  const o2 = orientacion(p1, q1, q2);
  const o3 = orientacion(p2, q2, p1);
  const o4 = orientacion(p2, q2, q1);
  if (o1 !== o2 && o3 !== o4) return true;
  return (
    (o1 === 0 && estaEnSegmento(p1, p2, q1)) ||
    (o2 === 0 && estaEnSegmento(p1, q2, q1)) ||
    (o3 === 0 && estaEnSegmento(p2, p1, q2)) ||
    (o4 === 0 && estaEnSegmento(p2, q1, q2))
  );
}
