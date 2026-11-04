/**
 * Reglas de los proyectos de urbanización (consigna, sección 3).
 */
import { sumar } from './dinero';
import { ErrorConflicto, ErrorReglaNegocio } from './errores';
import { ESTADOS_LOTE, type EstadoLote, type EstadoProyecto } from './tipos';

/** Un proyecto se publica (visible para asesores) una sola vez y solo si ya tiene lotes. */
export function validarProyectoPublicable(proyecto: { estado: EstadoProyecto }, cantidadLotes: number): void {
  if (proyecto.estado === 'PUBLICADO') {
    throw new ErrorConflicto('PROYECTO_YA_PUBLICADO', 'El proyecto ya está publicado.');
  }
  if (cantidadLotes === 0) {
    throw new ErrorReglaNegocio(
      'PROYECTO_SIN_LOTES',
      'Cargue un KML o dibuje al menos un lote antes de publicar el proyecto.',
    );
  }
}

export type ConteoPorEstado = Record<EstadoLote, number>;

export interface ResumenManzano {
  manzano: string;
  etapa: string;
  total: number;
  porEstado: ConteoPorEstado;
}

export interface ResumenLotes {
  total: number;
  porEstado: ConteoPorEstado;
  superficieTotalM2: number;
  valorDisponible: number;
  etapas: string[];
  manzanos: string[];
  porManzano: ResumenManzano[];
}

export function conteoVacio(): ConteoPorEstado {
  return Object.fromEntries(ESTADOS_LOTE.map((estado) => [estado, 0])) as ConteoPorEstado;
}

/** Resume los lotes de un proyecto por estado y por manzano/etapa. */
export function resumirLotes(
  lotes: { estado: EstadoLote; manzano: string; etapa: string; superficieM2: number; precio: number }[],
): ResumenLotes {
  const porEstado = conteoVacio();
  const manzanos = new Map<string, ResumenManzano>();

  for (const lote of lotes) {
    porEstado[lote.estado]++;
    const clave = `${lote.etapa}|${lote.manzano}`;
    const grupo = manzanos.get(clave) ?? { manzano: lote.manzano, etapa: lote.etapa, total: 0, porEstado: conteoVacio() };
    grupo.total++;
    grupo.porEstado[lote.estado]++;
    manzanos.set(clave, grupo);
  }

  const ordenar = (a: string, b: string) => a.localeCompare(b, 'es', { numeric: true });
  return {
    total: lotes.length,
    porEstado,
    superficieTotalM2: sumar(...lotes.map((l) => l.superficieM2)),
    valorDisponible: sumar(...lotes.filter((l) => l.estado === 'DISPONIBLE').map((l) => l.precio)),
    etapas: [...new Set(lotes.map((l) => l.etapa).filter(Boolean))].sort(ordenar),
    manzanos: [...new Set(lotes.map((l) => l.manzano).filter(Boolean))].sort(ordenar),
    porManzano: [...manzanos.values()].sort((a, b) => ordenar(a.etapa, b.etapa) || ordenar(a.manzano, b.manzano)),
  };
}
