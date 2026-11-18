/**
 * La sesión guardada: el token y el usuario, siempre juntos. Es el único lugar que toca el
 * almacenamiento del navegador.
 *
 * Se guarda en sessionStorage: cada pestaña tiene su propia sesión, así se puede probar con dos
 * usuarios a la vez (p. ej. dos asesores). Si el almacenamiento no está disponible, la sesión
 * vive en memoria hasta recargar la página.
 */
import type { Usuario } from '../api/tipos';

export interface Sesion {
  token: string;
  usuario: Usuario;
}

const CLAVE_TOKEN = 'lotes.token';
const CLAVE_USUARIO = 'lotes.usuario';

/** Usa sessionStorage; si el navegador lo bloquea o falla, devuelve `siFalla`. */
function conAlmacenamiento<T>(operacion: (almacenamiento: Storage) => T, siFalla: T): T {
  try {
    return operacion(sessionStorage);
  } catch {
    return siFalla;
  }
}

function leer(): Sesion | null {
  return conAlmacenamiento((almacenamiento) => {
    const token = almacenamiento.getItem(CLAVE_TOKEN);
    const usuario = almacenamiento.getItem(CLAVE_USUARIO);
    return token && usuario ? { token, usuario: JSON.parse(usuario) as Usuario } : null;
  }, null);
}

function escribir(sesion: Sesion | null): void {
  conAlmacenamiento((almacenamiento) => {
    if (sesion) {
      almacenamiento.setItem(CLAVE_TOKEN, sesion.token);
      almacenamiento.setItem(CLAVE_USUARIO, JSON.stringify(sesion.usuario));
    } else {
      almacenamiento.removeItem(CLAVE_TOKEN);
      almacenamiento.removeItem(CLAVE_USUARIO);
    }
  }, undefined);
}

let actual: Sesion | null = leer();
const oyentes = new Set<() => void>();

export function sesionGuardada(): Sesion | null {
  return actual;
}

/** Guarda la sesión (null la cierra) y avisa a quien la esté siguiendo. */
export function guardarSesion(sesion: Sesion | null): void {
  actual = sesion;
  escribir(sesion);
  oyentes.forEach((avisar) => avisar());
}

/** Para useSyncExternalStore: avisa cada vez que la sesión cambia. */
export function seguirSesion(avisar: () => void): () => void {
  oyentes.add(avisar);
  return () => {
    oyentes.delete(avisar);
  };
}
