/**
 * Base de datos: PostgreSQL. Hay dos formas de abrirla, con el mismo SQL y los mismos repositorios:
 *
 * - Con `url` (DATABASE_URL de Neon): PostgreSQL real con node-postgres y un pool de conexiones,
 *   el driver que Neon recomienda para un servidor Node que corre todo el tiempo.
 * - Sin `url` (o "memoria"): PostgreSQL en memoria con PGlite, el mismo motor compilado a
 *   WebAssembly. Cada apertura es una base nueva y vacía: la usan las pruebas de integración y
 *   `npm run dev:pruebas`, sin red y sin tocar los datos de Neon.
 *
 * Al abrir se aplican las migraciones pendientes. En Neon se aplican por la conexión directa (sin
 * pooler), como recomienda Neon para cambios de esquema.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { abrirPostgresEnMemoria } from './postgresEnMemoria';
import { abrirPostgresNeon } from './postgresNeon';

/** Lo único que necesitan los repositorios: poder ejecutar una consulta con parámetros $1, $2... */
export interface EjecutorSql {
  query<T>(sql: string, parametros?: unknown[]): Promise<{ rows: T[] }>;
}

/** Ejecutor que además corre un script de varias sentencias sin parámetros (migraciones). */
export interface Ejecutor extends EjecutorSql {
  ejecutarScript(script: string): Promise<void>;
}

export interface BaseDeDatos {
  /** Para consultas sueltas, fuera de una transacción. */
  readonly sql: Ejecutor;
  /**
   * Ejecuta `trabajo` en UNA transacción: si lanza un error se hace ROLLBACK y no queda nada a
   * medias (consigna §11, consistencia). Dentro de `trabajo` se usa solo el ejecutor recibido.
   */
  transaccion<T>(trabajo: (sql: Ejecutor) => Promise<T>): Promise<T>;
  cerrar(): Promise<void>;
}

export interface OpcionesBaseDeDatos {
  /** Conexión con pooler (DATABASE_URL). Vacía o "memoria" => PostgreSQL en memoria. */
  url?: string;
  /** Conexión directa, sin pooler (DATABASE_URL_UNPOOLED), para las migraciones. */
  urlDirecta?: string;
}

const CARPETA_MIGRACIONES = fileURLToPath(new URL('./migraciones/', import.meta.url));

export async function abrirBaseDeDatos(opciones: OpcionesBaseDeDatos = {}): Promise<BaseDeDatos> {
  if (esEnMemoria(opciones.url)) {
    const bd = await abrirPostgresEnMemoria();
    await aplicarMigraciones(bd);
    return bd;
  }
  const url = opciones.url?.trim() ?? '';
  const directa = abrirPostgresNeon(opciones.urlDirecta?.trim() || url);
  try {
    await aplicarMigraciones(directa);
  } finally {
    await directa.cerrar();
  }
  return abrirPostgresNeon(url);
}

/** true si la URL indica "base en memoria": vacía, no definida o la palabra "memoria". */
export function esEnMemoria(url: string | undefined): boolean {
  const texto = url?.trim().toLowerCase() ?? '';
  return texto === '' || texto === 'memoria';
}

/**
 * Borra TODAS las tablas (esquema y datos, incluida la de migraciones) y vuelve a aplicar las
 * migraciones: la base queda como recién creada. Lo usa `npm run db:reset`; sirve también si tu
 * rama de Neon tiene el esquema de una versión anterior del proyecto.
 */
export async function recrearEsquema(bd: BaseDeDatos): Promise<void> {
  await bd.sql.ejecutarScript(`DO $$
    DECLARE tabla TEXT;
    BEGIN
      FOR tabla IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', tabla);
      END LOOP;
    END $$`);
  await aplicarMigraciones(bd);
}

/**
 * Aplica, en orden, los archivos .sql de la carpeta migraciones que todavía no se aplicaron.
 * Cada migración corre en su propia transacción.
 */
export async function aplicarMigraciones(bd: BaseDeDatos): Promise<string[]> {
  await bd.sql.ejecutarScript(`CREATE TABLE IF NOT EXISTS migraciones (
    nombre      TEXT PRIMARY KEY,
    aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  const { rows } = await bd.sql.query<{ nombre: string }>('SELECT nombre FROM migraciones');
  const aplicadas = new Set(rows.map((fila) => fila.nombre));

  const pendientes = readdirSync(CARPETA_MIGRACIONES)
    .filter((archivo) => archivo.endsWith('.sql') && !aplicadas.has(archivo))
    .sort();

  for (const archivo of pendientes) {
    const script = readFileSync(CARPETA_MIGRACIONES + archivo, 'utf8');
    await bd.transaccion(async (sql) => {
      await sql.ejecutarScript(script);
      await sql.query('INSERT INTO migraciones (nombre) VALUES ($1)', [archivo]);
    });
  }
  return pendientes;
}
