/**
 * Sesión del usuario: quién inició sesión y qué permisos tiene.
 * Los permisos vienen del backend (dominio/permisos.ts), así la interfaz y la
 * API usan exactamente la misma matriz de roles.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api/api';
import { ApiError, configurarAlExpirarSesion, guardarToken, leerToken } from '../api/http';
import type { Permiso, Usuario } from '../api/tipos';

const CLAVE_USUARIO = 'lotes.usuario';

interface ContextoSesion {
  usuario: Usuario | null;
  iniciarSesion(email: string, password: string): Promise<Usuario>;
  cerrarSesion(): void;
  puede(permiso: Permiso): boolean;
}

const Contexto = createContext<ContextoSesion | null>(null);

function leerUsuarioGuardado(): Usuario | null {
  try {
    const texto = sessionStorage.getItem(CLAVE_USUARIO);
    return texto && leerToken() ? (JSON.parse(texto) as Usuario) : null;
  } catch {
    return null;
  }
}

function guardarUsuario(usuario: Usuario | null): void {
  try {
    if (usuario) sessionStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
    else sessionStorage.removeItem(CLAVE_USUARIO);
  } catch {
    // almacenamiento no disponible
  }
}

export function ProveedorSesion({ children }: { children: ReactNode }) {
  // Al recargar la página se usa el usuario guardado y luego se confirma con la API.
  const [usuario, setUsuario] = useState<Usuario | null>(leerUsuarioGuardado);

  const cerrarSesion = useCallback(() => {
    guardarToken(null);
    guardarUsuario(null);
    setUsuario(null);
  }, []);

  useEffect(() => {
    configurarAlExpirarSesion(cerrarSesion);
    if (!leerToken()) return;
    const confirmarSesion = async () => {
      try {
        const actual = await api.auth.yo();
        guardarUsuario(actual);
        setUsuario(actual);
      } catch (error) {
        // Solo se cierra la sesión si el token ya no vale (401); si el backend
        // se está reiniciando, se conserva la sesión.
        if (error instanceof ApiError && error.estado === 401) cerrarSesion();
      }
    };
    void confirmarSesion();
  }, [cerrarSesion]);

  const valor = useMemo<ContextoSesion>(
    () => ({
      usuario,
      async iniciarSesion(email, password) {
        const { token, usuario: usuarioActual } = await api.auth.login(email, password);
        guardarToken(token);
        guardarUsuario(usuarioActual);
        setUsuario(usuarioActual);
        return usuarioActual;
      },
      cerrarSesion,
      puede: (permiso) => usuario?.permisos.includes(permiso) ?? false,
    }),
    [usuario, cerrarSesion],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): ContextoSesion {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useSesion debe usarse dentro de <ProveedorSesion>');
  return contexto;
}

/** Página de inicio según el rol. */
export function inicioSegunRol(usuario: Usuario): string {
  return usuario.rol === 'CLIENTE' ? '/mi-portal' : '/proyectos';
}
