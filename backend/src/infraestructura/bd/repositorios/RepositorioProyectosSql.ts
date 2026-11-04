import type { RepositorioProyectos } from '../../../aplicacion/puertos';
import { construirUpdate, type Consultas } from './consultas';
import { aProyecto } from './conversiones';
import type { FilaProyecto } from './filas';

export function crearRepositorioProyectos(bd: Consultas): RepositorioProyectos {
  return {
    async listar(soloPublicados) {
      const filtro = soloPublicados ? "WHERE estado = 'PUBLICADO'" : '';
      const filas = await bd.filas<FilaProyecto>(
        `SELECT * FROM proyectos ${filtro} ORDER BY creado_en DESC, id DESC`,
      );
      return filas.map(aProyecto);
    },

    async buscarPorId(id) {
      const fila = await bd.fila<FilaProyecto>('SELECT * FROM proyectos WHERE id = $1', [id]);
      return fila && aProyecto(fila);
    },

    async crear({ nombre, descripcion, ubicacion }) {
      const fila = await bd.filaObligatoria<FilaProyecto>(
        'INSERT INTO proyectos (nombre, descripcion, ubicacion) VALUES ($1, $2, $3) RETURNING *',
        [nombre, descripcion, ubicacion],
      );
      return aProyecto(fila);
    },

    async actualizar(id, cambios) {
      // limite: undefined = no cambiar; null = quitar el perímetro; polígono = guardarlo.
      const limite =
        cambios.limite === undefined ? undefined : cambios.limite && JSON.stringify(cambios.limite);
      const { sql, parametros } = construirUpdate(
        'proyectos',
        id,
        {
          nombre: cambios.nombre,
          descripcion: cambios.descripcion,
          ubicacion: cambios.ubicacion,
          estado: cambios.estado,
          limite,
        },
        true,
      );
      return aProyecto(await bd.filaObligatoria<FilaProyecto>(sql, parametros));
    },
  };
}
