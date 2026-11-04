import { redondear } from '../../dominio/dinero';
import { calcularAreaM2, normalizarPoligono, sugerirDimensiones } from '../../dominio/geometria';
import { validarDatosComerciales } from '../../dominio/lote';
import type { DatosLote } from '../puertos';

/** Datos de un lote tal como llegan del formulario (dibujo) o de un archivo KML. */
export interface EntradaLote {
  codigo: string;
  manzano?: string;
  etapa?: string;
  precio?: number;
  superficieM2?: number | null; // si no se envía, se calcula desde el polígono
  dimensiones?: string; // si no se envía, se sugiere desde el polígono
  geometria: unknown;
}

/**
 * Valida la geometría (consigna §11: geometrías válidas), completa superficie y dimensiones
 * desde el polígono cuando no se indican y valida los datos comerciales.
 */
export function prepararDatosLote(entrada: EntradaLote): DatosLote {
  const geometria = normalizarPoligono(entrada.geometria);
  const datos: DatosLote = {
    codigo: normalizarCodigo(entrada.codigo),
    manzano: entrada.manzano?.trim() ?? '',
    etapa: entrada.etapa?.trim() ?? '',
    precio: redondear(entrada.precio ?? 0),
    superficieM2: redondear(entrada.superficieM2 ?? calcularAreaM2(geometria)),
    dimensiones: entrada.dimensiones?.trim() || sugerirDimensiones(geometria),
    geometria,
  };
  validarDatosComerciales(datos);
  return datos;
}

/** Los códigos se guardan sin espacios extra y en mayúsculas: "a-01 " => "A-01". */
export function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase();
}
