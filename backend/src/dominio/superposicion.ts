/**
 * Superposición entre lotes (consigna §11: geometrías válidas). Dos lotes vecinos pueden compartir
 * un lado o una esquina, pero no ocupar el mismo terreno.
 *
 * Para saber cuánto se pisan dos polígonos se calcula la superficie que comparten:
 * 1. Las coordenadas se pasan a metros.
 * 2. Cada polígono se parte en triángulos que salen de su primer vértice. En un polígono con
 *    entrantes (una L, por ejemplo) algunos triángulos caen por fuera: esos restan en vez de sumar.
 * 3. Se recorta cada triángulo de uno contra cada triángulo del otro y se suman las superficies.
 *
 * Funciones puras: no dependen del mapa ni de la base de datos.
 */
import { ErrorConflicto } from './errores';
import { RADIO_TIERRA_M, verticesUnicos, type PoligonoGeoJSON, type Posicion } from './geometria';

/** Superficie compartida que se tolera: cubre el redondeo y la imprecisión de dibujar dos lotes vecinos. */
export const SUPERPOSICION_TOLERADA_M2 = 1;

/** Lo que se necesita de un lote para compararlo con otro. */
export interface LoteConForma {
  codigo: string;
  geometria: PoligonoGeoJSON;
}

/** Un punto en metros [x, y], medido desde un origen común a los dos polígonos. */
type Punto = [number, number];

/** Un triángulo con sus puntos en sentido antihorario. `signo` vale -1 si resta superficie. */
interface Triangulo {
  puntos: Punto[];
  signo: number;
}

/** Superficie en m² que comparten dos polígonos: 0 si están separados o solo se tocan. */
export function areaCompartidaM2(a: PoligonoGeoJSON, b: PoligonoGeoJSON): number {
  const origen = a.coordinates[0][0];
  const triangulosDeB = enTriangulos(b, origen);
  let total = 0;
  for (const deA of enTriangulos(a, origen)) {
    for (const deB of triangulosDeB) total += deA.signo * deB.signo * superficie(recortar(deA.puntos, deB.puntos));
  }
  return Math.abs(total);
}

/** El primer lote de `otros` que pisa al polígono más de lo tolerado, o null si no pisa a ninguno. */
export function buscarLoteSuperpuesto<L extends LoteConForma>(geometria: PoligonoGeoJSON, otros: L[]): L | null {
  return otros.find((otro) => areaCompartidaM2(geometria, otro.geometria) > SUPERPOSICION_TOLERADA_M2) ?? null;
}

/** Regla: un lote no puede ocupar terreno de otro lote del mismo proyecto. */
export function validarSinSuperposicion(lote: LoteConForma, otros: LoteConForma[]): void {
  const pisado = buscarLoteSuperpuesto(lote.geometria, otros);
  if (pisado) {
    throw new ErrorConflicto(
      'LOTE_SUPERPUESTO',
      `El lote ${lote.codigo} se superpone con el lote ${pisado.codigo}. ` +
        'Dos lotes pueden compartir un lado, pero no ocupar el mismo terreno.',
    );
  }
}

// ----------------------------------------------------------------------------
// Funciones internas
// ----------------------------------------------------------------------------

/** Pasa los vértices de grados a metros, medidos desde `origen` (válido para distancias de pocos km). */
function enMetros(poligono: PoligonoGeoJSON, origen: Posicion): Punto[] {
  const metrosPorGradoLat = (Math.PI / 180) * RADIO_TIERRA_M;
  const metrosPorGradoLng = metrosPorGradoLat * Math.cos((origen[1] * Math.PI) / 180);
  return verticesUnicos(poligono).map(([lng, lat]) => [
    (lng - origen[0]) * metrosPorGradoLng,
    (lat - origen[1]) * metrosPorGradoLat,
  ]);
}

/** Parte el polígono en triángulos que salen de su primer vértice (los que no tienen superficie se descartan). */
function enTriangulos(poligono: PoligonoGeoJSON, origen: Posicion): Triangulo[] {
  const v = enMetros(poligono, origen);
  const triangulos: Triangulo[] = [];
  for (let i = 1; i < v.length - 1; i++) {
    const giro = lado(v[0], v[i], v[i + 1]);
    if (giro > 0) triangulos.push({ puntos: [v[0], v[i], v[i + 1]], signo: 1 });
    if (giro < 0) triangulos.push({ puntos: [v[0], v[i + 1], v[i]], signo: -1 });
  }
  return triangulos;
}

/** Positivo si `c` queda a la izquierda de la recta a→b, negativo si queda a la derecha y 0 si está sobre ella. */
function lado(a: Punto, b: Punto, c: Punto): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

/**
 * Devuelve la parte de `figura` que queda dentro de `triangulo` (algoritmo de Sutherland-Hodgman):
 * por cada lado del triángulo se conservan los puntos de su lado interior y se agrega el punto
 * de corte cuando un borde de la figura lo cruza.
 */
function recortar(figura: Punto[], triangulo: Punto[]): Punto[] {
  let dentro = figura;
  for (let i = 0; i < triangulo.length; i++) {
    const [a, b] = [triangulo[i], triangulo[(i + 1) % triangulo.length]];
    const anterior = dentro;
    dentro = [];
    for (let j = 0; j < anterior.length; j++) {
      const [p, q] = [anterior[j], anterior[(j + 1) % anterior.length]];
      const [ladoP, ladoQ] = [lado(a, b, p), lado(a, b, q)];
      if (ladoP >= 0) dentro.push(p);
      if (ladoP * ladoQ < 0) {
        const avance = ladoP / (ladoP - ladoQ);
        dentro.push([p[0] + avance * (q[0] - p[0]), p[1] + avance * (q[1] - p[1])]);
      }
    }
  }
  return dentro;
}

/** Superficie de un polígono dado por sus puntos en metros (fórmula del área de Gauss). */
function superficie(puntos: Punto[]): number {
  let doble = 0;
  for (let i = 0; i < puntos.length; i++) {
    const [p, q] = [puntos[i], puntos[(i + 1) % puntos.length]];
    doble += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(doble) / 2;
}
