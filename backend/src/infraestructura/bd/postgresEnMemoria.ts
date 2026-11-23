/**
 * PostgreSQL en memoria con PGlite: el mismo motor de PostgreSQL compilado a WebAssembly. Cada
 * apertura es una base nueva y vacía. Lo usan las pruebas de integración y el modo pruebas de los
 * E2E (`npm run dev:pruebas`), así esas pruebas no dependen de la red ni tocan Neon.
 */
import { PGlite, type Transaction } from '@electric-sql/pglite';
import type { BaseDeDatos, Ejecutor } from './baseDeDatos';
import { CONVERSIONES_TIPOS } from './tiposPostgres';

export async function abrirPostgresEnMemoria(): Promise<BaseDeDatos> {
  const pglite = await PGlite.create({ parsers: CONVERSIONES_TIPOS });
  return {
    sql: ejecutorDe(pglite),
    // PGlite atiende una transacción a la vez: las demás consultas esperan su turno.
    transaccion: (trabajo) => pglite.transaction((transaccion) => trabajo(ejecutorDe(transaccion))),
    cerrar: () => pglite.close(),
  };
}

function ejecutorDe(destino: PGlite | Transaction): Ejecutor {
  return {
    async query<T>(sql: string, parametros?: unknown[]) {
      const { rows } = await destino.query<T>(sql, parametros);
      return { rows };
    },
    async ejecutarScript(script) {
      await destino.exec(script);
    },
  };
}
