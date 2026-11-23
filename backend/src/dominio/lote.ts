/**
 * Reglas del ciclo comercial de un lote (consigna, sección 5).
 *
 *   DISPONIBLE ──reservar──> RESERVADO ──vender──> VENDIDO
 *       │  ▲                     │                    │
 *       │  └──cancelar/vencer────┘                    │
 *       │  ▲                                          │
 *       │  └────────────── anular venta ──────────────┘
 *       └──bloquear──> BLOQUEADO ──desbloquear──> DISPONIBLE
 *
 * Un lote DISPONIBLE también puede venderse directamente (sin reserva previa).
 */
import { comparar, enBolivianos, MONTO_MAXIMO } from './dinero';
import { ErrorConflicto, ErrorReglaNegocio } from './errores';
import { admite, type Transicion } from './transiciones';
import type { EstadoLote, EstadoProyecto } from './tipos';

export type OperacionLote = 'reservar' | 'liberarReserva' | 'vender' | 'anularVenta' | 'bloquear' | 'desbloquear';

/** La máquina de estados del lote (el diagrama de arriba). */
export const OPERACIONES_LOTE: Readonly<Record<OperacionLote, Transicion<EstadoLote>>> = {
  reservar: { de: ['DISPONIBLE'], a: 'RESERVADO' },
  liberarReserva: { de: ['RESERVADO'], a: 'DISPONIBLE' }, // al cancelar o vencer la reserva
  vender: { de: ['DISPONIBLE', 'RESERVADO'], a: 'VENDIDO' },
  anularVenta: { de: ['VENDIDO'], a: 'DISPONIBLE' },
  bloquear: { de: ['DISPONIBLE'], a: 'BLOQUEADO' },
  desbloquear: { de: ['BLOQUEADO'], a: 'DISPONIBLE' },
};

/** Estados de un lote que nunca tuvo una operación comercial en curso: solo esos se pueden eliminar. */
const ESTADOS_ELIMINABLES: readonly EstadoLote[] = ['DISPONIBLE', 'BLOQUEADO'];

/** Datos mínimos de un lote que necesitan estas reglas. */
export interface LoteComercial {
  codigo: string;
  estado: EstadoLote;
  precio: number;
}

/** Un lote se comercializa solo con precio asignado (Bs 0 significa "sin precio"). */
export function tienePrecio(precio: number): boolean {
  return comparar(precio, 0) > 0;
}

/**
 * Qué operaciones admite hoy un lote. La interfaz muestra sus botones con esto, y los
 * servicios validan con las mismas reglas (validarLoteReservable, validarLoteVendible...).
 */
export function operacionesDelLote(lote: { estado: EstadoLote; precio: number }, estadoProyecto: EstadoProyecto) {
  const comercializable = impedimentoComercial(lote, estadoProyecto) === null;
  return {
    reservar: comercializable && admite(OPERACIONES_LOTE.reservar, lote.estado),
    vender: comercializable && admite(OPERACIONES_LOTE.vender, lote.estado),
    bloquear: admite(OPERACIONES_LOTE.bloquear, lote.estado),
    desbloquear: admite(OPERACIONES_LOTE.desbloquear, lote.estado),
    eliminar: ESTADOS_ELIMINABLES.includes(lote.estado),
  };
}

/**
 * Cambios de estado que el administrador puede hacer a mano: bloquear un lote
 * DISPONIBLE o desbloquear uno BLOQUEADO. RESERVADO y VENDIDO solo cambian
 * mediante reservas y ventas. Devuelve la transición que corresponde.
 */
export function validarCambioEstadoManual(actual: EstadoLote, nuevo: EstadoLote): Transicion<EstadoLote> {
  const manual = [OPERACIONES_LOTE.bloquear, OPERACIONES_LOTE.desbloquear].find(
    (transicion) => transicion.a === nuevo && admite(transicion, actual),
  );
  if (!manual) {
    throw new ErrorReglaNegocio(
      'CAMBIO_ESTADO_NO_PERMITIDO',
      `No se puede cambiar manualmente un lote de ${actual} a ${nuevo}. ` +
        'Solo se puede bloquear un lote DISPONIBLE o desbloquear uno BLOQUEADO; ' +
        'los estados RESERVADO y VENDIDO se gestionan con reservas y ventas.',
    );
  }
  return manual;
}

/** Regla: solo un lote DISPONIBLE, con precio y de un proyecto publicado puede reservarse. */
export function validarLoteReservable(lote: LoteComercial, estadoProyecto: EstadoProyecto): void {
  validarProyectoPublicado(estadoProyecto);
  if (!admite(OPERACIONES_LOTE.reservar, lote.estado)) {
    throw new ErrorConflicto(
      'LOTE_NO_DISPONIBLE',
      `El lote ${lote.codigo} no está disponible para reservar (estado actual: ${lote.estado}).`,
    );
  }
  validarTienePrecio(lote);
}

/**
 * Regla: se puede vender un lote DISPONIBLE, o uno RESERVADO solo al mismo
 * cliente que tiene la reserva activa. Un lote VENDIDO no se vuelve a vender
 * mientras su venta siga vigente.
 */
