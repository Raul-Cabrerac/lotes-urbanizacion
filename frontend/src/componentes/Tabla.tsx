import type { HTMLAttributes, Key, ReactNode } from 'react';

/**
 * Una columna de la tabla. El `titulo` va en el <th> y en el `data-etiqueta` de cada celda: por
 * debajo de 40rem cada fila se muestra como ficha y la etiqueta acompaña a cada valor.
 */
export interface Columna<T> {
  titulo: string;
  celda: (fila: T) => ReactNode;
  /** Clase del <th> y de cada <td> (p. ej. 'numero'). */
  clase?: string;
  /** Clase solo de las celdas. */
  claseCelda?: string;
  /** La celda encabeza la ficha (el nombre, el proyecto...): va sin etiqueta. */
  encabezaFicha?: boolean;
}

type AtributosFila = HTMLAttributes<HTMLTableRowElement> & { [atributo: `data-${string}`]: string | undefined };

/** Tabla de datos definida por columnas. Una columna `false` no se muestra (columnas opcionales). */
export function Tabla<T>({
  filas,
  columnas,
  clave,
  atributosFila,
  testid,
}: {
  filas: T[];
  columnas: (Columna<T> | false)[];
  clave: (fila: T) => Key;
  atributosFila?: (fila: T) => AtributosFila;
  testid: string;
}) {
  const visibles = columnas.filter((columna): columna is Columna<T> => columna !== false);
  return (
    <table className="tabla" data-testid={testid}>
      <thead>
        <tr>
          {visibles.map((columna, i) => (
            <th key={i} className={columna.clase}>
              {columna.titulo}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((fila) => (
          <tr key={clave(fila)} {...atributosFila?.(fila)}>
            {visibles.map((columna, i) => (
              <td
                key={i}
                className={[columna.clase, columna.claseCelda].filter(Boolean).join(' ') || undefined}
                data-etiqueta={columna.titulo && !columna.encabezaFicha ? columna.titulo : undefined}
              >
                {columna.celda(fila)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
