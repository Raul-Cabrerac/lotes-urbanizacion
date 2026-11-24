// Consigna §11 y §12: Catálogo de códigos y jerarquía de errores del dominio.
import { describe, expect, it } from 'vitest';
import {
  CODIGOS_ERROR,
  ErrorAplicacion,
  ErrorConflicto,
  ErrorNoAutenticado,
  ErrorNoEncontrado,
  ErrorReglaNegocio,
  ErrorSinPermiso,
  ErrorValidacion,
  type TipoError,
} from '../../../src/dominio/errores';

const TIPOS_VALIDOS: readonly TipoError[] = [
  'validacion',
  'noAutenticado',
  'sinPermiso',
  'noEncontrado',
  'conflicto',
  'reglaNegocio',
];

describe('errores', () => {
  describe('CODIGOS_ERROR', () => {
    it('asigna únicamente tipos de error válidos del dominio a todo el catálogo', () => {
      // Arrange
      const tiposRegistrados = Object.values(CODIGOS_ERROR);
      // Act
      const todosValidos = tiposRegistrados.every((tipo) => TIPOS_VALIDOS.includes(tipo));
      // Assert
      expect(todosValidos).toBe(true);
    });

    it.each([
      ['VALIDACION', 'validacion'],
      ['NO_AUTENTICADO', 'noAutenticado'],
      ['CREDENCIALES_INVALIDAS', 'noAutenticado'],
      ['SIN_PERMISO', 'sinPermiso'],
      ['NO_ENCONTRADO', 'noEncontrado'],
      ['LOTE_NO_DISPONIBLE', 'conflicto'],
      ['MONTO_INVALIDO', 'reglaNegocio'],
    ] as const)('asocia el código %s al tipo %s', (codigo, tipoEsperado) => {
      // Arrange
      const clave = codigo;
      // Act
      const tipo = CODIGOS_ERROR[clave];
      // Assert
      expect(tipo).toBe(tipoEsperado);
    });
  });

  describe('ErrorAplicacion', () => {
    it('asigna codigo, tipo, mensaje, nombre de clase y detalles opcionales en undefined', () => {
      // Arrange
      const codigo = 'LOTE_NO_DISPONIBLE' as const;
      const mensaje = 'El lote no está disponible.';
      // Act
      const error = new ErrorAplicacion(codigo, mensaje);
      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ErrorAplicacion);
      expect(error.name).toBe('ErrorAplicacion');
      expect(error.codigo).toBe('LOTE_NO_DISPONIBLE');
      expect(error.tipo).toBe('conflicto');
      expect(error.message).toBe(mensaje);
      expect(error.detalles).toBeUndefined();
    });

    it('conserva detalles cuando se proporcionan explícitamente', () => {
      // Arrange
      const detalles = { campo: 'precio', valor: -1 };
      // Act
      const error = new ErrorAplicacion('PRECIO_INVALIDO', 'Precio inválido.', detalles);
      // Assert
      expect(error.detalles).toEqual(detalles);
      expect(error.tipo).toBe('reglaNegocio');
    });
  });

  describe('ErrorValidacion', () => {
    it('crea un error de tipo validacion sin detalles', () => {
      // Arrange
      const mensaje = 'Faltan campos obligatorios.';
      // Act
      const error = new ErrorValidacion(mensaje);
      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ErrorAplicacion);
      expect(error).toBeInstanceOf(ErrorValidacion);
      expect(error.name).toBe('ErrorValidacion');
      expect(error.codigo).toBe('VALIDACION');
      expect(error.tipo).toBe('validacion');
      expect(error.message).toBe(mensaje);
      expect(error.detalles).toBeUndefined();
    });

    it('conserva los detalles de validación cuando se envían', () => {
      // Arrange
      const detalles = [{ campo: 'nombre', error: 'requerido' }];
      // Act
      const error = new ErrorValidacion('Datos inválidos.', detalles);
      // Assert
      expect(error.detalles).toEqual(detalles);
    });
  });

  describe('ErrorNoAutenticado', () => {
    it('usa el mensaje y código NO_AUTENTICADO por defecto cuando no recibe argumentos', () => {
      // Arrange
      const construir = () => new ErrorNoAutenticado();
      // Act
      const error = construir();
      // Assert
      expect(error).toBeInstanceOf(ErrorAplicacion);
      expect(error).toBeInstanceOf(ErrorNoAutenticado);
      expect(error.name).toBe('ErrorNoAutenticado');
      expect(error.codigo).toBe('NO_AUTENTICADO');
      expect(error.tipo).toBe('noAutenticado');
      expect(error.message).toBe('Debe iniciar sesión.');
      expect(error.detalles).toBeUndefined();
    });

    it.each([
      ['CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.'],
      ['USUARIO_INACTIVO', 'Su usuario está desactivado.'],
      ['TOKEN_INVALIDO', 'Token vencido o inválido.'],
      ['NO_AUTENTICADO', 'Falta el token.'],
    ] as const)('admite el código %s y mensaje personalizado', (codigo, mensaje) => {
      // Arrange
      const codigoEsperado = codigo;
      // Act
      const error = new ErrorNoAutenticado(mensaje, codigoEsperado);
      // Assert
      expect(error.codigo).toBe(codigoEsperado);
      expect(error.tipo).toBe('noAutenticado');
      expect(error.message).toBe(mensaje);
    });
  });

  describe('ErrorSinPermiso', () => {
    it('usa el mensaje por defecto y código SIN_PERMISO cuando no recibe argumentos', () => {
      // Arrange
      const construir = () => new ErrorSinPermiso();
      // Act
      const error = construir();
      // Assert
      expect(error).toBeInstanceOf(ErrorAplicacion);
      expect(error).toBeInstanceOf(ErrorSinPermiso);
      expect(error.name).toBe('ErrorSinPermiso');
      expect(error.codigo).toBe('SIN_PERMISO');
      expect(error.tipo).toBe('sinPermiso');
      expect(error.message).toBe('No tiene permisos para realizar esta operación.');
    });

    it('conserva el mensaje personalizado cuando se indica', () => {
      // Arrange
      const mensaje = 'El portal es solo para clientes.';
      // Act
      const error = new ErrorSinPermiso(mensaje);
      // Assert
      expect(error.codigo).toBe('SIN_PERMISO');
      expect(error.tipo).toBe('sinPermiso');
      expect(error.message).toBe(mensaje);
    });
  });

  describe('ErrorNoEncontrado', () => {
    it('crea un error de tipo noEncontrado con código NO_ENCONTRADO', () => {
      // Arrange
      const mensaje = 'Lote no encontrado.';
      // Act
      const error = new ErrorNoEncontrado(mensaje);
      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ErrorAplicacion);
      expect(error).toBeInstanceOf(ErrorNoEncontrado);
      expect(error.name).toBe('ErrorNoEncontrado');
      expect(error.codigo).toBe('NO_ENCONTRADO');
      expect(error.tipo).toBe('noEncontrado');
      expect(error.message).toBe(mensaje);
      expect(error.detalles).toBeUndefined();
    });
  });

  describe('ErrorConflicto', () => {
    it('crea un error de tipo conflicto sin detalles', () => {
      // Arrange
      const mensaje = 'La reserva ya fue cancelada.';
      // Act
      const error = new ErrorConflicto('RESERVA_NO_ACTIVA', mensaje);
      // Assert
      expect(error).toBeInstanceOf(ErrorAplicacion);
      expect(error).toBeInstanceOf(ErrorConflicto);
      expect(error.name).toBe('ErrorConflicto');
      expect(error.codigo).toBe('RESERVA_NO_ACTIVA');
      expect(error.tipo).toBe('conflicto');
      expect(error.message).toBe(mensaje);
      expect(error.detalles).toBeUndefined();
    });

    it('conserva detalles cuando se envían en un conflicto', () => {
      // Arrange
      const detalles = { loteId: 12 };
      // Act
      const error = new ErrorConflicto('LOTE_YA_VENDIDO', 'Ya vendido.', detalles);
      // Assert
      expect(error.codigo).toBe('LOTE_YA_VENDIDO');
      expect(error.detalles).toEqual(detalles);
    });
  });

  describe('ErrorReglaNegocio', () => {
    it('crea un error de tipo reglaNegocio sin detalles', () => {
      // Arrange
      const mensaje = 'El monto supera el saldo pendiente.';
      // Act
      const error = new ErrorReglaNegocio('MONTO_EXCEDE_SALDO', mensaje);
      // Assert
      expect(error).toBeInstanceOf(ErrorAplicacion);
      expect(error).toBeInstanceOf(ErrorReglaNegocio);
      expect(error.name).toBe('ErrorReglaNegocio');
      expect(error.codigo).toBe('MONTO_EXCEDE_SALDO');
      expect(error.tipo).toBe('reglaNegocio');
      expect(error.message).toBe(mensaje);
      expect(error.detalles).toBeUndefined();
    });

    it.each([
      ['lista de textos', ['L-01: geometría inválida']],
      ['valor null explícito', null],
    ] as const)('conserva detalles (%s) en ErrorReglaNegocio', (_desc, detalles) => {
      // Arrange
      const codigo = 'KML_CON_ERRORES' as const;
      // Act
      const error = new ErrorReglaNegocio(codigo, 'Errores en el KML.', detalles);
      // Assert
      expect(error.codigo).toBe('KML_CON_ERRORES');
      expect(error.tipo).toBe('reglaNegocio');
      expect(error.detalles).toEqual(detalles);
    });
  });
});
