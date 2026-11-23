/**
 * Reglas de las cuentas de usuario.
 */
import { ErrorReglaNegocio } from './errores';
import type { Rol } from './tipos';

export const LONGITUD_MINIMA_PASSWORD = 6;

/** Los correos se guardan y se buscan sin espacios y en minúsculas. */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validarPassword(password: string): void {
  if (password.length < LONGITUD_MINIMA_PASSWORD) {
    throw new ErrorReglaNegocio(
      'PASSWORD_DEBIL',
      `La contraseña debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres.`,
    );
  }
}

/** Solo un usuario CLIENTE se vincula a un cliente (y solo ve las operaciones de ese cliente). */
export function seVinculaACliente(rol: Rol): boolean {
  return rol === 'CLIENTE';
}

/**
 * Un usuario CLIENTE debe estar vinculado a un cliente; los demás roles no.
 * Devuelve el cliente a guardar: su id, o null si el rol no se vincula.
 */
export function validarVinculoCliente(rol: Rol, clienteId: number | null | undefined): number | null {
  if (seVinculaACliente(rol) && !clienteId) {
    throw new ErrorReglaNegocio('CLIENTE_REQUERIDO', 'Un usuario con rol CLIENTE debe estar vinculado a un cliente.');
  }
  if (!seVinculaACliente(rol) && clienteId) {
    throw new ErrorReglaNegocio('CLIENTE_NO_PERMITIDO', 'Solo los usuarios con rol CLIENTE se vinculan a un cliente.');
  }
  return clienteId || null;
}
