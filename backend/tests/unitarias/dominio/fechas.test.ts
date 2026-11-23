// Consigna §7 y §9: Manejo determinista de fechas ISO de calendario (vencimientos y cuotas).
import { describe, expect, it } from 'vitest';
import { aFechaISO, esFechaISO, sumarMeses, type FechaISO } from '../../../src/dominio/fechas';

describe('fechas', () => {
  describe('esFechaISO', () => {
    it.each([
      ['fecha estándar', '2026-03-15'],
      ['primer día del año', '2026-01-01'],
      ['último día del año', '2026-12-31'],
      ['29 de febrero en año bisiesto (2024)', '2024-02-29'],
      ['29 de febrero en año bisiesto secular (2000)', '2000-02-29'],
    ] as const)('devuelve true para %s (%s)', (_desc, valor) => {
      // Arrange
      const entrada: unknown = valor;
      // Act
      const valida = esFechaISO(entrada);
      // Assert
      expect(valida).toBe(true);
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['número', 20260315],
      ['instancia Date', new Date(2026, 2, 15)],
      ['cadena vacía', ''],
      ['formato sin ceros a la izquierda', '2026-3-5'],
      ['formato DD-MM-AAAA', '15-03-2026'],
      ['separador con barra', '2026/03/15'],
      ['fecha con hora ISO completa', '2026-03-15T12:00:00'],
      ['texto no numérico', 'abcd-ef-gh'],
    ] as const)('devuelve false cuando el formato o tipo es inválido (%s)', (_desc, valor) => {
      // Arrange
      const entrada: unknown = valor;
      // Act
      const valida = esFechaISO(entrada);
      // Assert
      expect(valida).toBe(false);
    });

    it.each([
      ['mes 00', '2026-00-15'],
      ['mes 13', '2026-13-01'],
      ['día 00', '2026-03-00'],
      ['29 de febrero en año no bisiesto (2026)', '2026-02-29'],
      ['29 de febrero en año secular no bisiesto (1900)', '1900-02-29'],
      ['30 de febrero', '2026-02-30'],
      ['31 de abril', '2026-04-31'],
      ['31 de junio', '2026-06-31'],
      ['32 de enero', '2026-01-32'],
      ['año menor a 100 (0099)', '0099-05-10'],
    ] as const)('devuelve false cuando la fecha de calendario no existe (%s: %s)', (_desc, valor) => {
      // Arrange
      const entrada: unknown = valor;
      // Act
      const valida = esFechaISO(entrada);
      // Assert
      expect(valida).toBe(false);
    });
  });

  describe('aFechaISO', () => {
    it.each([
      ['mes y día de un dígito con relleno de ceros', new Date(2026, 0, 5, 12, 0, 0), '2026-01-05'],
      ['mes y día de dos dígitos al cierre de año', new Date(2026, 11, 31, 23, 59, 59), '2026-12-31'],
      ['inicio del día local (00:00:00)', new Date(2026, 2, 15, 0, 0, 0), '2026-03-15'],
      ['final del día local (23:59:59)', new Date(2026, 2, 15, 23, 59, 59), '2026-03-15'],
    ] as const)('convierte %s a formato AAAA-MM-DD', (_desc, fecha, esperado) => {
      // Arrange
      const instancia = fecha;
      // Act
      const iso = aFechaISO(instancia);
      // Assert
      expect(iso).toBe(esperado);
    });
  });

  describe('sumarMeses', () => {
    it.each([
      ['suma 0 meses manteniendo la fecha', '2026-03-15', 0, '2026-03-15'],
      ['suma 1 mes estándar', '2026-03-15', 1, '2026-04-15'],
      ['ajusta 31 de enero a 28 de febrero en año no bisiesto', '2026-01-31', 1, '2026-02-28'],
      ['ajusta 31 de enero a 29 de febrero en año bisiesto', '2024-01-31', 1, '2024-02-29'],
      ['conserva el día 31 al saltar directamente a marzo', '2026-01-31', 2, '2026-03-31'],
      ['ajusta 31 de enero a 30 de abril', '2026-01-31', 3, '2026-04-30'],
      ['ajusta 29 de febrero bisiesto al año siguiente', '2024-02-29', 12, '2025-02-28'],
      ['cruza de año hacia adelante (noviembre + 2 meses)', '2026-11-15', 2, '2027-01-15'],
      ['cruza de diciembre a enero manteniendo día 31', '2026-12-31', 1, '2027-01-31'],
      ['resta meses con ajuste de fin de mes (marzo 31 - 1)', '2026-03-31', -1, '2026-02-28'],
      ['cruza de año hacia atrás (enero - 2 meses)', '2026-01-15', -2, '2025-11-15'],
      ['resta 12 meses completos hacia el año anterior', '2026-05-10', -12, '2025-05-10'],
    ] as const)('%s (%s + %s meses -> %s)', (_desc, fechaBase, meses, esperado) => {
      // Arrange
      const fecha: FechaISO = fechaBase;
      // Act
      const resultado = sumarMeses(fecha, meses);
      // Assert
      expect(resultado).toBe(esperado);
    });
  });
});
