/**
 * Carreras simuladas (consigna §7): "otro usuario" escribe en la base justo antes o justo después
 * de una consulta del servicio, para probar los UPDATE condicionales, los bloqueos y los errores de
 * unicidad de forma determinista.
 *
 * PGlite atiende una sola conexión: la escritura del otro usuario corre con el mismo ejecutor que
 * la consulta interceptada (dentro de su transacción), como si se hubiera confirmado un instante
 * antes. No prueba la exclusión real entre dos conexiones (la que da FOR UPDATE en PostgreSQL).
 */
import { onTestFinished } from 'vitest';
import type { EjecutorSql } from '../../src/infraestructura/bd/baseDeDatos';
import type { AppInterceptable, GanchoSql } from './app';
import { GEOMETRIA_LOTE } from './dobles';

export { crearAppInterceptable, type AppInterceptable } from './app';

/**
 * Consultas de los repositorios SQL (src/infraestructura/bd/repositorios) que las pruebas
 * interceptan, con su texto exacto (los espacios y saltos de línea se normalizan). Si un
 * repositorio cambia una de ellas, el gancho no se dispara y la prueba falla avisándolo: se corrige
 * aquí, en un solo lugar.
 */
export const CONSULTAS = {
  /** RepositorioLotesSql.bloquearPorId */
  bloquearLote: 'SELECT id FROM lotes WHERE id = $1 FOR UPDATE',
  /** RepositorioLotesSql.buscarPorId */
  buscarLote: 'SELECT * FROM lotes WHERE id = $1',
  /** RepositorioLotesSql.buscarPorCodigo */
  buscarLotePorCodigo: 'SELECT * FROM lotes WHERE proyecto_id = $1 AND codigo = $2',
  /** RepositorioProyectosSql.bloquearPorId */
  bloquearProyecto: 'SELECT id FROM proyectos WHERE id = $1 FOR UPDATE',
  /** RepositorioClientesSql.buscarPorDocumento */
  buscarClientePorDocumento: 'SELECT * FROM clientes WHERE documento = $1',
  /** RepositorioUsuariosSql.buscarPorEmail */
  buscarUsuarioPorEmail: 'SELECT * FROM usuarios WHERE email = $1',
  /** RepositorioUsuariosSql.buscarPorClienteId */
  buscarUsuarioPorCliente: 'SELECT * FROM usuarios WHERE cliente_id = $1',
  /** RepositorioPagosSql.buscarPorId */
  buscarPago: 'SELECT pg.*, cu.venta_id FROM pagos pg JOIN cuotas cu ON cu.id = pg.cuota_id WHERE pg.id = $1',
} as const;

export type ConsultaInterceptada = (typeof CONSULTAS)[keyof typeof CONSULTAS];

export type Intercalado = ({ antesDe: ConsultaInterceptada } | { despuesDe: ConsultaInterceptada }) & {
  /** Si se indica, solo cuenta la consulta cuyos primeros parámetros son estos (p. ej. el id del lote). */
  parametros?: unknown[];
  /** Lo que hace el otro usuario: una de las escrituras de `otroUsuario`. */
  accion: (sql: EjecutorSql) => Promise<unknown>;
};

const normalizar = (sql: string) => sql.replace(/\s+/g, ' ').trim();

/**
 * Hace que el otro usuario actúe UNA vez, antes o después de la primera consulta que coincida.
 * Si al terminar la prueba no actuó (la consulta no se ejecutó o cambió su texto), la prueba falla:
 * así una carrera que nunca ocurrió no puede dar un verde.
 */
export function intercalarUnaVez(app: AppInterceptable, intercalado: Intercalado): void {
  const [momento, consulta] =
    'antesDe' in intercalado ? (['antes', intercalado.antesDe] as const) : (['despues', intercalado.despuesDe] as const);
  const parametrosEsperados = intercalado.parametros ?? [];
  const gancho: GanchoSql = {
    momento,
    coincide: (texto, parametros) =>
      normalizar(texto) === consulta && parametrosEsperados.every((valor, i) => parametros?.[i] === valor),
    accion: intercalado.accion,
    disparado: false,
  };
  app.ganchos.push(gancho);
  onTestFinished(() => {
    if (!gancho.disparado) {
      throw new Error(
        `El otro usuario nunca actuó: no se ejecutó la consulta "${consulta}"` +
          `${parametrosEsperados.length ? ` con los parámetros ${JSON.stringify(parametrosEsperados)}` : ''}. ` +
          'Revise CONSULTAS en tests/apoyo/carreras.ts.',
      );
    }
  });
}

/** Escrituras del otro usuario, en SQL directo (no pasan por los servicios ni por sus reglas). */
export const otroUsuario = {
  eliminaLote: (sql: EjecutorSql, loteId: number) => sql.query('DELETE FROM lotes WHERE id = $1', [loteId]),

  /** Deja el lote en Bs 0 (sin precio). */
  quitaPrecioDelLote: (sql: EjecutorSql, loteId: number) => sql.query('UPDATE lotes SET precio = 0 WHERE id = $1', [loteId]),

  reservaLote: async (sql: EjecutorSql, reserva: { loteId: number; clienteId: number; asesorId: number }) => {
    await sql.query("UPDATE lotes SET estado = 'RESERVADO' WHERE id = $1", [reserva.loteId]);
    await sql.query('INSERT INTO reservas (lote_id, cliente_id, asesor_id) VALUES ($1, $2, $3)', [
      reserva.loteId,
      reserva.clienteId,
      reserva.asesorId,
    ]);
  },

  creaLote: (sql: EjecutorSql, proyectoId: number, codigo: string) =>
    sql.query(
      `INSERT INTO lotes (proyecto_id, codigo, manzano, etapa, superficie_m2, dimensiones, precio, geometria)
       VALUES ($1, $2, 'A', 'Etapa 1', 360, '12 x 30 m', 50000, $3)`,
      [proyectoId, codigo, JSON.stringify(GEOMETRIA_LOTE)],
    ),

  publicaProyecto: (sql: EjecutorSql, proyectoId: number) =>
    sql.query("UPDATE proyectos SET estado = 'PUBLICADO' WHERE id = $1", [proyectoId]),

  anulaVenta: (sql: EjecutorSql, ventaId: number) =>
    sql.query("UPDATE ventas SET estado = 'ANULADA', motivo_anulacion = 'Anulada en carrera' WHERE id = $1", [ventaId]),

  registraCliente: (sql: EjecutorSql, documento: string) =>
    sql.query(
      "INSERT INTO clientes (nombre_completo, documento, telefono, email, direccion) VALUES ('Otro', $1, '70000001', '', '')",
      [documento],
    ),

  registraAsesor: (sql: EjecutorSql, email: string) =>
    sql.query(
      "INSERT INTO usuarios (nombre, email, password_hash, rol, cliente_id) VALUES ('Otro', $1, 'hash', 'ASESOR', NULL)",
      [email],
    ),

  /** Crea un usuario del portal vinculado al cliente. */
  vinculaUsuarioAlCliente: (sql: EjecutorSql, clienteId: number) =>
    sql.query(
      "INSERT INTO usuarios (nombre, email, password_hash, rol, cliente_id) VALUES ('Otro', 'otro.portal@lotes.bo', 'hash', 'CLIENTE', $1)",
      [clienteId],
    ),
};
