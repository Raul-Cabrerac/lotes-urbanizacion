import { describe, expect, it } from 'vitest';
import { LONGITUD_MINIMA_PASSWORD, validarPassword, validarVinculoCliente } from './usuario';

describe('usuario', () => {
  describe('validarPassword', () => {
    it('establece una longitud minima de 6 caracteres', () => {
      expect(LONGITUD_MINIMA_PASSWORD).toBe(6);
    });

    it('acepta contrasenas con longitud igual o mayor a la minima', () => {
      expect(() => validarPassword('123456')).not.toThrow();
      expect(() => validarPassword('admin123')).not.toThrow();
    });

    it('lanza PASSWORD_DEBIL si la contrasena es demasiado corta', () => {
      expect(() => validarPassword('12345')).toThrow(
        expect.objectContaining({ codigo: 'PASSWORD_DEBIL' }),
      );
    });
  });

  describe('validarVinculoCliente', () => {
    it('permite rol CLIENTE con clienteId asociado', () => {
      expect(() => validarVinculoCliente('CLIENTE', 15)).not.toThrow();
    });

    it('lanza CLIENTE_REQUERIDO si el usuario CLIENTE no tiene clienteId', () => {
      expect(() => validarVinculoCliente('CLIENTE', null)).toThrow(
        expect.objectContaining({ codigo: 'CLIENTE_REQUERIDO' }),
      );
      expect(() => validarVinculoCliente('CLIENTE', undefined)).toThrow(
        expect.objectContaining({ codigo: 'CLIENTE_REQUERIDO' }),
      );
    });

    it('lanza CLIENTE_NO_PERMITIDO si roles ADMIN o ASESOR tienen clienteId', () => {
      expect(() => validarVinculoCliente('ADMIN', 15)).toThrow(
        expect.objectContaining({ codigo: 'CLIENTE_NO_PERMITIDO' }),
      );
      expect(() => validarVinculoCliente('ASESOR', 15)).toThrow(
        expect.objectContaining({ codigo: 'CLIENTE_NO_PERMITIDO' }),
      );
    });

    it('permite roles ADMIN y ASESOR sin clienteId', () => {
      expect(() => validarVinculoCliente('ADMIN', null)).not.toThrow();
      expect(() => validarVinculoCliente('ASESOR', null)).not.toThrow();
    });
  });
});
