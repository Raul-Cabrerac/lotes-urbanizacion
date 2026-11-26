import { calcularDesplazamiento, type Pagina } from '../dominio';

/** Cantidades que se ofrecen en «Por página». */
const OPCIONES_POR_PAGINA = [5, 10, 20, 50];

/**
 * Controles debajo de un listado paginado: «Mostrando 11–20 de 35», la cantidad por página y
 * Anterior / Siguiente. Cambiar la cantidad vuelve a la página 1.
 */
export function Paginacion({
  pagina,
  onCambiar,
}: {
  pagina: Pagina<unknown>;
  onCambiar: (numero: number, porPagina: number) => void;
}) {
  const { pagina: numero, porPagina, total, totalPaginas } = pagina;
  const desde = total === 0 ? 0 : calcularDesplazamiento(pagina) + 1;
  const hasta = Math.min(calcularDesplazamiento(pagina) + porPagina, total);

  return (
    <nav className="paginacion" aria-label="Páginas del listado" data-testid="paginacion">
      <span className="texto-suave pequeno" data-testid="paginacion-total">
        Mostrando {desde}–{hasta} de {total}
      </span>
      <div className="paginacion-controles">
        <label className="paginacion-por-pagina pequeno">
          Por página
          <select value={porPagina} onChange={(e) => onCambiar(1, Number(e.target.value))} data-testid="paginacion-por-pagina">
            {OPCIONES_POR_PAGINA.map((opcion) => (
              <option key={opcion} value={opcion}>
                {opcion}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="boton boton-chico"
          disabled={numero <= 1}
          onClick={() => onCambiar(numero - 1, porPagina)}
          data-testid="paginacion-anterior"
        >
          Anterior
        </button>
        <span className="pequeno" data-testid="paginacion-pagina">
          Página {numero} de {totalPaginas}
        </span>
        <button
          type="button"
          className="boton boton-chico"
          disabled={numero >= totalPaginas}
          onClick={() => onCambiar(numero + 1, porPagina)}
          data-testid="paginacion-siguiente"
        >
          Siguiente
        </button>
      </div>
    </nav>
  );
}
