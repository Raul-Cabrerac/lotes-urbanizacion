import type { RepositorioProyectos } from '../../../aplicacion/puertos';
import { armarPagina } from '../../../dominio/paginacion';
import { OPERACIONES_PROYECTO } from '../../../dominio/proyecto';
import { construirUpdate, consultarPagina, transicionarSi, type Consultas } from './consultas';
import { aProyecto } from './conversiones';
import type { FilaProyecto } from './filas';

const SQL_PROYECTOS_EN_ESTADOS = 'SELECT * FROM proyectos WHERE estado = ANY($1)';
/** Del más nuevo al más viejo. */
const ORDEN_PROYECTOS = 'creado_en DESC, id DESC';

export function crearRepositorioProyectos(bd: Consultas): RepositorioProyectos {
  return {
    async listar(estados) {
      const filas = await bd.filas<FilaProyecto>(`${SQL_PROYECTOS_EN_ESTADOS} ORDER BY ${ORDEN_PROYECTOS}`, [[...estados]]);
      return filas.map(aProyecto);
    },

    async listarPagina(estados, paginacion) {
      const { filas, total } = await consultarPagina<FilaProyecto>(
        bd,
        SQL_PROYECTOS_EN_ESTADOS,
        [[...estados]],
        ORDEN_PROYECTOS,
        paginacion,
      );
      return armarPagina(filas.map(aProyecto), total, paginacion);
    },

    async buscarPorId(id) {
      const fila = await bd.fila<FilaProyecto>('SELECT * FROM proyectos WHERE id = $1', [id]);
      return fila && aProyecto(fila);
    },

    async bloquearPorId(id) {
      await bd.filas('SELECT id FROM proyectos WHERE id = $1 FOR UPDATE', [id]);
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
          limite,
        },
      );
      return aProyecto(await bd.filaObligatoria<FilaProyecto>(sql, parametros));
    },

    async publicarSiBorrador(id) {
      const fila = await transicionarSi<FilaProyecto>(bd, 'proyectos', id, OPERACIONES_PROYECTO.publicar);
      return fila && aProyecto(fila);
    },
  };
}
