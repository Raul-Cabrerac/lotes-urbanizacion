import { ErrorNoEncontrado } from '../../dominio/errores';
import { normalizarPoligono } from '../../dominio/geometria';
import { estadosVisibles } from '../../dominio/permisos';
import { conteoDelProyecto, proyectoYaPublicado, resumirLotes, validarProyectoPublicable } from '../../dominio/proyecto';
import type { Proyecto } from '../../dominio/tipos';
import type { DatosProyecto, UnidadDeTrabajo, UsuarioActual } from '../puertos';

/** Gestión de proyectos de urbanización (consigna, sección 3). */
export class ProyectoServicio {
  constructor(private readonly uow: UnidadDeTrabajo) {}

  /** El administrador ve todos los proyectos; los asesores solo los PUBLICADOS. */
  async listar(usuario: UsuarioActual) {
    const proyectos = await this.uow.repos.proyectos.listar(estadosVisibles(usuario.rol));
    const conteos = await this.uow.repos.lotes.contarPorEstado();
    return proyectos.map((proyecto) => {
      const { total: totalLotes, porEstado: lotesPorEstado } = conteoDelProyecto(conteos, proyecto.id);
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
    return this.uow.transaccion(async (repos) => {
      await repos.proyectos.bloquearPorId(id);
      const proyecto = await repos.proyectos.buscarPorId(id);
      if (!proyecto) throw new ErrorNoEncontrado('Proyecto no encontrado.');
      const lotes = await repos.lotes.listarPorProyecto(id);
      validarProyectoPublicable(proyecto, lotes.length);
      const publicado = await repos.proyectos.publicarSiBorrador(id);
      if (!publicado) throw proyectoYaPublicado();
      return publicado;
    });
  }

  async buscarExistente(id: number): Promise<Proyecto> {
    const proyecto = await this.uow.repos.proyectos.buscarPorId(id);
    if (!proyecto) throw new ErrorNoEncontrado('Proyecto no encontrado.');
    return proyecto;
  }

  /** Un proyecto en BORRADOR solo lo ve el administrador. */
  async buscarVisible(id: number, usuario: UsuarioActual): Promise<Proyecto> {
    const proyecto = await this.buscarExistente(id);
    if (!estadosVisibles(usuario.rol).includes(proyecto.estado)) {
      throw new ErrorNoEncontrado('Proyecto no encontrado.');
    }
    return proyecto;
  }
}
