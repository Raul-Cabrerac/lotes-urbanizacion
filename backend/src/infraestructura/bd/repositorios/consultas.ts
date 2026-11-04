/**
 * Ayudantes que comparten todos los repositorios SQL.
 *
 * Todas las consultas usan parámetros ($1, $2...) y nunca concatenan valores dentro del SQL: así
 * se evita la inyección SQL.
 */
import type { EjecutorSql } from '../baseDeDatos';

export interface Consultas {
  /** Ejecuta la consulta y devuelve todas las filas. */
  filas<T>(sql: string, parametros?: unknown[]): Promise<T[]>;
  /** Ejecuta la consulta y devuelve la primera fila, o null si no hay ninguna. */
  fila<T>(sql: string, parametros?: unknown[]): Promise<T | null>;
  /** Para INSERT/UPDATE ... RETURNING: la fila tiene que existir; si no, es un error del programa. */
  filaObligatoria<T>(sql: string, parametros?: unknown[]): Promise<T>;
}

export function crearConsultas(bd: EjecutorSql): Consultas {
  const filas = async <T>(sql: string, parametros: unknown[] = []) =>
    (await bd.query<T>(sql, parametros)).rows;
  const fila = async <T>(sql: string, parametros: unknown[] = []) =>
    (await filas<T>(sql, parametros))[0] ?? null;

  return {
    filas,
    fila,
    async filaObligatoria<T>(sql: string, parametros: unknown[] = []) {
      const resultado = await fila<T>(sql, parametros);
      if (resultado === null) throw new Error(`La consulta no devolvió ninguna fila: ${sql}`);
      return resultado;
    },
  };
}

/**
 * Arma un WHERE solo con los filtros que tienen valor.
 * construirWhere([['estado = ?', 'ACTIVA'], ['cliente_id = ?', undefined]])
 *   => { where: 'WHERE estado = $1', parametros: ['ACTIVA'] }
 */
export function construirWhere(condiciones: [string, unknown][]): {
  where: string;
  parametros: unknown[];
} {
  const partes: string[] = [];
  const parametros: unknown[] = [];
  for (const [condicion, valor] of condiciones) {
    if (valor === undefined) continue;
    parametros.push(valor);
    partes.push(condicion.replace('?', `$${parametros.length}`));
  }
  return { where: partes.length ? `WHERE ${partes.join(' AND ')}` : '', parametros };
}

/**
 * Arma un UPDATE de una fila por id, solo con los campos definidos (undefined = no cambiar).
 * Si `conFecha` es true, también actualiza `actualizado_en`.
 */
export function construirUpdate(
  tabla: string,
  id: number,
  campos: Record<string, unknown>,
  conFecha: boolean,
): { sql: string; parametros: unknown[] } {
  const partes: string[] = [];
  const parametros: unknown[] = [];
  for (const [columna, valor] of Object.entries(campos)) {
    if (valor === undefined) continue;
    parametros.push(valor);
    partes.push(`${columna} = $${parametros.length}`);
  }
  if (conFecha) partes.push('actualizado_en = now()');
  // Sin cambios: se "actualiza" el id consigo mismo para devolver la fila tal como está.
  if (partes.length === 0) partes.push('id = id');
  parametros.push(id);
  return {
    sql: `UPDATE ${tabla} SET ${partes.join(', ')} WHERE id = $${parametros.length} RETURNING *`,
    parametros,
  };
}
