import type { NextFunction, Request, Response } from 'express';
import { ErrorAplicacion, type CodigoError, type TipoError } from '../../dominio/errores';

/** Estado HTTP de cada tipo de error del catálogo (dominio/errores.ts). */
const ESTADO_HTTP: Record<TipoError, number> = {
  validacion: 400,
  noAutenticado: 401,
  sinPermiso: 403,
  noEncontrado: 404,
  conflicto: 409,
  reglaNegocio: 422,
};

/** Códigos que no vienen de la aplicación sino del propio HTTP. */
type CodigoHttp = 'RUTA_NO_ENCONTRADA' | 'JSON_INVALIDO' | 'ARCHIVO_DEMASIADO_GRANDE' | 'ERROR_INTERNO';

/**
 * Todas las respuestas de error tienen el mismo formato:
 *   { "error": { "codigo": "LOTE_NO_DISPONIBLE", "mensaje": "...", "detalles": ... } }
 */
export function responderError(
  res: Response,
  estado: number,
  codigo: CodigoError | CodigoHttp,
  mensaje: string,
  detalles?: unknown,
): void {
  res.status(estado).json({ error: { codigo, mensaje, detalles } });
}

export function manejadorErrores(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof ErrorAplicacion) {
    responderError(res, ESTADO_HTTP[error.tipo], error.codigo, error.message, error.detalles);
    return;
  }

  const tipo = (error as { type?: string })?.type;
  if (tipo === 'entity.parse.failed') {
    responderError(res, 400, 'JSON_INVALIDO', 'El cuerpo de la petición no es un JSON válido.');
    return;
  }
  if (tipo === 'entity.too.large') {
    responderError(res, 413, 'ARCHIVO_DEMASIADO_GRANDE', 'El contenido enviado es demasiado grande.');
    return;
  }

  console.error('[error inesperado]', error);
  responderError(res, 500, 'ERROR_INTERNO', 'Ocurrió un error inesperado en el servidor.');
}
