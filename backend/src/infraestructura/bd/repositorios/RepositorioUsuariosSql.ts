import type { RepositorioUsuarios, UsuarioListado } from '../../../aplicacion/puertos';
import { armarPagina } from '../../../dominio/paginacion';
import { consultarPagina, type Consultas } from './consultas';
import { aUsuario } from './conversiones';
import type { FilaUsuario } from './filas';

type FilaUsuarioListado = FilaUsuario & { cliente_nombre: string | null };

/** Usuarios con el nombre del cliente vinculado (los del portal). */
const SQL_USUARIOS = `
  SELECT u.*, c.nombre_completo AS cliente_nombre
  FROM usuarios u LEFT JOIN clientes c ON c.id = u.cliente_id`;

/** Por rol y nombre; el id desempata. */
const ORDEN_USUARIOS = 'u.rol, u.nombre, u.id';

function aUsuarioListado(f: FilaUsuarioListado): UsuarioListado {
  return { ...aUsuario(f), cliente: f.cliente_id ? { id: f.cliente_id, nombre: f.cliente_nombre ?? '' } : null };
}

export function crearRepositorioUsuarios(bd: Consultas): RepositorioUsuarios {
  return {
    async listar() {
      const filas = await bd.filas<FilaUsuarioListado>(`${SQL_USUARIOS} ORDER BY ${ORDEN_USUARIOS}`);
      return filas.map(aUsuarioListado);
    },

    async listarPagina(paginacion) {
      const { filas, total } = await consultarPagina<FilaUsuarioListado>(bd, SQL_USUARIOS, [], ORDEN_USUARIOS, paginacion);
      return armarPagina(filas.map(aUsuarioListado), total, paginacion);
    },

    async buscarPorId(id) {
      const fila = await bd.fila<FilaUsuario>('SELECT * FROM usuarios WHERE id = $1', [id]);
      return fila && aUsuario(fila);
    },

    async buscarPorEmail(email) {
      const fila = await bd.fila<FilaUsuario>('SELECT * FROM usuarios WHERE email = $1', [email]);
      return fila && { ...aUsuario(fila), passwordHash: fila.password_hash };
    },

    async buscarPorClienteId(clienteId) {
      const fila = await bd.fila<FilaUsuario>('SELECT * FROM usuarios WHERE cliente_id = $1', [
        clienteId,
      ]);
      return fila && aUsuario(fila);
    },

    async crear(d) {
      const fila = await bd.filaObligatoria<FilaUsuario>(
        `INSERT INTO usuarios (nombre, email, password_hash, rol, cliente_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [d.nombre, d.email, d.passwordHash, d.rol, d.clienteId],
      );
      return aUsuario(fila);
    },

    async actualizar(id, { activo }) {
      const fila = await bd.filaObligatoria<FilaUsuario>(
        'UPDATE usuarios SET activo = COALESCE($1, activo) WHERE id = $2 RETURNING *',
        [activo ?? null, id],
      );
      return aUsuario(fila);
    },
  };
}
