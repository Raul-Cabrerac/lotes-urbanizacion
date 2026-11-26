/**
 * Ayudantes que comparten todos los repositorios SQL.
 *
 * Todas las consultas usan parámetros ($1, $2...) y nunca concatenan valores dentro del SQL: así
 * se evita la inyección SQL.
 */
import { ErrorAplicacion, ErrorConflicto, ErrorReglaNegocio, type CodigoDe } from '../../../dominio/errores';
import { calcularDesplazamiento, type Paginacion } from '../../../dominio/paginacion';
import type { Transicion } from '../../../dominio/transiciones';
import type { EjecutorSql } from '../baseDeDatos';

/**
 * Restricciones únicas del esquema y el error que significa chocar con cada una. Es la segunda
 * barrera para dos operaciones simultáneas (por ejemplo, dos asesores que reservan el mismo lote):
 * los servicios ya validan antes, pero solo la base lo garantiza.
 */
const RESTRICCIONES_UNICAS: Readonly<Record<string, { codigo: CodigoDe<'conflicto'>; mensaje: string }>> = {
  clientes_documento_key: {
    codigo: 'DOCUMENTO_DUPLICADO',
    mensaje: 'Ya existe un cliente con ese documento de identidad.',
  },
  lotes_proyecto_id_codigo_key: {
    codigo: 'CODIGO_LOTE_DUPLICADO',
    mensaje: 'Ya existe un lote con ese código en este proyecto.',
  },
  reservas_una_activa_por_lote: {
    codigo: 'LOTE_NO_DISPONIBLE',
    mensaje: 'El lote ya tiene una reserva activa.',
  },
  usuarios_email_key: { codigo: 'EMAIL_DUPLICADO', mensaje: 'Ya existe un usuario con ese correo electrónico.' },
  usuarios_cliente_id_key: {
    codigo: 'CLIENTE_YA_TIENE_USUARIO',
    mensaje: 'Ese cliente ya tiene un usuario para el portal.',
  },
  ventas_una_vigente_por_lote: {
    codigo: 'LOTE_NO_DISPONIBLE',
    mensaje: 'El lote ya tiene una venta vigente.',
  },
};

/** Otros rechazos de PostgreSQL (SQLSTATE) que el dominio no validó: un 4xx claro en vez de un 500. */
const RECHAZOS_POSTGRES: Readonly<Record<string, () => ErrorAplicacion>> = {
  '23505': () => new ErrorConflicto('REGISTRO_DUPLICADO', 'Ya existe un registro con esos datos.'),
  '23503': () =>
    new ErrorConflicto('REGISTRO_RELACIONADO', 'La operación hace referencia a un registro inexistente o en uso.'),
  '23514': () =>
    new ErrorReglaNegocio('DATO_FUERA_DE_RANGO', 'Algún valor no cumple las restricciones de la base de datos.'),
  '22003': () => new ErrorReglaNegocio('DATO_FUERA_DE_RANGO', 'Algún número es demasiado grande.'),
  '22001': () => new ErrorReglaNegocio('DATO_FUERA_DE_RANGO', 'Algún texto es demasiado largo.'),
};

/** Traduce un error de PostgreSQL al error de la aplicación que le corresponde; otros siguen igual. */
function traducirErrorPostgres(error: unknown): unknown {
  const pg = error as { code?: unknown; severity?: unknown; constraint?: unknown } | null;
  if (typeof pg?.code !== 'string') return error;
  const unica = pg.code === '23505' && typeof pg.constraint === 'string' ? RESTRICCIONES_UNICAS[pg.constraint] : undefined;
  if (unica) return new ErrorConflicto(unica.codigo, unica.mensaje);
  const rechazo = typeof pg.severity === 'string' ? RECHAZOS_POSTGRES[pg.code] : undefined;
  return rechazo ? rechazo() : error;
}

/** Tablas con columna `actualizado_en`: todo UPDATE sobre ellas la pone al día. */
const TABLAS_CON_ACTUALIZADO_EN: ReadonlySet<string> = new Set(['proyectos', 'lotes']);

