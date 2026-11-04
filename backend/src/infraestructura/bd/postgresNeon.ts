/**
 * PostgreSQL real en Neon con node-postgres (`pg`). Un pool mantiene abiertas unas pocas
 * conexiones y las reutiliza entre peticiones. Cada transacción toma una conexión propia: dos
 * peticiones simultáneas nunca comparten transacción, y PostgreSQL bloquea la fila del lote que
 * se está reservando o vendiendo.
 */
import pg from 'pg';
import type { BaseDeDatos, Ejecutor } from './baseDeDatos';

const MAXIMO_CONEXIONES = 10;

// node-postgres entrega DATE como Date (con zona horaria) y NUMERIC o BIGINT como texto. El dominio
// usa fechas 'AAAA-MM-DD' y montos number, así que se fijan esas conversiones una sola vez.
pg.types.setTypeParser(pg.types.builtins.DATE, (valor: string) => valor);
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (valor: string) => Number(valor));
pg.types.setTypeParser(pg.types.builtins.INT8, (valor: string) => Number(valor));

export function abrirPostgresNeon(url: string): BaseDeDatos {
  const pool = new pg.Pool({ connectionString: conSslVerificado(url), max: MAXIMO_CONEXIONES });
  // Neon suspende la base cuando nadie la usa y cierra las conexiones inactivas. El pool las
  // descarta y abre otras; sin este manejador, ese aviso detendría el servidor.
  pool.on('error', (error) => {
    console.error('PostgreSQL cerró una conexión inactiva:', error.message);
  });

  return {
    sql: ejecutorDe(pool),
    async transaccion(trabajo) {
      const cliente = await pool.connect();
      try {
        await cliente.query('BEGIN');
        const resultado = await trabajo(ejecutorDe(cliente));
        await cliente.query('COMMIT');
        return resultado;
      } catch (error) {
        await cliente.query('ROLLBACK');
        throw error;
      } finally {
        cliente.release();
      }
    },
    cerrar: () => pool.end(),
  };
}

function ejecutorDe(destino: pg.Pool | pg.PoolClient): Ejecutor {
  return {
    async query(sql, parametros) {
      const { rows } = await destino.query(sql, parametros);
      return { rows };
    },
    // Sin parámetros, node-postgres usa el protocolo simple, que admite varias sentencias.
    async ejecutarScript(script) {
      await destino.query(script);
    },
  };
}

/**
 * Neon entrega `sslmode=require`, que node-postgres hoy trata como `verify-full` (verifica el
 * certificado) avisándolo en cada arranque. Se pide `verify-full` explícito: misma seguridad, sin
 * aviso, y no se debilita cuando node-postgres adopte la semántica de libpq.
 */
function conSslVerificado(url: string): string {
  const direccion = new URL(url);
  if (direccion.searchParams.get('sslmode') === 'require') {
    direccion.searchParams.set('sslmode', 'verify-full');
  }
  return direccion.toString();
}
