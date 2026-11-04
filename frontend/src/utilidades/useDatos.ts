import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, mensajeDeError } from '../api/http';

/**
 * Carga datos de la API y expone { datos, error, estadoError, cargando, recargar }.
 * Si llegan respuestas fuera de orden, solo se usa la última pedida.
 */
export function useDatos<T>(cargar: () => Promise<T>, dependencias: unknown[]) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estadoError, setEstadoError] = useState<number | null>(null); // código HTTP del error (403, 404...)
  const [cargando, setCargando] = useState(true);
  const ultimaPeticion = useRef(0);

  const recargar = useCallback(async () => {
    const numero = ++ultimaPeticion.current;
    setCargando(true);
    try {
      const resultado = await cargar();
      if (numero === ultimaPeticion.current) {
        setDatos(resultado);
        setError(null);
        setEstadoError(null);
      }
    } catch (e) {
      if (numero === ultimaPeticion.current) {
        setError(mensajeDeError(e));
        setEstadoError(e instanceof ApiError ? e.estado : null);
      }
    } finally {
      if (numero === ultimaPeticion.current) setCargando(false);
    }
  }, dependencias);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { datos, error, estadoError, cargando, recargar, setDatos };
}
