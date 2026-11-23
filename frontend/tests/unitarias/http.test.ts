import { describe, it, expect } from 'vitest';
import { ApiError, consulta, mensajeDeError } from '../../src/api/http';

describe('http utilidades', () => {
  it('instancia correctamente un ApiError con estado codigo mensaje y detalles', () => {
    const error = new ApiError(404, 'LOTE_NO_ENCONTRADO', 'El lote no existe', { id: 10 });
    expect(error.estado).toBe(404);
    expect(error.codigo).toBe('LOTE_NO_ENCONTRADO');
    expect(error.message).toBe('El lote no existe');
    expect(error.detalles).toEqual({ id: 10 });
    expect(error instanceof Error).toBe(true);
  });

  it('construye parametros de consulta url ignorando nulos indefinidos y cadenas vacias', () => {
    const query = consulta({
      estado: 'DISPONIBLE',
      proyectoId: 5,
      buscar: '',
      nulo: null,
      indefinido: undefined,
    });
    expect(query).toBe('?estado=DISPONIBLE&proyectoId=5');
  });

  it('devuelve cadena vacia cuando todos los parametros son vacios', () => {
    const query = consulta({
      a: '',
      b: null,
      c: undefined,
    });
    expect(query).toBe('');
  });

  it('formatea mensaje de error con vinietas cuando los detalles son lista de textos', () => {
    const error = new ApiError(422, 'KML_INVALIDO', 'Errores en archivo KML', [
      'Poligono no cerrado en fila 1',
      'Superficie fuera de rango en fila 4',
    ]);
    const mensaje = mensajeDeError(error);
    expect(mensaje).toBe(
      'Errores en archivo KML\n• Poligono no cerrado en fila 1\n• Superficie fuera de rango en fila 4',
    );
  });

  it('devuelve solo el mensaje si ApiError no contiene lista de textos en detalles', () => {
    const error = new ApiError(409, 'LOTE_NO_DISPONIBLE', 'El lote ya fue reservado', { estado: 'RESERVADO' });
    const mensaje = mensajeDeError(error);
    expect(mensaje).toBe('El lote ya fue reservado');
  });

  it('devuelve el mensaje de una instancia Error estandar', () => {
    const error = new Error('Fallo de red');
    const mensaje = mensajeDeError(error);
    expect(mensaje).toBe('Fallo de red');
  });

  it('devuelve mensaje por defecto ante valores que no son instancias de Error', () => {
    expect(mensajeDeError('error de texto')).toBe('Ocurrió un error inesperado.');
    expect(mensajeDeError(null)).toBe('Ocurrió un error inesperado.');
    expect(mensajeDeError(undefined)).toBe('Ocurrió un error inesperado.');
  });
});
