import { ApiError } from '../api/http';
import { useAvisos } from '../componentes/Avisos';

/**
 * Operación sin diálogo (bloquear un lote, activar un usuario...): si sale bien, avisa y vuelve a
 * pedir los datos con `recargar`; si la API la rechaza, avisa el error. Ante un 409 (otro usuario
 * cambió los datos mientras tanto) también recarga, como `useEnvio`, para mostrar lo actual.
 * Devuelve true si la operación salió bien.
 */
export function useOperacion(recargar: () => Promise<unknown>) {
  const avisos = useAvisos();

  return async (operacion: () => Promise<unknown>, mensaje: string): Promise<boolean> => {
    try {
      await operacion();
      avisos.exito(mensaje);
      await recargar();
      return true;
    } catch (err) {
      avisos.error(err);
      if (err instanceof ApiError && err.estado === 409) void recargar();
      return false;
    }
  };
}
