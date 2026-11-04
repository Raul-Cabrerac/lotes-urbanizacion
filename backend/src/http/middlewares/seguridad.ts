/**
 * Middlewares de autenticación (¿quién es?) y autorización (¿puede hacerlo?).
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { UsuarioActual } from '../../aplicacion/puertos';
import type { AuthServicio } from '../../aplicacion/servicios/AuthServicio';
import { ErrorNoAutenticado, ErrorSinPermiso } from '../../dominio/errores';
import { tienePermiso, type Permiso } from '../../dominio/permisos';

/** Exige el encabezado "Authorization: Bearer <token>" y carga req.usuario. */
export function autenticar(auth: AuthServicio): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const [tipo, token] = (req.headers.authorization ?? '').split(' ');
    if (tipo !== 'Bearer' || !token) throw new ErrorNoAutenticado();
    req.usuario = await auth.usuarioDesdeToken(token);
    next();
  };
}

/** Permite continuar solo si el rol del usuario tiene el permiso (ver dominio/permisos.ts). */
export function autorizar(permiso: Permiso): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario) throw new ErrorNoAutenticado();
    if (!tienePermiso(req.usuario.rol, permiso)) throw new ErrorSinPermiso();
    next();
  };
}

/** Usuario autenticado de la petición (las rutas protegidas siempre lo tienen). */
export function usuarioDe(req: Request): UsuarioActual {
  if (!req.usuario) throw new ErrorNoAutenticado();
  return req.usuario;
}
