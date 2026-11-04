/**
 * Lector de archivos KML (Google Earth) basado en @xmldom/xmldom.
 *
 * Extrae de cada <Placemark>: el nombre, los datos de <ExtendedData> y el
 * contorno exterior de su <Polygon> convertido a GeoJSON [longitud, latitud].
 * No valida la geometría: eso lo hace el dominio (normalizarPoligono).
 *
 * Ejemplo de Placemark soportado:
 *   <Placemark>
 *     <name>A-01</name>
 *     <ExtendedData>
 *       <Data name="manzano"><value>A</value></Data>
 *       <Data name="precio"><value>75000</value></Data>
 *     </ExtendedData>
 *     <Polygon><outerBoundaryIs><LinearRing>
 *       <coordinates>-63.18,-17.78,0 -63.17,-17.78,0 -63.17,-17.77,0 -63.18,-17.78,0</coordinates>
 *     </LinearRing></outerBoundaryIs></Polygon>
 *   </Placemark>
 */
import { DOMParser, type Element } from '@xmldom/xmldom';
import { ErrorReglaNegocio } from '../../dominio/errores';
import type { LectorKml, PlacemarkKml } from '../../aplicacion/puertos';

const kmlInvalido = (motivo: string) => new ErrorReglaNegocio('KML_INVALIDO', `Archivo KML inválido: ${motivo}`);

export class LectorKmlXml implements LectorKml {
  leer(contenido: string): PlacemarkKml[] {
    if (!contenido.trim()) throw kmlInvalido('el archivo está vacío.');

    let documento;
    try {
      documento = new DOMParser({
        onError: (nivel, mensaje) => {
          if (nivel !== 'warning') throw new Error(mensaje);
        },
      }).parseFromString(contenido, 'text/xml');
    } catch {
      throw kmlInvalido('no es un XML bien formado.');
    }

    const raiz = documento.documentElement;
    if (!raiz || raiz.localName !== 'kml') throw kmlInvalido('falta el elemento raíz <kml>.');

    return elementos(raiz, 'Placemark').map((placemark) => ({
      nombre: textoDeHijo(placemark, 'name'),
      propiedades: leerExtendedData(placemark),
      geometria: leerPoligono(placemark),
    }));
  }
}

/** Todos los descendientes con ese nombre (sin importar el namespace). */
function elementos(padre: Element, nombre: string): Element[] {
  return Array.from(padre.getElementsByTagNameNS('*', nombre));
}

/** Texto de un hijo DIRECTO (para no confundir <name> del Placemark con otros). */
function textoDeHijo(padre: Element, nombre: string): string {
  for (const nodo of Array.from(padre.childNodes)) {
    const elemento = nodo as Element;
    if (elemento.nodeType === 1 && elemento.localName === nombre) return (elemento.textContent ?? '').trim();
  }
  return '';
}

/** Lee <Data name="x"><value>..</value></Data> y <SimpleData name="x">..</SimpleData>. */
function leerExtendedData(placemark: Element): Record<string, string> {
  const propiedades: Record<string, string> = {};
  for (const data of elementos(placemark, 'Data')) {
    const clave = data.getAttribute('name')?.trim().toLowerCase();
    if (clave) propiedades[clave] = textoDeHijo(data, 'value');
  }
  for (const simple of elementos(placemark, 'SimpleData')) {
    const clave = simple.getAttribute('name')?.trim().toLowerCase();
    if (clave) propiedades[clave] = (simple.textContent ?? '').trim();
  }
  return propiedades;
}

/** Convierte el contorno exterior del primer <Polygon> a GeoJSON; null si no hay polígono. */
function leerPoligono(placemark: Element): unknown {
  const [poligono] = elementos(placemark, 'Polygon');
  if (!poligono) return null;
  const [exterior] = elementos(poligono, 'outerBoundaryIs');
  const [coordenadas] = elementos(exterior ?? poligono, 'coordinates');
  if (!coordenadas) return { type: 'Polygon', coordinates: [[]] };

  const anillo = (coordenadas.textContent ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tupla) => tupla.split(',').slice(0, 2).map(Number)); // "lng,lat[,alt]" -> [lng, lat]
  return { type: 'Polygon', coordinates: [anillo] };
}
