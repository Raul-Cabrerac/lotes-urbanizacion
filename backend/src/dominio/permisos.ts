/**
 * Control de acceso por roles (consigna, sección 2 y "Seguridad").
 *
 * Toda la matriz de permisos está en un solo lugar: las rutas HTTP la usan
 * para autorizar y el frontend la recibe para mostrar u ocultar botones.
 */
import { ErrorSinPermiso } from './errores';
import { ESTADOS_PROYECTO, ROLES, type EstadoProyecto, type Rol } from './tipos';
import { seVinculaACliente } from './usuario';

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
  'portal:ver': ROLES.filter(seVinculaACliente), // el portal muestra las operaciones de su cliente
} as const satisfies Record<string, readonly Rol[]>;

export type Permiso = keyof typeof PERMISOS;

export function tienePermiso(rol: Rol, permiso: Permiso): boolean {
  return (PERMISOS[permiso] as readonly Rol[]).includes(rol);
}

export function permisosDeRol(rol: Rol): Permiso[] {
  return (Object.keys(PERMISOS) as Permiso[]).filter((permiso) => tienePermiso(rol, permiso));
}

// ----------------------------------------------------------------------------
// Alcance: qué datos ve cada rol (además de qué operaciones puede hacer)
// ----------------------------------------------------------------------------

/** Estados de proyecto que ve cada rol: el administrador, todos; los demás, solo los PUBLICADOS. */
export function estadosVisibles(rol: Rol): readonly EstadoProyecto[] {
  return rol === 'ADMIN' ? ESTADOS_PROYECTO : ['PUBLICADO'];
}

/**
 * Cliente al que se limitan las operaciones (ventas, reservas) que ve el usuario:
 * un CLIENTE solo ve las suyas; ADMIN y ASESOR ven todas (undefined).
 */
export function clienteDelAlcance(usuario: { rol: Rol; clienteId: number | null }): number | undefined {
  if (!seVinculaACliente(usuario.rol)) return undefined;
  if (!usuario.clienteId) throw new ErrorSinPermiso('Su usuario no está vinculado a un cliente.');
  return usuario.clienteId;
}

/** true si el usuario puede ver las operaciones del cliente indicado. */
export function alcanzaCliente(usuario: { rol: Rol; clienteId: number | null }, clienteId: number): boolean {
  const propio = clienteDelAlcance(usuario);
  return propio === undefined || propio === clienteId;
}
