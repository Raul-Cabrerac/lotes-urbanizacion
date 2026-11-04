import { ErrorAplicacion, ErrorReglaNegocio } from '../../dominio/errores';
import { normalizarPoligono, type PoligonoGeoJSON } from '../../dominio/geometria';
import type { Lote } from '../../dominio/tipos';
import type { DatosLote, LectorKml, PlacemarkKml, UnidadDeTrabajo } from '../puertos';
import { prepararDatosLote } from './datosLote';
import type { ProyectoServicio } from './ProyectoServicio';

export interface OpcionesImportacionKml {
  kml: string;
  precioPorDefecto?: number;
  manzanoPorDefecto?: string;
  etapaPorDefecto?: string;
}

export interface ResultadoImportacion {
  lotesCreados: number;
  limiteImportado: boolean;
  elementosOmitidos: number;
  lotes: Lote[];
}

/** Lo que se pudo leer del archivo, antes de guardar nada. */
interface Lectura {
  lotes: DatosLote[];
  limite: PoligonoGeoJSON | null;
  omitidos: number;
  errores: string[];
}

/**
 * Importación de lotes desde un archivo KML (consigna §4: "carga de un archivo KML").
 *
 * Cada Placemark con un polígono es un lote; sus datos salen de ExtendedData (codigo, manzano,
 * etapa, precio, superficie, dimensiones) o de los valores por defecto. Un Placemark con
 * tipo=limite (o nombre "Límite..." / "Perímetro...") se guarda como perímetro del proyecto.
 * Es todo o nada: si un solo elemento tiene errores, no se importa ninguno.
 */
export class ImportacionKmlServicio {
  constructor(
    private readonly uow: UnidadDeTrabajo,
    private readonly proyectos: ProyectoServicio,
    private readonly lectorKml: LectorKml,
  ) {}

  async importar(proyectoId: number, opciones: OpcionesImportacionKml): Promise<ResultadoImportacion> {
    await this.proyectos.buscarExistente(proyectoId);
    const lectura = leerPlacemarks(this.lectorKml.leer(opciones.kml), opciones);

    for (const datos of lectura.lotes) {
      if (await this.uow.repos.lotes.buscarPorCodigo(proyectoId, datos.codigo)) {
        lectura.errores.push(`${datos.codigo}: ya existe un lote con ese código en el proyecto.`);
      }
    }
    if (lectura.lotes.length === 0 && lectura.limite === null && lectura.errores.length === 0) {
      lectura.errores.push('El archivo no contiene polígonos.');
    }
    if (lectura.errores.length > 0) {
      throw new ErrorReglaNegocio(
        'KML_CON_ERRORES',
        `No se importó ningún lote: el archivo tiene ${lectura.errores.length} error(es).`,
        lectura.errores,
      );
    }

    const { limite } = lectura;
    return this.uow.transaccion(async (repos) => {
      const creados: Lote[] = [];
      for (const datos of lectura.lotes) creados.push(await repos.lotes.crear(proyectoId, datos));
      if (limite) await repos.proyectos.actualizar(proyectoId, { limite });
      return {
        lotesCreados: creados.length,
        limiteImportado: limite !== null,
        elementosOmitidos: lectura.omitidos,
        lotes: creados,
      };
    });
  }
}

/** Convierte los Placemarks en lotes y perímetro, juntando todos los errores encontrados. */
function leerPlacemarks(placemarks: PlacemarkKml[], opciones: OpcionesImportacionKml): Lectura {
  const lectura: Lectura = { lotes: [], limite: null, omitidos: 0, errores: [] };
  const codigos = new Set<string>();

  placemarks.forEach((placemark, indice) => {
    if (placemark.geometria === null) {
      lectura.omitidos++; // puntos o líneas: no son lotes
      return;
    }
    try {
      if (esLimite(placemark)) {
        lectura.limite = normalizarPoligono(placemark.geometria);
        return;
      }
      const datos = aDatosLote(placemark, indice, opciones);
      if (codigos.has(datos.codigo)) {
        throw new ErrorReglaNegocio('CODIGO_LOTE_DUPLICADO', `el código ${datos.codigo} está repetido en el archivo.`);
      }
      codigos.add(datos.codigo);
      lectura.lotes.push(datos);
    } catch (error) {
      if (!(error instanceof ErrorAplicacion)) throw error;
      lectura.errores.push(`${placemark.nombre || `Elemento ${indice + 1}`}: ${error.message}`);
    }
  });
  return lectura;
}

function aDatosLote(placemark: PlacemarkKml, indice: number, opciones: OpcionesImportacionKml): DatosLote {
  const p = placemark.propiedades;
  const codigoAutomatico = `L-${String(indice + 1).padStart(2, '0')}`;
  return prepararDatosLote({
    codigo: p.codigo || (esNombreGenerico(placemark.nombre) ? codigoAutomatico : placemark.nombre),
    manzano: p.manzano ?? opciones.manzanoPorDefecto,
    etapa: p.etapa ?? opciones.etapaPorDefecto,
    precio: p.precio !== undefined ? leerNumero(p.precio, 'precio') : opciones.precioPorDefecto,
    superficieM2: p.superficie !== undefined ? leerNumero(p.superficie, 'superficie') : undefined,
    dimensiones: p.dimensiones,
    geometria: placemark.geometria,
  });
}

function esLimite(placemark: PlacemarkKml): boolean {
  const tipo = placemark.propiedades.tipo?.toLowerCase();
  return tipo === 'limite' || tipo === 'límite' || /^(l[ií]mite|per[ií]metro)/i.test(placemark.nombre);
}

/** Polígonos sin nombre propio (Google Earth los llama "Polígono sin título"): se numeran L-01, L-02... */
function esNombreGenerico(nombre: string): boolean {
  return (
    !nombre.trim() ||
    /^(pol[ií]gono( sin t[ií]tulo)?|untitled polygon|polygon)( ?\(?\d+\)?)?$/i.test(nombre.trim())
  );
}

/**
 * Números de ExtendedData: solo dígitos y, opcionalmente, punto con hasta 2 decimales.
 * Se rechaza "75.000" (separador de miles) para no confundirlo con 75 bolivianos.
 */
function leerNumero(valor: string, campo: string): number {
  const texto = valor.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(texto)) {
    throw new ErrorReglaNegocio(
      'KML_DATO_INVALIDO',
      `el ${campo} "${valor}" no es válido: use solo números y punto decimal, sin separador de miles (ej.: 75000 o 75000.50).`,
    );
  }
  return Number(texto);
}
