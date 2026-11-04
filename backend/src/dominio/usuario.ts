/**
 * Reglas de las cuentas de usuario.
 */
import { ErrorReglaNegocio } from './errores';
import type { Rol } from './tipos';

export const LONGITUD_MINIMA_PASSWORD = 6;

export function validarPassword(password: string): void {
  if (password.length < LONGITUD_MINIMA_PASSWORD) {
    throw new ErrorReglaNegocio(
      'PASSWORD_DEBIL',
      `La contraseña debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres.`,
    );
  }
}

/** Un usuario CLIENTE debe estar vinculado a un cliente; los demás roles no. */
export function validarVinculoCliente(rol: Rol, clienteId: number | null | undefined): void {
  if (rol === 'CLIENTE' && !clienteId) {
    throw new ErrorReglaNegocio('CLIENTE_REQUERIDO', 'Un usuario con rol CLIENTE debe estar vinculado a un cliente.');
  }
  if (rol !== 'CLIENTE' && clienteId) {
    throw new ErrorReglaNegocio('CLIENTE_NO_PERMITIDO', 'Solo los usuarios con rol CLIENTE se vinculan a un cliente.');
  }
}
