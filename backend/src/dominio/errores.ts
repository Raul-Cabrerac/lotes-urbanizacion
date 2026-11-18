/**
 * Errores de la aplicación.
 *
 * Cada error tiene un `codigo` estable (por ejemplo LOTE_NO_DISPONIBLE) que el
 * frontend puede mostrar y que los tests pueden verificar sin depender del texto.
 * El catálogo de abajo es la única lista de códigos de la aplicación: cada código pertenece
 * a un solo tipo, y el tipo decide la respuesta HTTP en src/http/middlewares/manejadorErrores.ts
 * (así el dominio no depende de Express). Los pocos códigos del propio protocolo HTTP (JSON
 * mal formado, ruta inexistente...) están en ese archivo.
 */
export type TipoError = 'validacion' | 'noAutenticado' | 'sinPermiso' | 'noEncontrado' | 'conflicto' | 'reglaNegocio';

export const CODIGOS_ERROR = {
  // Forma de los datos de entrada (400)
  VALIDACION: 'validacion',
  // Sesión (401) y permisos (403)
  NO_AUTENTICADO: 'noAutenticado',
  CREDENCIALES_INVALIDAS: 'noAutenticado',
  USUARIO_INACTIVO: 'noAutenticado',
  TOKEN_INVALIDO: 'noAutenticado',
  SIN_PERMISO: 'sinPermiso',
  // Recurso inexistente (404)
  NO_ENCONTRADO: 'noEncontrado',
  // El estado actual del recurso impide la operación (409)
  LOTE_NO_DISPONIBLE: 'conflicto',
  LOTE_YA_VENDIDO: 'conflicto',
  LOTE_BLOQUEADO: 'conflicto',
  LOTE_RESERVADO_POR_OTRO_CLIENTE: 'conflicto',
  LOTE_MODIFICADO: 'conflicto',
  LOTE_CON_OPERACIONES: 'conflicto',
  CODIGO_LOTE_DUPLICADO: 'conflicto',
  PROYECTO_YA_PUBLICADO: 'conflicto',
  PROYECTO_PUBLICADO_SIN_LOTES: 'conflicto',
  RESERVA_NO_ACTIVA: 'conflicto',
  VENTA_NO_VIGENTE: 'conflicto',
  CUOTA_YA_PAGADA: 'conflicto',
  PAGO_YA_ANULADO: 'conflicto',
  DOCUMENTO_DUPLICADO: 'conflicto',
  EMAIL_DUPLICADO: 'conflicto',
  CLIENTE_YA_TIENE_USUARIO: 'conflicto',
  // Segunda barrera: la base de datos rechazó algo que no se validó antes (consultas.ts)
  REGISTRO_DUPLICADO: 'conflicto',
  REGISTRO_RELACIONADO: 'conflicto',
  // Datos con buen formato que violan una regla de negocio (422)
  PROYECTO_NO_PUBLICADO: 'reglaNegocio',
  PROYECTO_SIN_LOTES: 'reglaNegocio',
  CAMBIO_ESTADO_NO_PERMITIDO: 'reglaNegocio',
  LOTE_SIN_PRECIO: 'reglaNegocio',
  CODIGO_LOTE_REQUERIDO: 'reglaNegocio',
  TEXTO_DEMASIADO_LARGO: 'reglaNegocio',
  PRECIO_INVALIDO: 'reglaNegocio',
  SUPERFICIE_INVALIDA: 'reglaNegocio',
  GEOMETRIA_INVALIDA: 'reglaNegocio',
  KML_INVALIDO: 'reglaNegocio',
  KML_DATO_INVALIDO: 'reglaNegocio',
  KML_CON_ERRORES: 'reglaNegocio',
  FECHA_VENCIMIENTO_INVALIDA: 'reglaNegocio',
  PRECIO_PACTADO_INVALIDO: 'reglaNegocio',
  CUOTA_INICIAL_INVALIDA: 'reglaNegocio',
  NUMERO_CUOTAS_INVALIDO: 'reglaNegocio',
  FECHA_PRIMERA_CUOTA_INVALIDA: 'reglaNegocio',
  MONTO_INVALIDO: 'reglaNegocio',
  MONTO_EXCEDE_SALDO: 'reglaNegocio',
  MONTO_EXCEDE_CUOTA: 'reglaNegocio',
  MOTIVO_REQUERIDO: 'reglaNegocio',
  PASSWORD_DEBIL: 'reglaNegocio',
  CLIENTE_REQUERIDO: 'reglaNegocio',
  CLIENTE_NO_PERMITIDO: 'reglaNegocio',
  NO_PUEDE_DESACTIVARSE: 'reglaNegocio',
  DATO_FUERA_DE_RANGO: 'reglaNegocio',
} as const satisfies Record<string, TipoError>;

export type CodigoError = keyof typeof CODIGOS_ERROR;

/** Códigos de un tipo: así un código de conflicto no se puede lanzar como regla de negocio. */
export type CodigoDe<T extends TipoError> = {
  [C in CodigoError]: (typeof CODIGOS_ERROR)[C] extends T ? C : never;
}[CodigoError];

export class ErrorAplicacion extends Error {
  readonly tipo: TipoError;

  constructor(
    public readonly codigo: CodigoError,
    mensaje: string,
    public readonly detalles?: unknown,
  ) {
    super(mensaje);
    this.name = new.target.name;
    this.tipo = CODIGOS_ERROR[codigo];
  }
}

/** Datos de entrada con formato inválido o campos obligatorios vacíos (HTTP 400). */
export class ErrorValidacion extends ErrorAplicacion {
  constructor(mensaje: string, detalles?: unknown) {
    super('VALIDACION', mensaje, detalles);
  }
}

/** No hay sesión o las credenciales no son válidas (HTTP 401). */
export class ErrorNoAutenticado extends ErrorAplicacion {
  constructor(mensaje = 'Debe iniciar sesión.', codigo: CodigoDe<'noAutenticado'> = 'NO_AUTENTICADO') {
    super(codigo, mensaje);
  }
}

/** El usuario no tiene permiso para la operación (HTTP 403). */
export class ErrorSinPermiso extends ErrorAplicacion {
  constructor(mensaje = 'No tiene permisos para realizar esta operación.') {
    super('SIN_PERMISO', mensaje);
  }
}

/** El recurso solicitado no existe (HTTP 404). */
export class ErrorNoEncontrado extends ErrorAplicacion {
  constructor(mensaje: string) {
    super('NO_ENCONTRADO', mensaje);
  }
}

/** El estado actual del recurso impide la operación, p. ej. el lote ya fue reservado (HTTP 409). */
export class ErrorConflicto extends ErrorAplicacion {
  constructor(codigo: CodigoDe<'conflicto'>, mensaje: string, detalles?: unknown) {
    super(codigo, mensaje, detalles);
  }
}

/** Los datos tienen buen formato pero violan una regla de negocio (HTTP 422). */
export class ErrorReglaNegocio extends ErrorAplicacion {
  constructor(codigo: CodigoDe<'reglaNegocio'>, mensaje: string, detalles?: unknown) {
    super(codigo, mensaje, detalles);
  }
}