export function validarLoteVendible(
  lote: LoteComercial,
  estadoProyecto: EstadoProyecto,
  clienteId: number,
  reservaActiva: { clienteId: number } | null,
): void {
  validarProyectoPublicado(estadoProyecto);
  if (!admite(OPERACIONES_LOTE.vender, lote.estado)) {
    if (lote.estado === 'VENDIDO') {
      throw new ErrorConflicto('LOTE_YA_VENDIDO', `El lote ${lote.codigo} ya fue vendido.`);
    }
    if (lote.estado === 'BLOQUEADO') {
      throw new ErrorConflicto('LOTE_BLOQUEADO', `El lote ${lote.codigo} está bloqueado y no se puede vender.`);
    }
    throw new ErrorConflicto(
      'LOTE_NO_DISPONIBLE',
      `El lote ${lote.codigo} no está disponible para vender (estado actual: ${lote.estado}).`,
    );
  }
  if (lote.estado === 'RESERVADO' && reservaActiva?.clienteId !== clienteId) {
    throw new ErrorConflicto(
      'LOTE_RESERVADO_POR_OTRO_CLIENTE',
      `El lote ${lote.codigo} está reservado para otro cliente.`,
    );
  }
  validarTienePrecio(lote);
}

export const LARGO_MAXIMO = { codigo: 30, manzano: 40, etapa: 40, dimensiones: 60 } as const;
const SUPERFICIE_MAXIMA_M2 = 10_000_000; // 1.000 hectáreas

/** Valida los datos comerciales que el administrador asigna a un lote (también los que vienen de un KML). */
export function validarDatosComerciales(datos: {
  codigo: string;
  manzano?: string;
  etapa?: string;
  dimensiones?: string;
  precio: number;
  superficieM2: number;
}): void {
  if (!datos.codigo.trim()) {
    throw new ErrorReglaNegocio('CODIGO_LOTE_REQUERIDO', 'El código del lote es obligatorio.');
  }
  for (const campo of ['codigo', 'manzano', 'etapa', 'dimensiones'] as const) {
    const valor = datos[campo] ?? '';
    if (valor.length > LARGO_MAXIMO[campo]) {
      throw new ErrorReglaNegocio(
        'TEXTO_DEMASIADO_LARGO',
        `El campo ${campo} admite como máximo ${LARGO_MAXIMO[campo]} caracteres ("${valor}").`,
      );
    }
  }
  if (!Number.isFinite(datos.precio) || comparar(datos.precio, 0) < 0 || datos.precio > MONTO_MAXIMO) {
    throw new ErrorReglaNegocio('PRECIO_INVALIDO', `El precio del lote debe estar entre 0 y ${enBolivianos(MONTO_MAXIMO)}.`);
  }
  if (!Number.isFinite(datos.superficieM2) || comparar(datos.superficieM2, 0) <= 0 || datos.superficieM2 > SUPERFICIE_MAXIMA_M2) {
    throw new ErrorReglaNegocio('SUPERFICIE_INVALIDA', 'La superficie del lote debe ser mayor a 0 m² (y razonable).');
  }
}

/** Un lote solo se puede eliminar si nunca tuvo reservas ni ventas ni deja vacío un proyecto publicado. */
export function validarLoteEliminable(
  lote: LoteComercial,
  tieneOperaciones: boolean,
  estadoProyecto: EstadoProyecto,
  cantidadLotesProyecto: number,
): void {
  if (tieneOperaciones || !ESTADOS_ELIMINABLES.includes(lote.estado)) {
    throw new ErrorConflicto(
      'LOTE_CON_OPERACIONES',
      `El lote ${lote.codigo} tiene reservas o ventas registradas y no se puede eliminar. Puede bloquearlo.`,
    );
  }
  if (estadoProyecto === 'PUBLICADO' && cantidadLotesProyecto <= 1) {
    throw new ErrorConflicto(
      'PROYECTO_PUBLICADO_SIN_LOTES',
      'No se puede eliminar el último lote de un proyecto publicado.',
    );
  }
}

/** Un lote RESERVADO ya tiene precio asignado y no puede quedar en Bs 0 mientras siga reservado. */
export function validarPrecioLoteReservado(estadoActual: EstadoLote, nuevoPrecio: number): void {
  if (estadoActual === 'RESERVADO' && !tienePrecio(nuevoPrecio)) {
    throw new ErrorReglaNegocio(
      'LOTE_SIN_PRECIO',
      'Un lote reservado no puede quedar sin precio (Bs 0).',
    );
  }
}

/**
 * Lo que impide comercializar (reservar o vender) un lote además de su estado: el código del error
 * que respondería la API, o null si nada lo impide. La interfaz lo usa para explicar por qué no
 * muestra los botones.
 */
export function impedimentoComercial(
  lote: { precio: number },
  estadoProyecto: EstadoProyecto,
): 'PROYECTO_NO_PUBLICADO' | 'LOTE_SIN_PRECIO' | null {
  if (!proyectoComercializable(estadoProyecto)) return 'PROYECTO_NO_PUBLICADO';
  return tienePrecio(lote.precio) ? null : 'LOTE_SIN_PRECIO';
}

/** Solo se comercializan los lotes de un proyecto PUBLICADO. */
function proyectoComercializable(estado: EstadoProyecto): boolean {
  return estado === 'PUBLICADO';
}

function validarProyectoPublicado(estado: EstadoProyecto): void {
  if (!proyectoComercializable(estado)) {
    throw new ErrorReglaNegocio(
      'PROYECTO_NO_PUBLICADO',
      'El proyecto todavía no está publicado; sus lotes no se pueden comercializar.',
    );
  }
}

function validarTienePrecio(lote: LoteComercial): void {
  if (!tienePrecio(lote.precio)) {
    throw new ErrorReglaNegocio('LOTE_SIN_PRECIO', `El lote ${lote.codigo} no tiene precio asignado.`);
  }
}
