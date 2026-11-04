import type { RepositorioClientes } from '../../../aplicacion/puertos';
import { construirUpdate, type Consultas } from './consultas';
import { aCliente } from './conversiones';
import type { FilaCliente } from './filas';

export function crearRepositorioClientes(bd: Consultas): RepositorioClientes {
  return {
    async listar(busqueda) {
      const texto = busqueda?.trim();
      if (!texto) {
        const filas = await bd.filas<FilaCliente>('SELECT * FROM clientes ORDER BY nombre_completo');
        return filas.map(aCliente);
      }
      const filas = await bd.filas<FilaCliente>(
        `SELECT * FROM clientes
         WHERE nombre_completo ILIKE $1 OR documento ILIKE $1 OR telefono ILIKE $1 OR email ILIKE $1
         ORDER BY nombre_completo`,
        [`%${texto}%`],
      );
      return filas.map(aCliente);
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
        false,
      );
      return aCliente(await bd.filaObligatoria<FilaCliente>(sql, parametros));
    },
  };
}
