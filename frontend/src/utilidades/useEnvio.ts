import { useState } from 'react';
import { ApiError, mensajeDeError } from '../api/http';

/**
 * Envío de un formulario a la API: mientras espera, `enviando` deshabilita el botón; si la API lo
 * rechaza, `error` trae el mensaje para mostrar. Ante un 409 (otro usuario cambió los datos
 * mientras tanto) llama a `alConflicto`, para que la pantalla de atrás vuelva a pedirlos.
 */
export function useEnvio({ alConflicto }: { alConflicto?: () => void } = {}) {
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (operacion: () => Promise<unknown>) => {
    setEnviando(true);
    setError(null);
    try {
      await operacion();
    } catch (err) {
      setError(mensajeDeError(err));
      if (err instanceof ApiError && err.estado === 409) alConflicto?.();
    } finally {
      setEnviando(false);
    }
  };

  return { enviar, enviando, error, setError };
}
