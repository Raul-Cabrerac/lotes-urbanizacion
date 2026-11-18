import { describe, expect, it } from 'vitest';
import {
  comparar,
  dividirEnPartes,
  esMontoValido,
  MONTO_MAXIMO,
  redondear,
  restar,
  sumar,
  tieneHastaDosDecimales,
} from './dinero';

describe('dinero', () => {
  describe('redondear', () => {
    it('redondea a dos decimales de forma exacta', () => {
      expect(redondear(10.555)).toBe(10.56);
      expect(redondear(10.554)).toBe(10.55);
    });
  });

  describe('sumar y restar', () => {
    it('evita los errores clasicos de coma flotante', () => {
      expect(0.1 + 0.2).not.toBe(0.3);
      expect(sumar(0.1, 0.2)).toBe(0.3);
      expect(restar(0.3, 0.1)).toBe(0.2);
    });

    it('suma multiples valores correctamente', () => {
      expect(sumar(10.25, 20.35, 30.40)).toBe(61.0);
    });
  });

  describe('comparar', () => {
    it('devuelve 0 si son iguales a nivel de centavos', () => {
      expect(comparar(15.5, 15.5)).toBe(0);
    });

    it('devuelve valor positivo si a > b y negativo si a < b', () => {
      expect(comparar(20.01, 20.0)).toBeGreaterThan(0);
      expect(comparar(19.99, 20.0)).toBeLessThan(0);
    });
  });

  describe('tieneHastaDosDecimales y esMontoValido', () => {
    it('reconoce valores con hasta dos decimales', () => {
      expect(tieneHastaDosDecimales(100)).toBe(true);
      expect(tieneHastaDosDecimales(100.5)).toBe(true);
      expect(tieneHastaDosDecimales(100.55)).toBe(true);
      expect(tieneHastaDosDecimales(100.555)).toBe(false);
    });

    it('valida montos validos en rango y rechaza montos invalidos', () => {
      expect(esMontoValido(0.01)).toBe(true);
      expect(esMontoValido(50000)).toBe(true);
      expect(esMontoValido(MONTO_MAXIMO)).toBe(true);
      expect(esMontoValido(0)).toBe(false);
      expect(esMontoValido(-10)).toBe(false);
      expect(esMontoValido(MONTO_MAXIMO + 1)).toBe(false);
      expect(esMontoValido('100')).toBe(false);
      expect(esMontoValido(null)).toBe(false);
      expect(esMontoValido(Number.NaN)).toBe(false);
    });
  });

  describe('dividirEnPartes', () => {
    it('divide un monto exacto en partes iguales', () => {
      expect(dividirEnPartes(100, 2)).toEqual([50, 50]);
    });

    it('asigna el centavo sobrante a la ultima parte', () => {
      const partes = dividirEnPartes(100, 3);
      expect(partes).toEqual([33.33, 33.33, 33.34]);
      expect(partes.reduce((acc, curr) => acc + curr, 0)).toBe(100);
    });

    it('lanza RangeError si las partes son menores a 1', () => {
      expect(() => dividirEnPartes(100, 0)).toThrow(RangeError);
      expect(() => dividirEnPartes(100, -2)).toThrow(RangeError);
    });
  });
});
