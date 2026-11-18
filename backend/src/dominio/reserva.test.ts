import { describe, expect, it } from 'vitest';
import { estaVencida, validarFechaVencimiento, validarReservaCancelable } from './reserva';

describe('reserva', () => {
  describe('estaVencida', () => {
    it('devuelve true cuando la reserva esta ACTIVA y su fecha de vencimiento es anterior a hoy', () => {
      const reserva = { estado: 'ACTIVA' as const, fechaVencimiento: '2026-03-09' };
      expect(estaVencida(reserva, '2026-03-10')).toBe(true);
    });

    it('devuelve false cuando la reserva vence hoy mismo', () => {
      const reserva = { estado: 'ACTIVA' as const, fechaVencimiento: '2026-03-10' };
      expect(estaVencida(reserva, '2026-03-10')).toBe(false);
    });

    it('devuelve false cuando la reserva vence en el futuro', () => {
      const reserva = { estado: 'ACTIVA' as const, fechaVencimiento: '2026-03-15' };
      expect(estaVencida(reserva, '2026-03-10')).toBe(false);
    });

    it('devuelve false cuando la fecha de vencimiento es null', () => {
      const reserva = { estado: 'ACTIVA' as const, fechaVencimiento: null };
      expect(estaVencida(reserva, '2026-03-10')).toBe(false);
    });

    it('devuelve false si la reserva no esta en estado ACTIVA', () => {
      expect(estaVencida({ estado: 'CONVERTIDA', fechaVencimiento: '2026-03-01' }, '2026-03-10')).toBe(false);
      expect(estaVencida({ estado: 'CANCELADA', fechaVencimiento: '2026-03-01' }, '2026-03-10')).toBe(false);
      expect(estaVencida({ estado: 'VENCIDA', fechaVencimiento: '2026-03-01' }, '2026-03-10')).toBe(false);
    });
  });

  describe('validarFechaVencimiento', () => {
    it('permite fechas iguales o posteriores a hoy', () => {
      expect(() => validarFechaVencimiento('2026-03-10', '2026-03-10')).not.toThrow();
      expect(() => validarFechaVencimiento('2026-03-11', '2026-03-10')).not.toThrow();
      expect(() => validarFechaVencimiento(null, '2026-03-10')).not.toThrow();
      expect(() => validarFechaVencimiento(undefined, '2026-03-10')).not.toThrow();
    });

    it('lanza FECHA_VENCIMIENTO_INVALIDA si la fecha es anterior a hoy', () => {
      expect(() => validarFechaVencimiento('2026-03-09', '2026-03-10')).toThrow(
        expect.objectContaining({ codigo: 'FECHA_VENCIMIENTO_INVALIDA' }),
      );
    });
  });

  describe('validarReservaCancelable', () => {
    it('permite cancelar una reserva ACTIVA', () => {
      expect(() => validarReservaCancelable({ estado: 'ACTIVA' })).not.toThrow();
    });

    it.each(['CANCELADA', 'CONVERTIDA', 'VENCIDA'] as const)(
      'lanza RESERVA_NO_ACTIVA cuando el estado es %s',
      (estado) => {
        expect(() => validarReservaCancelable({ estado })).toThrow(
          expect.objectContaining({ codigo: 'RESERVA_NO_ACTIVA' }),
        );
      },
    );
  });
});
