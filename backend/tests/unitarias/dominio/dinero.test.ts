// Consigna §12: Utilidades financieras y división de cuotas del plan de pagos.
import { describe, expect, it } from 'vitest';
import {
  comparar,
  dividirEnPartes,
  enBolivianos,
  esMontoValido,
  MONTO_MAXIMO,
  redondear,
  restar,
  sumar,
  tieneHastaDosDecimales,
} from '../../../src/dominio/dinero';

describe('dinero', () => {
  describe('MONTO_MAXIMO', () => {
    it('define el tope máximo permitido en Bs 999.999.999,99', () => {
      // Arrange
      const topeEsperado = 999_999_999.99;
      // Act
      const topeActual = MONTO_MAXIMO;
      // Assert
      expect(topeActual).toBe(topeEsperado);
    });
  });

  describe('redondear', () => {
    it('redondea hacia arriba cuando el tercer decimal es 5 o mayor', () => {
      // Arrange
      const monto = 10.555;
      // Act
      const resultado = redondear(monto);
      // Assert
      expect(resultado).toBe(10.56);
    });

    it('redondea hacia abajo cuando el tercer decimal es menor a 5', () => {
      // Arrange
      const monto = 10.554;
      // Act
      const resultado = redondear(monto);
      // Assert
      expect(resultado).toBe(10.55);
    });

    it('devuelve 1 para 1.005 debido a la representación binaria IEEE-754 de 1.005 * 100', () => {
      // Arrange
      const monto = 1.005;
      // Act
      const resultado = redondear(monto);
      // Assert
      expect(resultado).toBe(1);
    });

    it('redondea valores negativos (-10.556 -> -10.56)', () => {
      // Arrange
      const monto = -10.556;
      // Act
      const resultado = redondear(monto);
      // Assert
      expect(resultado).toBe(-10.56);
    });

    it.each([0, 10, 10.5, 10.55])(
      'mantiene sin cambios el monto %s con hasta dos decimales',
      (monto) => {
        // Arrange
        const entrada = monto;
        // Act
        const resultado = redondear(entrada);
        // Assert
        expect(resultado).toBe(entrada);
      },
    );
  });

  describe('sumar', () => {
    it('devuelve 0.3 exacto al sumar 0.1 y 0.2', () => {
      // Arrange
      const a = 0.1;
      const b = 0.2;
      // Act
      const total = sumar(a, b);
      // Assert
      expect(total).toBe(0.3);
    });

    it('suma múltiples montos con decimales sin errores de punto flotante', () => {
      // Arrange
      const montos = [10.25, 20.5, 30.25];
      // Act
      const total = sumar(...montos);
      // Assert
      expect(total).toBe(61);
    });

    it('devuelve 0 cuando no recibe argumentos', () => {
      // Arrange
      const montos: number[] = [];
      // Act
      const total = sumar(...montos);
      // Assert
      expect(total).toBe(0);
    });

    it('devuelve el mismo monto cuando recibe un único argumento', () => {
      // Arrange
      const monto = 150.75;
      // Act
      const total = sumar(monto);
      // Assert
      expect(total).toBe(150.75);
    });
  });

  describe('restar', () => {
    it('devuelve 0.01 exacto al restar 99.99 de 100', () => {
      // Arrange
      const a = 100;
      const b = 99.99;
      // Act
      const diferencia = restar(a, b);
      // Assert
      expect(diferencia).toBe(0.01);
    });

    it('devuelve 0 al restar un monto de sí mismo', () => {
      // Arrange
      const monto = 45000.5;
      // Act
      const diferencia = restar(monto, monto);
      // Assert
      expect(diferencia).toBe(0);
    });

    it('devuelve el monto original al restar 0', () => {
      // Arrange
      const monto = 1234.56;
      // Act
      const diferencia = restar(monto, 0);
      // Assert
      expect(diferencia).toBe(1234.56);
    });

    it('devuelve un valor negativo cuando el segundo monto es mayor que el primero', () => {
      // Arrange
      const a = 10;
      const b = 25.5;
      // Act
      const diferencia = restar(a, b);
      // Assert
      expect(diferencia).toBe(-15.5);
    });
  });

  describe('comparar', () => {
    it('devuelve un número negativo cuando el primer monto es menor que el segundo', () => {
      // Arrange
      const a = 10.5;
      const b = 10.51;
      // Act
      const resultado = comparar(a, b);
      // Assert
      expect(resultado).toBeLessThan(0);
    });

    it('devuelve 0 cuando ambos montos son iguales', () => {
      // Arrange
      const a = 10.5;
      const b = 10.5;
      // Act
      const resultado = comparar(a, b);
      // Assert
      expect(resultado).toBe(0);
    });

    it('devuelve un número positivo cuando el primer monto es mayor que el segundo', () => {
      // Arrange
      const a = 10.51;
      const b = 10.5;
      // Act
      const resultado = comparar(a, b);
      // Assert
      expect(resultado).toBeGreaterThan(0);
    });
  });

  describe('enBolivianos', () => {
    it.each([
      [0, 'Bs 0,00'],
      [100, 'Bs 100,00'],
      [1234.5, 'Bs 1.234,50'],
      [1000000, 'Bs 1.000.000,00'],
    ] as const)('formatea %s como "%s"', (monto, esperado) => {
      // Arrange
      const valor = monto;
      // Act
      const formateado = enBolivianos(valor);
      // Assert
      expect(formateado).toBe(esperado);
    });
  });

  describe('tieneHastaDosDecimales', () => {
    it.each([500, 500.5, 500.55])(
      'devuelve true cuando %s tiene como máximo dos decimales',
      (monto) => {
        // Arrange
        const valor = monto;
        // Act
        const valido = tieneHastaDosDecimales(valor);
        // Assert
        expect(valido).toBe(true);
      },
    );

    it.each([500.555, 0.001, 10.1234])(
      'devuelve false cuando %s tiene más de dos decimales',
      (monto) => {
        // Arrange
        const valor = monto;
        // Act
        const valido = tieneHastaDosDecimales(valor);
        // Assert
        expect(valido).toBe(false);
      },
    );
  });

  describe('esMontoValido', () => {
    it.each([
      ['un monto comercial estándar', 45000.5],
      ['el límite inferior de 1 centavo (0.01)', 0.01],
      ['el límite superior MONTO_MAXIMO', MONTO_MAXIMO],
    ] as const)('devuelve true para %s', (_descripcion, monto) => {
      // Arrange
      const entrada = monto;
      // Act
      const valido = esMontoValido(entrada);
      // Assert
      expect(valido).toBe(true);
    });

    it.each([
      ['cero', 0],
      ['un monto negativo', -0.01],
      ['más de dos decimales', 10.001],
      ['un monto superior a MONTO_MAXIMO', 1_000_000_000],
      ['una cadena de texto', '100'],
      ['null', null],
      ['undefined', undefined],
      ['NaN', Number.NaN],
      ['Infinity', Number.POSITIVE_INFINITY],
    ] as const)('devuelve false para %s', (_descripcion, monto) => {
      // Arrange
      const entrada: unknown = monto;
      // Act
      const valido = esMontoValido(entrada);
      // Assert
      expect(valido).toBe(false);
    });
  });

  describe('dividirEnPartes', () => {
    it('divide en partes iguales cuando la división es exacta', () => {
      // Arrange
      const total = 100;
      const partes = 2;
      // Act
      const cuotas = dividirEnPartes(total, partes);
      // Assert
      expect(cuotas).toEqual([50, 50]);
    });

    it('asigna los centavos sobrantes a la última parte (100 en 3 cuotas)', () => {
      // Arrange
      const total = 100;
      const partes = 3;
      // Act
      const cuotas = dividirEnPartes(total, partes);
      // Assert
      expect(cuotas).toEqual([33.33, 33.33, 33.34]);
    });

    it('conserva exactamente el total original al sumar todas las partes generadas', () => {
      // Arrange
      const total = 75000;
      const partes = 7;
      // Act
      const cuotas = dividirEnPartes(total, partes);
      const sumaTotal = sumar(...cuotas);
      // Assert
      expect(sumaTotal).toBe(total);
    });

    it('devuelve un arreglo con el total intacto cuando se divide en 1 parte', () => {
      // Arrange
      const total = 50;
      const partes = 1;
      // Act
      const cuotas = dividirEnPartes(total, partes);
      // Assert
      expect(cuotas).toEqual([50]);
    });

    it('devuelve [0, 0, 0] cuando el total es 0 y se divide en 3 partes', () => {
      // Arrange
      const total = 0;
      const partes = 3;
      // Act
      const cuotas = dividirEnPartes(total, partes);
      // Assert
      expect(cuotas).toEqual([0, 0, 0]);
    });

    it('devuelve [-5, -5] cuando el total es -10 y se divide en 2 partes', () => {
      // Arrange
      const total = -10;
      const partes = 2;
      // Act
      const cuotas = dividirEnPartes(total, partes);
      // Assert
      expect(cuotas).toEqual([-5, -5]);
    });

    it.each([0, -1, -3, 2.5])(
      'lanza RangeError cuando la cantidad de partes es inválida (%s)',
      (partes) => {
        // Arrange
        const total = 100;
        const dividir = () => dividirEnPartes(total, partes);
        // Act + Assert
        expect(dividir).toThrow(RangeError);
      },
    );
  });
});