export interface Consultas {
  /** Ejecuta la consulta y devuelve todas las filas. */
  filas<T>(sql: string, parametros?: unknown[]): Promise<T[]>;
  /** Ejecuta la consulta y devuelve la primera fila, o null si no hay ninguna. */
  fila<T>(sql: string, parametros?: unknown[]): Promise<T | null>;
  /** Para INSERT/UPDATE ... RETURNING: la fila tiene que existir; si no, es un error del programa. */
  filaObligatoria<T>(sql: string, parametros?: unknown[]): Promise<T>;
}

export function crearConsultas(bd: EjecutorSql): Consultas {
  const filas = async <T>(sql: string, parametros: unknown[] = []) => {
    try {
      return (await bd.query<T>(sql, parametros)).rows;
    } catch (error) {
      throw traducirErrorPostgres(error);
    }
  };
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
 * Una página de un listado: cuenta las filas que cumplen el filtro (COUNT) y trae solo las de la
 * página pedida (LIMIT y OFFSET). `sql` es el SELECT con su WHERE y sin ORDER BY. El `orden` debe
 * terminar en el id: con un orden único, ninguna fila se repite ni se salta entre dos páginas.
 */
export async function consultarPagina<T>(
  bd: Consultas,
  sql: string,
  parametros: unknown[],
  orden: string,
  paginacion: Paginacion,
): Promise<{ filas: T[]; total: number }> {
  const conteo = await bd.fila<{ total: number | string }>(`SELECT COUNT(*) AS total FROM (${sql}) AS consulta`, parametros);
  const n = parametros.length;
  const filas = await bd.filas<T>(`${sql} ORDER BY ${orden} LIMIT $${n + 1} OFFSET $${n + 2}`, [
    ...parametros,
    paginacion.porPagina,
    calcularDesplazamiento(paginacion),
  ]);
  return { filas, total: Number(conteo?.total ?? 0) };
}

/** Arma un UPDATE de una fila por id, solo con los campos definidos (undefined = no cambiar). */
export function construirUpdate(
  tabla: string,
  id: number,
  campos: Record<string, unknown>,
): { sql: string; parametros: unknown[] } {
  const partes: string[] = [];
  const parametros: unknown[] = [];
  for (const [columna, valor] of Object.entries(campos)) {
    if (valor === undefined) continue;
    parametros.push(valor);
    partes.push(`${columna} = $${parametros.length}`);
  }
  if (TABLAS_CON_ACTUALIZADO_EN.has(tabla)) partes.push('actualizado_en = now()');
  // Sin cambios: se "actualiza" el id consigo mismo para devolver la fila tal como está.
  if (partes.length === 0) partes.push('id = id');
  parametros.push(id);
  return {
    sql: `UPDATE ${tabla} SET ${partes.join(', ')} WHERE id = $${parametros.length} RETURNING *`,
    parametros,
  };
}

/**
 * UPDATE condicional de estado (AGENTS.md §5, regla 5): pasa la fila al estado destino de la
 * transición solo si sigue en uno de sus estados de origen. Devuelve la fila actualizada, o null si
 * otra operación la cambió antes (el servicio responde 409).
 */
export function transicionarSi<T>(
  bd: Consultas,
  tabla: string,
  id: number,
  transicion: Transicion<string>,
  otrasColumnas: Record<string, unknown> = {},
): Promise<T | null> {
  const columnas = Object.entries({ estado: transicion.a, ...otrasColumnas });
  const asignaciones = columnas.map(([columna], i) => `${columna} = $${i + 1}`);
  if (TABLAS_CON_ACTUALIZADO_EN.has(tabla)) asignaciones.push('actualizado_en = now()');
  const n = columnas.length;
  return bd.fila<T>(
    `UPDATE ${tabla} SET ${asignaciones.join(', ')} WHERE id = $${n + 1} AND estado = ANY($${n + 2}) RETURNING *`,
    [...columnas.map(([, valor]) => valor), id, [...transicion.de]],
  );
}
