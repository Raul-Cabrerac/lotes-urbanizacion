// Consigna §12: Validar vencimiento de reservas y reglas para cancelar una reserva.
import { describe, expect, it } from 'vitest';
import type { FechaISO } from '../../../src/dominio/fechas';
import {
  estaVencida,
  OPERACIONES_RESERVA,
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
});
