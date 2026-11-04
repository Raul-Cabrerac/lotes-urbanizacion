import type { NextFunction, Request, Response } from 'express';
import {
  ErrorAplicacion,
  ErrorConflicto,
  ErrorNoAutenticado,
  ErrorNoEncontrado,
  ErrorReglaNegocio,
  ErrorSinPermiso,
  ErrorValidacion,
} from '../../dominio/errores';

/** Traducción de los errores de la aplicación a códigos HTTP. */
function estadoHttp(error: ErrorAplicacion): number {
  if (error instanceof ErrorValidacion) return 400;
  if (error instanceof ErrorNoAutenticado) return 401;
  if (error instanceof ErrorSinPermiso) return 403;
  if (error instanceof ErrorNoEncontrado) return 404;
  if (error instanceof ErrorConflicto) return 409;
  if (error instanceof ErrorReglaNegocio) return 422;
  return 400;
}

/**
 * Responde todos los errores con el mismo formato:
 *   { "error": { "codigo": "LOTE_NO_DISPONIBLE", "mensaje": "...", "detalles": ... } }
 */
export function manejadorErrores(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof ErrorAplicacion) {
    res.status(estadoHttp(error)).json({
      error: { codigo: error.codigo, mensaje: error.message, detalles: error.detalles },
    });
    return;
  }

  // Segunda barrera: si una restricción de la base de datos rechaza algo que el
  // dominio no validó, se responde con un 4xx claro en vez de un 500.
  const codigoPostgres = codigoErrorPostgres(error);
  if (codigoPostgres) {
    const respuesta = ERRORES_POSTGRES[codigoPostgres];
    if (respuesta) {
      res.status(respuesta.estado).json({ error: { codigo: respuesta.codigo, mensaje: respuesta.mensaje } });
      return;
    }
  }

  const tipo = (error as { type?: string })?.type;
  if (tipo === 'entity.parse.failed') {
    res.status(400).json({ error: { codigo: 'JSON_INVALIDO', mensaje: 'El cuerpo de la petición no es un JSON válido.' } });
    return;
  }
  if (tipo === 'entity.too.large') {
    res.status(413).json({ error: { codigo: 'ARCHIVO_DEMASIADO_GRANDE', mensaje: 'El contenido enviado es demasiado grande.' } });
    return;
  }

  console.error('[error inesperado]', error);
  res.status(500).json({ error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error inesperado en el servidor.' } });
}

/** Códigos de error de PostgreSQL (SQLSTATE) más comunes y su respuesta HTTP. */
const ERRORES_POSTGRES: Record<string, { estado: number; codigo: string; mensaje: string }> = {
  '23505': { estado: 409, codigo: 'REGISTRO_DUPLICADO', mensaje: 'Ya existe un registro con esos datos.' },
  '23503': { estado: 409, codigo: 'REGISTRO_RELACIONADO', mensaje: 'La operación hace referencia a un registro inexistente o en uso.' },
  '23514': { estado: 422, codigo: 'DATO_FUERA_DE_RANGO', mensaje: 'Algún valor no cumple las restricciones de la base de datos.' },
  '22003': { estado: 422, codigo: 'DATO_FUERA_DE_RANGO', mensaje: 'Algún número es demasiado grande.' },
  '22001': { estado: 422, codigo: 'DATO_FUERA_DE_RANGO', mensaje: 'Algún texto es demasiado largo.' },
};

function codigoErrorPostgres(error: unknown): string | null {
  const posible = error as { code?: unknown; severity?: unknown } | null;
  return posible && typeof posible.code === 'string' && typeof posible.severity === 'string' ? posible.code : null;
}
