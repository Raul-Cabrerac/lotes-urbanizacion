import { useCallback, useEffect, useState } from 'react';
import { POR_PAGINA_POR_DEFECTO, type Pagina, type Paginacion } from '../dominio';
import { useDatos } from './useDatos';

/**
 * Carga una página de un listado y recuerda en qué página está.
 * - Si cambian los filtros vuelve a la página 1: con otros filtros, la página actual puede no existir.
 * - Si la página quedó vacía (por ejemplo, se canceló la única reserva de la última página), pasa a
 *   la última que existe.
 */
export function useListadoPaginado<T>(cargar: (paginacion: Paginacion) => Promise<Pagina<T>>, filtros: unknown[]) {
  const [paginacion, setPaginacion] = useState<Paginacion>({ pagina: 1, porPagina: POR_PAGINA_POR_DEFECTO });
  const claveFiltros = JSON.stringify(filtros);
  const [filtrosAnteriores, setFiltrosAnteriores] = useState(claveFiltros);
  if (claveFiltros !== filtrosAnteriores) {
    setFiltrosAnteriores(claveFiltros);
    setPaginacion((actual) => ({ ...actual, pagina: 1 }));
  }

  const resultado = useDatos(() => cargar(paginacion), [claveFiltros, paginacion.pagina, paginacion.porPagina]);
  const { datos } = resultado;

  useEffect(() => {
    if (datos && datos.pagina > datos.totalPaginas) {
      setPaginacion((actual) => ({ ...actual, pagina: datos.totalPaginas }));
    }
  }, [datos]);

  const cambiarPagina = useCallback((pagina: number, porPagina: number) => setPaginacion({ pagina, porPagina }), []);

  return { ...resultado, cambiarPagina };
}
