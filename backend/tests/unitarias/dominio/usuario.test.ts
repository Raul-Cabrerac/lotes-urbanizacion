// Consigna §2 y §11: Reglas de las cuentas de usuario, contraseñas y vínculo con cliente.
import { describe, expect, it } from 'vitest';
import {
  LONGITUD_MINIMA_PASSWORD,
  normalizarEmail,
  seVinculaACliente,
  validarPassword,
  validarVinculoCliente,
} from '../../../src/dominio/usuario';

describe('usuario', () => {
  describe('LONGITUD_MINIMA_PASSWORD', () => {
    it('define la longitud mínima de contraseña en 6 caracteres', () => {
      // Arrange
      const minimoEsperado = 6;
      // Act
      const minimoActual = LONGITUD_MINIMA_PASSWORD;
      // Assert
      expect(minimoActual).toBe(minimoEsperado);
    });
  });

  describe('normalizarEmail', () => {
    it.each([
      ['correo ya normalizado', 'usuario@lotes.bo', 'usuario@lotes.bo'],
      ['correo en mayúsculas', 'ADMIN@LOTES.BO', 'admin@lotes.bo'],
      ['correo con espacios y mayúsculas mixtas', '  Asesor.Ventas@Lotes.BO \t ', 'asesor.ventas@lotes.bo'],
      ['solo espacios', '   ', ''],
    ] as const)('normaliza %s correctamente', (_desc, entrada, esperado) => {
      // Arrange
      const email = entrada;
      // Act
      const resultado = normalizarEmail(email);
      // Assert
      expect(resultado).toBe(esperado);
    });
  });

  describe('validarPassword', () => {
    it('no lanza error cuando la contraseña supera el mínimo permitido', () => {
      // Arrange
      const password = 'claveSegura123';
      // Act
      const validar = () => validarPassword(password);
      // Assert
      expect(validar).not.toThrow();
    });

    it('no lanza error en el límite exacto de 6 caracteres', () => {
      // Arrange
      const password = 'X'.repeat(LONGITUD_MINIMA_PASSWORD);
      // Act
      const validar = () => validarPassword(password);
      // Assert
      expect(validar).not.toThrow();
    });

    it.each([
      ['5 caracteres (bajo el límite de 6)', '12345'],
      ['1 carácter', 'a'],
      ['cadena vacía', ''],
    ] as const)('lanza PASSWORD_DEBIL cuando la contraseña tiene %s', (_desc, password) => {
      // Arrange
      const clave = password;
      // Act
      const validar = () => validarPassword(clave);
      // Assert
      expect(validar).toThrow(
        expect.objectContaining({ codigo: 'PASSWORD_DEBIL' }),
      );
    });
  });

  describe('seVinculaACliente', () => {
    it.each([
      ['CLIENTE', true],
      ['ADMIN', false],
      ['ASESOR', false],
    ] as const)('devuelve %s cuando el rol es %s', (rol, esperado) => {
      // Arrange
      const rolUsuario = rol;
      // Act
      const resultado = seVinculaACliente(rolUsuario);
      // Assert
      expect(resultado).toBe(esperado);
    });
  });

  describe('validarVinculoCliente', () => {
    it('devuelve el clienteId cuando el rol es CLIENTE y tiene un cliente válido', () => {
      // Arrange
      const rol = 'CLIENTE' as const;
      const clienteId = 42;
      // Act
      const resultado = validarVinculoCliente(rol, clienteId);
      // Assert
      expect(resultado).toBe(42);
    });

    it.each([
      ['ADMIN', null],
      ['ADMIN', undefined],
      ['ASESOR', null],
      ['ASESOR', undefined],
      ['ASESOR', 0],
    ] as const)('devuelve null cuando el rol %s no se vincula a cliente (clienteId: %s)', (rol, clienteId) => {
      // Arrange
      const rolUsuario = rol;
      // Act
      const resultado = validarVinculoCliente(rolUsuario, clienteId);
      // Assert
      expect(resultado).toBeNull();
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['0', 0],
    ] as const)('lanza CLIENTE_REQUERIDO cuando el rol es CLIENTE y clienteId es %s', (_desc, clienteId) => {
      // Arrange
      const rol = 'CLIENTE' as const;
      // Act
      const validar = () => validarVinculoCliente(rol, clienteId);
      // Assert
      expect(validar).toThrow(
        expect.objectContaining({ codigo: 'CLIENTE_REQUERIDO' }),
      );
    });

    it.each([
      ['ADMIN', 1],
      ['ASESOR', 15],
    ] as const)('lanza CLIENTE_NO_PERMITIDO cuando el rol %s recibe clienteId %s', (rol, clienteId) => {
      // Arrange
      const rolUsuario = rol;
      // Act
      const validar = () => validarVinculoCliente(rolUsuario, clienteId);
      // Assert
      expect(validar).toThrow(
        expect.objectContaining({ codigo: 'CLIENTE_NO_PERMITIDO' }),
      );
    });
  });
});
