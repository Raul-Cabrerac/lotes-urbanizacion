import type { UsuarioActual } from '../aplicacion/puertos';

// Agrega el usuario autenticado a la petición de Express (lo carga el middleware "autenticar").
declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioActual;
    }
  }
}

export {};
