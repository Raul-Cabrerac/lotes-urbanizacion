import { describe, it, expect } from 'vitest';
import { bs, m2, fecha, fechaHora, plural } from '../../src/utilidades/formato';

describe('formato', () => {
  it('formatea montos enteros en bolivianos sin decimales', () => {
    const resultado = bs(75000);
    expect(resultado).toBe('Bs 75.000');
  });

  it('formatea montos fraccionarios con dos decimales', () => {
    const resultado = bs(33.5);
    expect(resultado).toBe('Bs 33,50');
  });

  it('formatea el monto cero', () => {
    const resultado = bs(0);
    expect(resultado).toBe('Bs 0');
  });

  it('formatea superficies enteras con sufijo m2', () => {
    const resultado = m2(360);
    expect(resultado).toBe('360 m²');
  });

  it('formatea superficies decimales con sufijo m2', () => {
    const resultado = m2(359.99);
    expect(resultado).toBe('359,99 m²');
  });

  it('devuelve raya para fechas nulas o indefinidas', () => {
    expect(fecha(null)).toBe('—');
    expect(fecha(undefined)).toBe('—');
    expect(fecha('')).toBe('—');
  });

  it('formatea fechas en formato YYYY-MM-DD a DD/MM/AAAA', () => {
    const resultado = fecha('2026-10-27');
    expect(resultado).toBe('27/10/2026');
  });

  it('formatea fechas ISO completas', () => {
    const resultado = fecha('2026-10-27T12:00:00.000Z');
    expect(resultado).toBe('27/10/2026');
  });

  it('devuelve raya para fecha y hora nula o indefinida', () => {
    expect(fechaHora(null)).toBe('—');
    expect(fechaHora(undefined)).toBe('—');
    expect(fechaHora('')).toBe('—');
  });

  it('formatea fecha y hora completa', () => {
    const d = new Date(2026, 9, 27, 14, 5);
    const resultado = fechaHora(d.toISOString());
    expect(resultado).toContain('27/10/2026');
    expect(resultado).toContain(String(d.getHours()).padStart(2, '0'));
    expect(resultado).toContain(String(d.getMinutes()).padStart(2, '0'));
  });

  it('devuelve la forma singular para cantidad 1', () => {
    const resultado = plural(1, 'cuota vencida', 'cuotas vencidas');
    expect(resultado).toBe('1 cuota vencida');
  });

  it('devuelve la forma plural para cantidad mayor a 1', () => {
    const resultado = plural(3, 'cuota vencida', 'cuotas vencidas');
    expect(resultado).toBe('3 cuotas vencidas');
  });

  it('devuelve la forma plural para cantidad 0', () => {
    const resultado = plural(0, 'cuota vencida', 'cuotas vencidas');
    expect(resultado).toBe('0 cuotas vencidas');
  });
});
