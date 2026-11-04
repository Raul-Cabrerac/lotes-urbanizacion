/**
 * Errores de la aplicación.
 *
 * Cada error tiene un `codigo` estable (por ejemplo LOTE_NO_DISPONIBLE) que el
 * frontend puede mostrar y que los tests pueden verificar sin depender del texto.
 * La traducción a códigos HTTP se hace en src/http/middlewares/manejadorErrores.ts,
 * así el dominio no depende de Express.
 */
export class ErrorAplicacion extends Error {
  constructor(
    public readonly codigo: string,
    mensaje: string,
    public readonly detalles?: unknown,
  ) {
    super(mensaje);
    this.name = new.target.name;
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
  constructor(mensaje = 'Debe iniciar sesión.', codigo = 'NO_AUTENTICADO') {
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
export class ErrorConflicto extends ErrorAplicacion {}

/** Los datos tienen buen formato pero violan una regla de negocio (HTTP 422). */
export class ErrorReglaNegocio extends ErrorAplicacion {}
