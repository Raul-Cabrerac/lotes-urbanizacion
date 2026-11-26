/**
 * Paginación de los listados (consigna §10, «Historial y consultas»; la pidió el docente el
 * 2026-11-25). Son cálculos puros: la base de datos solo recibe el LIMIT y el OFFSET que salen de
 * aquí, y el frontend usa las mismas constantes.
 */

/** Filas por página cuando no se pide otra cantidad. */
export const POR_PAGINA_POR_DEFECTO = 10;
/** Tope de filas por página: una sola petición no puede traer la tabla entera. */
export const POR_PAGINA_MAXIMA = 100;

/** La página que se pide. La primera es la 1. */
export interface Paginacion {
  pagina: number;
  porPagina: number;
}

/** Una página de un listado, con lo necesario para mostrar «Página 2 de 5». */
export interface Pagina<T> {
  elementos: T[];
  pagina: number;
  porPagina: number;
  /** Cuántos registros cumplen los filtros, sumando todas las páginas. */
  total: number;
  totalPaginas: number;
}

/** Cuántas filas se saltan para llegar a la página pedida: el OFFSET de SQL. */
export function calcularDesplazamiento({ pagina, porPagina }: Paginacion): number {
  return (pagina - 1) * porPagina;
}

/** Páginas necesarias para `total` registros. Sin resultados igual hay una página, vacía. */
export function calcularTotalPaginas(total: number, porPagina: number): number {
  return Math.max(1, Math.ceil(total / porPagina));
}

/** Arma la página con los elementos ya recortados y el total de registros que cumplen los filtros. */
export function armarPagina<T>(elementos: T[], total: number, paginacion: Paginacion): Pagina<T> {
  return {
    elementos,
    pagina: paginacion.pagina,
    porPagina: paginacion.porPagina,
    total,
    totalPaginas: calcularTotalPaginas(total, paginacion.porPagina),
  };
}
