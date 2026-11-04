import { ErrorNoEncontrado } from '../../dominio/errores';
import { normalizarPoligono } from '../../dominio/geometria';
import { conteoVacio, resumirLotes, validarProyectoPublicable } from '../../dominio/proyecto';
import type { Proyecto } from '../../dominio/tipos';
import type { DatosProyecto, UnidadDeTrabajo, UsuarioActual } from '../puertos';

/** Gestión de proyectos de urbanización (consigna, sección 3). */
export class ProyectoServicio {
  constructor(private readonly uow: UnidadDeTrabajo) {}

  /** El administrador ve todos los proyectos; los asesores solo los PUBLICADOS. */
  async listar(usuario: UsuarioActual) {
    const proyectos = await this.uow.repos.proyectos.listar(usuario.rol !== 'ADMIN');
    const conteos = await this.uow.repos.lotes.contarPorEstado();
    return proyectos.map((proyecto) => {
      const lotesPorEstado = conteoVacio();
      for (const c of conteos.filter((c) => c.proyectoId === proyecto.id)) lotesPorEstado[c.estado] = c.cantidad;
      const totalLotes = Object.values(lotesPorEstado).reduce((a, b) => a + b, 0);
      return { ...proyecto, totalLotes, lotesPorEstado };
    });
  }

  async obtener(id: number, usuario: UsuarioActual) {
    const proyecto = await this.buscarVisible(id, usuario);
    const lotes = await this.uow.repos.lotes.listarPorProyecto(id);
    return { ...proyecto, resumen: resumirLotes(lotes) };
  }

  crear(datos: DatosProyecto): Promise<Proyecto> {
    return this.uow.repos.proyectos.crear(datos);
  }

  async actualizar(id: number, datos: Partial<DatosProyecto>): Promise<Proyecto> {
    await this.buscarExistente(id);
    return this.uow.repos.proyectos.actualizar(id, datos);
  }

  /** Define (o quita, con null) el perímetro del proyecto que se dibuja en el mapa. */
  async definirLimite(id: number, geometria: unknown | null): Promise<Proyecto> {
    await this.buscarExistente(id);
    const limite = geometria === null ? null : normalizarPoligono(geometria);
    return this.uow.repos.proyectos.actualizar(id, { limite });
  }

  /** Paso 5 del flujo de la consigna: publicar el mapa para el equipo comercial. */
  async publicar(id: number): Promise<Proyecto> {
    const proyecto = await this.buscarExistente(id);
    const lotes = await this.uow.repos.lotes.listarPorProyecto(id);
    validarProyectoPublicable(proyecto, lotes.length);
    return this.uow.repos.proyectos.actualizar(id, { estado: 'PUBLICADO' });
  }

  async buscarExistente(id: number): Promise<Proyecto> {
    const proyecto = await this.uow.repos.proyectos.buscarPorId(id);
    if (!proyecto) throw new ErrorNoEncontrado('Proyecto no encontrado.');
    return proyecto;
  }

  /** Un proyecto en BORRADOR solo lo ve el administrador. */
  async buscarVisible(id: number, usuario: UsuarioActual): Promise<Proyecto> {
    const proyecto = await this.buscarExistente(id);
    if (proyecto.estado !== 'PUBLICADO' && usuario.rol !== 'ADMIN') {
      throw new ErrorNoEncontrado('Proyecto no encontrado.');
    }
    return proyecto;
  }
}
