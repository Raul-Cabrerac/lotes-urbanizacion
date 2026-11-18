/**
 * Lo que la interfaz comparte con el backend: estados, roles, límites y qué operación admite cada
 * registro. `backend/src/dominio` es código puro (sin Express, base de datos ni Node), así que el
 * frontend lo importa en vez de copiarlo: un estado, un límite o una transición nueva llega a las
 * dos capas a la vez. Es el único archivo del frontend que importa del backend.
 */
export {
  ESTADOS_LOTE,
  ESTADOS_RESERVA,
  ESTADOS_VENTA,
  METODOS_PAGO,
  ROLES,
  type EstadoCuota,
  type EstadoLote,
  type EstadoPago,
  type EstadoProyecto,
  type EstadoReserva,
  type EstadoVenta,
  type MetodoPago,
  type ModalidadPago,
  type Rol,
} from '../../backend/src/dominio/tipos';
export type { Permiso } from '../../backend/src/dominio/permisos';
export { admite } from '../../backend/src/dominio/transiciones';
export { impedimentoComercial, operacionesDelLote, OPERACIONES_LOTE, tienePrecio } from '../../backend/src/dominio/lote';
export { MIN_VERTICES } from '../../backend/src/dominio/geometria';
export { OPERACIONES_RESERVA } from '../../backend/src/dominio/reserva';
export { saldoPendienteDelCliente } from '../../backend/src/dominio/venta';
export { sumar } from '../../backend/src/dominio/dinero';
export { OPERACIONES_PROYECTO, type ConteoPorEstado } from '../../backend/src/dominio/proyecto';
export {
  MAX_CUOTAS,
  METODO_PAGO_POR_DEFECTO,
  NUMERO_CUOTA_AL_FIRMAR,
  operacionesDeLaVenta,
} from '../../backend/src/dominio/planPagos';
export { LONGITUD_MINIMA_PASSWORD, seVinculaACliente } from '../../backend/src/dominio/usuario';
