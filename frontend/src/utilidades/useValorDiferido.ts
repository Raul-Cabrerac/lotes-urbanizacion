import { useEffect, useState } from 'react';

/**
 * El valor recién cuando dejó de cambiar durante `demoraMs` (por ejemplo, cuando el usuario deja
 * de escribir). Al montar devuelve el valor inicial sin esperar.
 */
export function useValorDiferido<T>(valor: T, demoraMs = 300): T {
  const [diferido, setDiferido] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => setDiferido(valor), demoraMs);
    return () => clearTimeout(temporizador);
  }, [valor, demoraMs]);

  return diferido;
}
