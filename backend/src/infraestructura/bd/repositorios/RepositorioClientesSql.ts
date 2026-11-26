import type { RepositorioClientes } from '../../../aplicacion/puertos';
import { armarPagina } from '../../../dominio/paginacion';
import { construirUpdate, consultarPagina, type Consultas } from './consultas';
import { aCliente } from './conversiones';
import type { FilaCliente } from './filas';

/** Por nombre; el id desempata a dos clientes con el mismo nombre. */
const ORDEN_CLIENTES = 'nombre_completo, id';

/** Todos los clientes o, con `busqueda`, los que la contienen en algún dato de contacto. */
function consultaClientes(busqueda: string | undefined): { sql: string; parametros: unknown[] } {
  const texto = busqueda?.trim();
  if (!texto) return { sql: 'SELECT * FROM clientes', parametros: [] };
  return {
    sql: `SELECT * FROM clientes
         WHERE nombre_completo ILIKE $1 OR documento ILIKE $1 OR telefono ILIKE $1 OR email ILIKE $1`,
    parametros: [`%${texto}%`],
  };
}

export function crearRepositorioClientes(bd: Consultas): RepositorioClientes {
  return {
    async listar(busqueda) {
      const { sql, parametros } = consultaClientes(busqueda);
      const filas = await bd.filas<FilaCliente>(`${sql} ORDER BY ${ORDEN_CLIENTES}`, parametros);
      return filas.map(aCliente);
    },

    async listarPagina(busqueda, paginacion) {
      const { sql, parametros } = consultaClientes(busqueda);
      const { filas, total } = await consultarPagina<FilaCliente>(bd, sql, parametros, ORDEN_CLIENTES, paginacion);
      return armarPagina(filas.map(aCliente), total, paginacion);
    },

    async buscarPorId(id) {
      const fila = await bd.fila<FilaCliente>('SELECT * FROM clientes WHERE id = $1', [id]);
      return fila && aCliente(fila);
    },

    async buscarPorDocumento(documento) {
      const fila = await bd.fila<FilaCliente>('SELECT * FROM clientes WHERE documento = $1', [
        documento,
      ]);
      return fila && aCliente(fila);
    },

    async crear(d) {
      const fila = await bd.filaObligatoria<FilaCliente>(
        `INSERT INTO clientes (nombre_completo, documento, telefono, email, direccion)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [d.nombreCompleto, d.documento, d.telefono, d.email, d.direccion],
      );
      return aCliente(fila);
    },

    async actualizar(id, c) {
      const { sql, parametros } = construirUpdate(
        'clientes',
        id,
        {
          nombre_completo: c.nombreCompleto,
          documento: c.documento,
          telefono: c.telefono,
          email: c.email,
          direccion: c.direccion,
        },
      );
      return aCliente(
        await bd.filaObligatoria<FilaCliente>(sql, parametros),
      );
    },
  };
}
