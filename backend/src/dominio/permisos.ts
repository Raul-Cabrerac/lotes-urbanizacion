/**
 * Control de acceso por roles (consigna, sección 2 y "Seguridad").
 *
 * Toda la matriz de permisos está en un solo lugar: las rutas HTTP la usan
 * para autorizar y el frontend la recibe para mostrar u ocultar botones.
 */
import type { Rol } from './tipos';

export const PERMISOS = {
  'proyectos:ver': ['ADMIN', 'ASESOR'],
  'proyectos:gestionar': ['ADMIN'], // crear, editar y publicar proyectos
  'lotes:ver': ['ADMIN', 'ASESOR'],
  'lotes:gestionar': ['ADMIN'], // dibujar, importar KML, editar datos y precio, bloquear
  'clientes:ver': ['ADMIN', 'ASESOR'],
  'clientes:gestionar': ['ADMIN', 'ASESOR'],
  'reservas:ver': ['ADMIN', 'ASESOR'],
  'reservas:gestionar': ['ADMIN', 'ASESOR'], // reservar y cancelar
  'ventas:ver': ['ADMIN', 'ASESOR', 'CLIENTE'], // el cliente solo ve sus propias ventas
  'ventas:registrar': ['ADMIN', 'ASESOR'],
  'ventas:anular': ['ADMIN'],
  'pagos:registrar': ['ADMIN', 'ASESOR'],
  'pagos:anular': ['ADMIN'],
  'usuarios:gestionar': ['ADMIN'],
  'reportes:ver': ['ADMIN'],
  'portal:ver': ['CLIENTE'],
} as const satisfies Record<string, readonly Rol[]>;

export type Permiso = keyof typeof PERMISOS;

export function tienePermiso(rol: Rol, permiso: Permiso): boolean {
  return (PERMISOS[permiso] as readonly Rol[]).includes(rol);
}

export function permisosDeRol(rol: Rol): Permiso[] {
  return (Object.keys(PERMISOS) as Permiso[]).filter((permiso) => tienePermiso(rol, permiso));
}
