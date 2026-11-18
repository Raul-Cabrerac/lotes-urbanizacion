import { describe, expect, it } from 'vitest';
import { aFechaISO, esFechaISO, sumarDias, sumarMeses } from './fechas';

describe('fechas', () => {
  describe('esFechaISO', () => {
    it('devuelve true para fechas validas en formato AAAA-MM-DD', () => {
      expect(esFechaISO('2026-03-15')).toBe(true);
      expect(esFechaISO('2026-02-28')).toBe(true);
    });

    it('devuelve false para formatos incorrectos o fechas inexistentes', () => {
      expect(esFechaISO('15-03-2026')).toBe(false);
      expect(esFechaISO('2026/03/15')).toBe(false);
      expect(esFechaISO('2026-02-30')).toBe(false);
      expect(esFechaISO('texto')).toBe(false);
      expect(esFechaISO(12345)).toBe(false);
      expect(esFechaISO(null)).toBe(false);
    });
  });

  describe('aFechaISO', () => {
    it('convierte un objeto Date a formato ISO YYYY-MM-DD', () => {
      const fecha = new Date(2026, 4, 9);
      expect(aFechaISO(fecha)).toBe('2026-05-09');
    });
  });

  describe('sumarMeses', () => {
    it('suma meses dentro del mismo anio', () => {
      expect(sumarMeses('2026-01-15', 2)).toBe('2026-03-15');
    });

    it('ajusta el ultimo dia del mes si el destino tiene menos dias', () => {
      expect(sumarMeses('2026-01-31', 1)).toBe('2026-02-28');
    });

    it('cruza correctamente de anio', () => {
      expect(sumarMeses('2026-11-10', 3)).toBe('2027-02-10');
    });
  });

  describe('sumarDias', () => {
    it('suma dias a una fecha', () => {
      expect(sumarDias('2026-03-10', 5)).toBe('2026-03-15');
    });

    it('resta dias cuando se proporciona un numero negativo', () => {
      expect(sumarDias('2026-03-05', -5)).toBe('2026-02-28');
    });
  });
});
