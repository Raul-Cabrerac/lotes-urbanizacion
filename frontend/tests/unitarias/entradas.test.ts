import { describe, it, expect } from 'vitest';
import { numeroOIndefinido, fechaEnDias } from '../../src/utilidades/entradas';

describe('entradas', () => {
  it('devuelve undefined para texto vacio o solo espacios', () => {
    expect(numeroOIndefinido('')).toBeUndefined();
    expect(numeroOIndefinido('   ')).toBeUndefined();
  });

  it('convierte texto numerico entero a numero', () => {
    expect(numeroOIndefinido('42')).toBe(42);
    expect(numeroOIndefinido('  1500 ')).toBe(1500);
  });

  it('convierte texto con punto decimal a numero', () => {
    expect(numeroOIndefinido('123.45')).toBe(123.45);
  });

  it('convierte texto con coma decimal a numero', () => {
    expect(numeroOIndefinido('123,45')).toBe(123.45);
  });

  it('devuelve NaN para cadenas no numericas', () => {
    expect(Number.isNaN(numeroOIndefinido('abc') as number)).toBe(true);
  });

  it('calcula la fecha en formato YYYY-MM-DD segun los dias transcurridos', () => {
    const hoy = new Date();
    hoy.setDate(hoy.getDate() + 5);
    const esperado = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    expect(fechaEnDias(5)).toBe(esperado);
  });

  it('genera formato valido para hoy con cero dias', () => {
    const resultado = fechaEnDias(0);
    expect(/^\d{4}-\d{2}-\d{2}$/.test(resultado)).toBe(true);
  });
});
