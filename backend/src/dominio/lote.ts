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
import { comparar, MONTO_MAXIMO } from './dinero';
import { ErrorConflicto, ErrorReglaNegocio } from './errores';
import type { EstadoLote, EstadoProyecto } from './tipos';

export const TRANSICIONES_LOTE: Readonly<Record<EstadoLote, readonly EstadoLote[]>> = {
  DISPONIBLE: ['RESERVADO', 'VENDIDO', 'BLOQUEADO'],
  RESERVADO: ['DISPONIBLE', 'VENDIDO'],
  VENDIDO: ['DISPONIBLE'], // solo al anular la venta
  BLOQUEADO: ['DISPONIBLE'],
};

/** Datos mínimos de un lote que necesitan estas reglas. */
export interface LoteComercial {
  codigo: string;
  estado: EstadoLote;
  precio: number;
}

export function puedeCambiarEstado(actual: EstadoLote, nuevo: EstadoLote): boolean {
  return TRANSICIONES_LOTE[actual].includes(nuevo);
}

export function validarCambioEstado(actual: EstadoLote, nuevo: EstadoLote): void {
  if (!puedeCambiarEstado(actual, nuevo)) {
    throw new ErrorReglaNegocio('TRANSICION_INVALIDA', `Un lote ${actual} no puede pasar a ${nuevo}.`);
  }
}

/**
 * Cambios de estado que el administrador puede hacer a mano: bloquear un lote
 * DISPONIBLE o desbloquear uno BLOQUEADO. RESERVADO y VENDIDO solo cambian
 * mediante reservas y ventas.
 */
export function validarCambioEstadoManual(actual: EstadoLote, nuevo: EstadoLote): void {
  const esBloqueo = actual === 'DISPONIBLE' && nuevo === 'BLOQUEADO';
  const esDesbloqueo = actual === 'BLOQUEADO' && nuevo === 'DISPONIBLE';
  if (!esBloqueo && !esDesbloqueo) {
    throw new ErrorReglaNegocio(
      'CAMBIO_ESTADO_NO_PERMITIDO',
      `No se puede cambiar manualmente un lote de ${actual} a ${nuevo}. ` +
        'Solo se puede bloquear un lote DISPONIBLE o desbloquear uno BLOQUEADO; ' +
        'los estados RESERVADO y VENDIDO se gestionan con reservas y ventas.',
    );
  }
}

/** Regla: solo un lote DISPONIBLE, con precio y de un proyecto publicado puede reservarse. */
export function validarLoteReservable(lote: LoteComercial, estadoProyecto: EstadoProyecto): void {
  validarProyectoPublicado(estadoProyecto);
  if (!puedeCambiarEstado(lote.estado, 'RESERVADO')) {
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
  if (lote.estado === 'VENDIDO') {
    throw new ErrorConflicto('LOTE_YA_VENDIDO', `El lote ${lote.codigo} ya fue vendido.`);
  }
  if (lote.estado === 'BLOQUEADO') {
    throw new ErrorConflicto('LOTE_BLOQUEADO', `El lote ${lote.codigo} está bloqueado y no se puede vender.`);
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
export const SUPERFICIE_MAXIMA_M2 = 10_000_000; // 1.000 hectáreas

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
    throw new ErrorReglaNegocio('PRECIO_INVALIDO', 'El precio del lote debe estar entre 0 y Bs 999.999.999,99.');
  }
  if (!Number.isFinite(datos.superficieM2) || comparar(datos.superficieM2, 0) <= 0 || datos.superficieM2 > SUPERFICIE_MAXIMA_M2) {
    throw new ErrorReglaNegocio('SUPERFICIE_INVALIDA', 'La superficie del lote debe ser mayor a 0 m² (y razonable).');
  }
}

/** Un lote solo se puede eliminar si nunca tuvo reservas ni ventas. */
export function validarLoteEliminable(lote: LoteComercial, tieneOperaciones: boolean): void {
  if (tieneOperaciones || lote.estado === 'RESERVADO' || lote.estado === 'VENDIDO') {
    throw new ErrorConflicto(
      'LOTE_CON_OPERACIONES',
      `El lote ${lote.codigo} tiene reservas o ventas registradas y no se puede eliminar. Puede bloquearlo.`,
    );
  }
}

function validarProyectoPublicado(estado: EstadoProyecto): void {
  if (estado !== 'PUBLICADO') {
    throw new ErrorReglaNegocio(
      'PROYECTO_NO_PUBLICADO',
      'El proyecto todavía no está publicado; sus lotes no se pueden comercializar.',
    );
  }
}

function validarTienePrecio(lote: LoteComercial): void {
  if (comparar(lote.precio, 0) <= 0) {
    throw new ErrorReglaNegocio('LOTE_SIN_PRECIO', `El lote ${lote.codigo} no tiene precio asignado.`);
  }
}
