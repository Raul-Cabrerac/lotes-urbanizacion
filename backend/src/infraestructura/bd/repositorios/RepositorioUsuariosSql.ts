import type { RepositorioUsuarios } from '../../../aplicacion/puertos';
import type { Consultas } from './consultas';
import { aUsuario } from './conversiones';
import type { FilaUsuario } from './filas';

export function crearRepositorioUsuarios(bd: Consultas): RepositorioUsuarios {
  return {
    async listar() {
      const filas = await bd.filas<FilaUsuario & { cliente_nombre: string | null }>(
        `SELECT u.*, c.nombre_completo AS cliente_nombre
         FROM usuarios u LEFT JOIN clientes c ON c.id = u.cliente_id
         ORDER BY u.rol, u.nombre`,
      );
      return filas.map((f) => ({
        ...aUsuario(f),
        cliente: f.cliente_id ? { id: f.cliente_id, nombre: f.cliente_nombre ?? '' } : null,
      }));
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
