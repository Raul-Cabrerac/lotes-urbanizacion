// Consigna §12: Validar vencimiento de reservas y reglas para cancelar una reserva.
import { describe, expect, it } from 'vitest';
import type { FechaISO } from '../../../src/dominio/fechas';
import {
  estaVencida,
  anticipoMinimo,
  OPERACIONES_RESERVA,
  validarAnticipo,
  validarFechaVencimiento,
  validarReservaCancelable,
  type OperacionReserva,
} from '../../../src/dominio/reserva';
import type { EstadoReserva } from '../../../src/dominio/tipos';
import { admite } from '../../../src/dominio/transiciones';

const AYER: FechaISO = '2026-11-17';
const HOY: FechaISO = '2026-11-18';
const MANANA: FechaISO = '2026-11-19';

const operacionesConDestino: readonly [OperacionReserva, EstadoReserva][] = [
  ['cancelar', 'CANCELADA'],
  ['vencer', 'VENCIDA'],
  ['convertir', 'CONVERTIDA'],
];

const ESTADOS_TERMINALES = ['CANCELADA', 'VENCIDA', 'CONVERTIDA'] as const;

describe('reserva', () => {
  describe('OPERACIONES_RESERVA', () => {
    it.each(['cancelar', 'vencer', 'convertir'] as const)(
      'permite %s cuando la reserva está ACTIVA',
      (operacion) => {
        // Arrange
        const transicion = OPERACIONES_RESERVA[operacion];
        // Act
        const permitida = admite(transicion, 'ACTIVA');
        // Assert
        expect(permitida).toBe(true);
      },
    );

    it.each(['cancelar', 'vencer', 'convertir'] as const)(
      'rechaza %s cuando la reserva está en estado terminal (CANCELADA, VENCIDA o CONVERTIDA)',
      (operacion) => {
        // Arrange
        const transicion = OPERACIONES_RESERVA[operacion];
        // Act
        const desdeCancelada = admite(transicion, 'CANCELADA');
        const desdeVencida = admite(transicion, 'VENCIDA');
        const desdeConvertida = admite(transicion, 'CONVERTIDA');
        // Assert
        expect(desdeCancelada).toBe(false);
        expect(desdeVencida).toBe(false);
        expect(desdeConvertida).toBe(false);
      },
    );

    it.each(operacionesConDestino)(
      'define %s con estado destino %s',
      (operacion, destinoEsperado) => {
        // Arrange
        const transicion = OPERACIONES_RESERVA[operacion];
        // Act
        const destino = transicion.a;
        // Assert
        expect(destino).toBe(destinoEsperado);
      },
    );
  });

  describe('estaVencida', () => {
    it('devuelve true cuando la reserva está ACTIVA y venció ayer', () => {
      // Arrange
      const reserva = { estado: 'ACTIVA' as const, fechaVencimiento: AYER };
      // Act
      const vencida = estaVencida(reserva, HOY);
      // Assert
      expect(vencida).toBe(true);
    });

    it('devuelve false cuando la reserva está ACTIVA y vence hoy', () => {
      // Arrange
      const reserva = { estado: 'ACTIVA' as const, fechaVencimiento: HOY };
      // Act
      const vencida = estaVencida(reserva, HOY);
      // Assert
      expect(vencida).toBe(false);
    });

    it('devuelve false cuando la reserva está ACTIVA y vence mañana', () => {
      // Arrange
      const reserva = { estado: 'ACTIVA' as const, fechaVencimiento: MANANA };
      // Act
      const vencida = estaVencida(reserva, HOY);
      // Assert
      expect(vencida).toBe(false);
    });

    it('devuelve false cuando la reserva está ACTIVA y la fecha de vencimiento es null', () => {
      // Arrange
      const reserva = { estado: 'ACTIVA' as const, fechaVencimiento: null };
      // Act
      const vencida = estaVencida(reserva, HOY);
      // Assert
      expect(vencida).toBe(false);
    });

    it.each(ESTADOS_TERMINALES)(
      'devuelve false cuando venció ayer pero la reserva está %s',
      (estado) => {
        // Arrange
        const reserva = { estado, fechaVencimiento: AYER };
        // Act
        const vencida = estaVencida(reserva, HOY);
        // Assert
        expect(vencida).toBe(false);
      },
    );
  });

  describe('validarFechaVencimiento', () => {
    it('no lanza error cuando la fecha es posterior a hoy', () => {
      // Arrange
      const fecha = MANANA;
      // Act
      const validar = () => validarFechaVencimiento(fecha, HOY);
      // Assert
      expect(validar).not.toThrow();
    });

    it('no lanza error cuando la fecha es igual a hoy', () => {
      // Arrange
      const fecha = HOY;
      // Act
      const validar = () => validarFechaVencimiento(fecha, HOY);
      // Assert
      expect(validar).not.toThrow();
    });

    it('no lanza error cuando la fecha es null', () => {
      // Arrange
      const fecha = null;
      // Act
      const validar = () => validarFechaVencimiento(fecha, HOY);
      // Assert
      expect(validar).not.toThrow();
    });

    it('no lanza error cuando la fecha es undefined', () => {
      // Arrange
      const fecha = undefined;
      // Act
      const validar = () => validarFechaVencimiento(fecha, HOY);
      // Assert
      expect(validar).not.toThrow();
    });

    it('lanza FECHA_VENCIMIENTO_INVALIDA cuando la fecha es anterior a hoy', () => {
      // Arrange
      const fecha = AYER;
      // Act + Assert
      expect(() => validarFechaVencimiento(fecha, HOY)).toThrow(
        expect.objectContaining({ codigo: 'FECHA_VENCIMIENTO_INVALIDA' }),
      );
    });
  });

  describe('validarReservaCancelable', () => {
    it('no lanza error cuando la reserva está ACTIVA', () => {
      // Arrange
      const reserva = { estado: 'ACTIVA' as const };
      // Act
      const validar = () => validarReservaCancelable(reserva);
      // Assert
      expect(validar).not.toThrow();
    });

    it.each(ESTADOS_TERMINALES)(
      'lanza RESERVA_NO_ACTIVA cuando la reserva está %s',
      (estado) => {
        // Arrange
        const reserva = { estado };
        // Act + Assert
        expect(() => validarReservaCancelable(reserva)).toThrow(
          expect.objectContaining({ codigo: 'RESERVA_NO_ACTIVA' }),
        );
      },
    );
  });

  describe('anticipoMinimo', () => {
    it.each([
      ['Bs 60.000', 60000, 6000],
      ['Bs 75.000', 75000, 7500],
      ['Bs 62.000,50 (con centavos)', 62000.5, 6200.05],
    ] as const)('devuelve el 10 %% del precio cuando el lote vale %s', (_caso, precio, esperado) => {
      // Arrange
      const precioDelLote = precio;
      // Act
      const minimo = anticipoMinimo(precioDelLote);
      // Assert
      expect(minimo).toBe(esperado);
    });
  });

  describe('validarAnticipo', () => {
    const PRECIO_DEL_LOTE = 60000; // su anticipo mínimo es Bs 6.000

    it('no lanza error cuando el anticipo supera el 10 % del precio y es menor al precio del lote', () => {
      // Arrange
      const anticipo = 10000;
      // Act
      const validar = () => validarAnticipo(anticipo, PRECIO_DEL_LOTE);
      // Assert
      expect(validar).not.toThrow();
    });

    it.each([
      ['exactamente el 10 % del precio (Bs 6.000)', 6000],
      ['1 centavo menos que el precio del lote', 59999.99],
    ] as const)('no lanza error en el límite: %s', (_caso, anticipo) => {
      // Arrange
      const anticipoLimite = anticipo;
      // Act
      const validar = () => validarAnticipo(anticipoLimite, PRECIO_DEL_LOTE);
      // Assert
      expect(validar).not.toThrow();
    });

    it.each([
      ['es 0 (reservar sin pagar)', 0],
      ['es negativo', -500],
      ['tiene 3 decimales', 7000.005],
      ['no es un número', '7000'],
      ['no se envía', undefined],
    ] as const)('lanza ANTICIPO_INVALIDO cuando el anticipo %s', (_caso, anticipo) => {
      // Arrange
      const anticipoInvalido: unknown = anticipo;
      // Act + Assert
      expect(() => validarAnticipo(anticipoInvalido, PRECIO_DEL_LOTE)).toThrow(
        expect.objectContaining({ codigo: 'ANTICIPO_INVALIDO' }),
      );
    });

    it.each([
      ['es 1 centavo menor al 10 % del precio', 5999.99],
      ['es el 5 % del precio', 3000],
      ['es solo 1 centavo', 0.01],
    ] as const)('lanza ANTICIPO_INSUFICIENTE cuando el anticipo %s', (_caso, anticipo) => {
      // Arrange
      const anticipoBajo = anticipo;
      // Act + Assert
      expect(() => validarAnticipo(anticipoBajo, PRECIO_DEL_LOTE)).toThrow(
        expect.objectContaining({ codigo: 'ANTICIPO_INSUFICIENTE' }),
      );
    });

    it.each([
      ['es igual al precio del lote', 60000],
      ['supera el precio del lote por 1 centavo', 60000.01],
    ] as const)('lanza ANTICIPO_EXCEDE_PRECIO cuando el anticipo %s', (_caso, anticipo) => {
      // Arrange
      const anticipoExcesivo = anticipo;
      // Act + Assert
      expect(() => validarAnticipo(anticipoExcesivo, PRECIO_DEL_LOTE)).toThrow(
        expect.objectContaining({ codigo: 'ANTICIPO_EXCEDE_PRECIO' }),
      );
    });
  });
});
