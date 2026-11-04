import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import type { Permiso } from '../api/tipos';
import { AccesoDenegado } from '../paginas/Errores';
import { useSesion } from './Sesion';

/**
 * Protege una pantalla: sin sesión redirige al login; sin permiso muestra
 * "Acceso denegado". (La API también valida los permisos: esto es solo la interfaz.)
 */
export function RutaProtegida({ permiso, children }: { permiso?: Permiso; children: ReactNode }) {
  const { usuario, puede } = useSesion();
  const ubicacion = useLocation();

  if (!usuario) return <Navigate to="/login" replace state={{ desde: ubicacion.pathname + ubicacion.search }} />;
  if (permiso && !puede(permiso)) return <AccesoDenegado />;
  return <>{children}</>;
}
