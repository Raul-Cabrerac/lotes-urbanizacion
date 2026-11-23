/**
 * Dobles y datos fijos para las pruebas unitarias de servicios: la fecha de hoy, los usuarios, una
 * geometría válida, la unidad de trabajo falsa y una memoria mínima de lotes y reservas.
 *
 * Sin dependencias pesadas: no abre base de datos, no levanta Express ni usa bcrypt. Solo importa
 * reglas puras del dominio y el reloj fijo, así que también lo pueden usar las de integración.
 */
import { vi } from 'vitest';
import type { Repositorios, UnidadDeTrabajo, UsuarioActual } from '../../src/aplicacion/puertos';
import { aFechaISO, type FechaISO } from '../../src/dominio/fechas';
import { rectanguloEnMetros } from '../../src/dominio/geometria';
import { permisosDeRol } from '../../src/dominio/permisos';
import type { EstadoLote, EstadoReserva, Rol } from '../../src/dominio/tipos';
import { admite, type Transicion } from '../../src/dominio/transiciones';
import { RelojFijo } from '../../src/infraestructura/reloj';

// --- Fechas -------------------------------------------------------------------------------------

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** "Hoy" en todas las pruebas, también en las de integración: 15 de marzo de 2026 al mediodía. */
export const HOY = new Date('2026-03-15T12:00:00');

/** Fecha de calendario a `dias` de HOY (con un número negativo, en el pasado). */
export function fechaEnDias(dias: number): FechaISO {
  return aFechaISO(new Date(HOY.getTime() + dias * MS_POR_DIA));
}

/** '2026-03-14': una reserva que vencía ayer ya está vencida. */
export const AYER = fechaEnDias(-1);
/** '2026-03-16'. */
export const MANIANA = fechaEnDias(1);

/** Reloj detenido en HOY. */
export function relojEnHoy(): RelojFijo {
  return new RelojFijo(HOY);
}

// --- Usuarios y datos -----------------------------------------------------------------------------

function usuario(id: number, nombre: string, email: string, rol: Rol): UsuarioActual {
  return { id, nombre, email, rol, clienteId: null, permisos: permisosDeRol(rol) };
}

/** El administrador de los datos demo. */
export const usuarioAdmin = usuario(1, 'Rodrigo Aguilera', 'admin@lotes.bo', 'ADMIN');
/** La asesora de los datos demo. */
export const usuarioAsesor = usuario(2, 'Laura Vargas', 'asesor@lotes.bo', 'ASESOR');

/** Rectángulo válido de 12 x 30 m (360 m²) para crear lotes. */
export const GEOMETRIA_LOTE = rectanguloEnMetros([-63.18, -17.78], 0, 0, 12, 30);

// --- Unidad de trabajo falsa ------------------------------------------------------------------

/** Repositorios simulados: solo los métodos que usa el servicio probado (vi.fn()). */
export type ReposSimulados = { [K in keyof Repositorios]?: Record<string, unknown> };

/** Estado que una transacción falsa guarda al empezar y restaura si falla (como un ROLLBACK). */
export interface MemoriaTransaccional<T> {
  instantanea(): T;
  restaurar(copia: T): void;
}

/**
 * Unidad de trabajo falsa: entrega los mismos repositorios simulados dentro y fuera de la
 * transacción.
 *
 * - Un bloqueo (`bloquearPorId`, un SELECT ... FOR UPDATE) no tiene efecto que una unitaria pueda
 *   observar: si el doble no lo trae, se agrega vacío. Las carreras se prueban en integración.
 * - Con `memoria`, una transacción que lanza un error descarta sus escrituras, como un ROLLBACK.
 *   Sin ella, nada se deshace: no sirve para probar qué queda guardado cuando algo falla.
 */
export function unidadDeTrabajoFalsa<T>(repos: ReposSimulados, memoria?: MemoriaTransaccional<T>): UnidadDeTrabajo {
  const conBloqueos = Object.fromEntries(
    Object.entries(repos).map(([nombre, repo]) => [nombre, { bloquearPorId: vi.fn().mockResolvedValue(undefined), ...repo }]),
  ) as unknown as Repositorios;
  return {
    repos: conBloqueos,
    async transaccion(trabajo) {
      const alEmpezar = memoria?.instantanea();
      try {
        return await trabajo(conBloqueos);
      } catch (error) {
        if (memoria && alEmpezar !== undefined) memoria.restaurar(alEmpezar);
        throw error;
      }
    },
  };
}

// --- Lotes y reservas en memoria ---------------------------------------------------------------

export interface LoteEnMemoria {
  id: number;
  proyectoId: number;
  codigo: string;
  estado: EstadoLote;
  precio: number;
}

export interface ReservaEnMemoria {
  id: number;
  loteId: number;
  clienteId: number;
  estado: EstadoReserva;
  fechaVencimiento: FechaISO | null;
  motivoFinalizacion?: string | null;
}

interface DatosEnMemoria {
  lotes: LoteEnMemoria[];
  reservas: ReservaEnMemoria[];
}

/**
 * Lotes y reservas en memoria que se comportan como sus repositorios SQL: `cambiarEstadoSi` y
 * `finalizar` solo cambian una fila que sigue en un estado de origen de la transición, y si no
 * devuelven false. Sirve para probar el vencimiento de reservas por lo que queda guardado (el
 * estado final) y no por la secuencia de llamadas. Usar con `unidadDeTrabajoFalsa(repos, memoria)`.
 */
export function lotesYReservasEnMemoria(inicial: DatosEnMemoria) {
  let datos = structuredClone(inicial);
  const lote = (id: number) => datos.lotes.find((l) => l.id === id) ?? null;
  const reserva = (id: number) => datos.reservas.find((r) => r.id === id) ?? null;
  const copia = <F extends object>(fila: F | null): F | null => (fila ? { ...fila } : null);

  const repos = {
    lotes: {
      buscarPorId: vi.fn(async (id: number) => copia(lote(id))),
      cambiarEstadoSi: vi.fn(async (id: number, transicion: Transicion<EstadoLote>) => transicionar(lote(id), transicion)),
    },
    reservas: {
      buscarPorId: vi.fn(async (id: number) => copia(reserva(id))),
      buscarActivaPorLote: vi.fn(async (loteId: number) =>
        copia(datos.reservas.find((r) => r.loteId === loteId && r.estado === 'ACTIVA') ?? null),
      ),
      listarCandidatasAVencer: vi.fn(async () =>
        datos.reservas.filter((r) => r.estado === 'ACTIVA' && r.fechaVencimiento !== null).map((r) => ({ ...r })),
      ),
      finalizar: vi.fn(async (id: number, transicion: Transicion<EstadoReserva>, _fecha: Date, motivo?: string) => {
        const fila = reserva(id);
        const cambio = transicionar(fila, transicion);
        if (cambio && fila) fila.motivoFinalizacion = motivo ?? null;
        return cambio;
      }),
    },
  };

  return {
    repos,
    /** El lote tal como quedó guardado. */
    lote: (id: number) => copia(lote(id)),
    /** La reserva tal como quedó guardada. */
    reserva: (id: number) => copia(reserva(id)),
    instantanea: (): DatosEnMemoria => structuredClone(datos),
    restaurar: (copiaDatos: DatosEnMemoria) => {
      datos = copiaDatos;
    },
  };
}

function transicionar<E extends string>(fila: { estado: E } | null, transicion: Transicion<E>): boolean {
  if (!fila || !admite(transicion, fila.estado)) return false;
  fila.estado = transicion.a;
  return true;
}
