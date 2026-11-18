/**
 * Sesión del usuario: quién inició sesión y qué permisos tiene.
 * Los permisos vienen del backend (dominio/permisos.ts), así la interfaz y la
 * API usan exactamente la misma matriz de roles.
 */
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { api } from '../api/api';
import type { Usuario } from '../api/tipos';
import type { Permiso } from '../dominio';
import { guardarSesion, seguirSesion, sesionGuardada } from './sesionGuardada';

interface ContextoSesion {
  usuario: Usuario | null;
  iniciarSesion(email: string, password: string): Promise<Usuario>;
  cerrarSesion(): void;
  puede(permiso: Permiso): boolean;
}

const Contexto = createContext<ContextoSesion | null>(null);

const cerrarSesion = () => guardarSesion(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const sesion = useSyncExternalStore(seguirSesion, sesionGuardada);
  const usuario = sesion?.usuario ?? null;

  // Al recargar la página se usa el usuario guardado y luego se confirma con la API. Si el token
  // ya no vale (401), el cliente HTTP cierra la sesión; si el backend se está reiniciando, se
  // conserva.
  useEffect(() => {
    const guardada = sesionGuardada();
    if (!guardada) return;
    const confirmarSesion = async () => {
      try {
        const actual = await api.auth.yo();
        if (sesionGuardada()?.token === guardada.token) guardarSesion({ token: guardada.token, usuario: actual });
      } catch {
        // sin conexión: se conserva la sesión guardada
      }
    };
    void confirmarSesion();
  }, []);

  const valor = useMemo<ContextoSesion>(
    () => ({
      usuario,
      async iniciarSesion(email, password) {
        const { token, usuario: usuarioActual } = await api.auth.login(email, password);
        guardarSesion({ token, usuario: usuarioActual });
        return usuarioActual;
      },
      cerrarSesion,
      puede: (permiso) => usuario?.permisos.includes(permiso) ?? false,
    }),
    [usuario],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): ContextoSesion {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useSesion debe usarse dentro de <ProveedorSesion>');
  return contexto;
}

/** El usuario de la sesión, en las pantallas que solo se muestran con sesión (dentro de RutaProtegida). */
export function useUsuarioActual(): Usuario {
  const { usuario } = useSesion();
  if (!usuario) throw new Error('useUsuarioActual debe usarse dentro de <RutaProtegida>');
  return usuario;
}

/** Página de inicio según los permisos: el portal para quien lo ve, los proyectos para los demás. */
export function inicioSegunRol(usuario: Usuario): string {
  return usuario.permisos.includes('portal:ver') ? '/mi-portal' : '/proyectos';
}
