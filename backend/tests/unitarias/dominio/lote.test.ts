// Consigna §12: Reglas de estado, eliminación y precio en lotes (Incidencia #4).
import { describe, expect, it } from 'vitest';
import { validarLoteEliminable, validarPrecioLoteReservado } from '../../../src/dominio/lote';

const lote = (estado: 'DISPONIBLE' | 'RESERVADO' | 'VENDIDO' | 'BLOQUEADO', precio = 45000) => ({
  codigo: 'A-01',
  estado,
  precio,
});

describe('lote', () => {
  describe('validarLoteEliminable', () => {
    it('no lanza error cuando el lote está DISPONIBLE, sin operaciones y el proyecto queda con lotes', () => {
      // Arrange
      const disponible = lote('DISPONIBLE');
      // Act
      const validar = () => validarLoteEliminable(disponible, false, 'PUBLICADO', 2);
      // Assert
      expect(validar).not.toThrow();
    });

    it('lanza LOTE_CON_OPERACIONES cuando el lote tiene operaciones previas', () => {
      // Arrange
      const disponible = lote('DISPONIBLE');
      // Act + Assert
      expect(() => validarLoteEliminable(disponible, true, 'PUBLICADO', 3)).toThrow(
        expect.objectContaining({ codigo: 'LOTE_CON_OPERACIONES' }),
      );
    });

    it('lanza PROYECTO_PUBLICADO_SIN_LOTES cuando es el último lote de un proyecto PUBLICADO', () => {
      // Arrange
      const disponible = lote('DISPONIBLE');
      // Act + Assert
      expect(() => validarLoteEliminable(disponible, false, 'PUBLICADO', 1)).toThrow(
        expect.objectContaining({ codigo: 'PROYECTO_PUBLICADO_SIN_LOTES' }),
      );
    });

    it('permite eliminar el último lote cuando el proyecto sigue en BORRADOR', () => {
      // Arrange
      const disponible = lote('DISPONIBLE');
      // Act
      const validar = () => validarLoteEliminable(disponible, false, 'BORRADOR', 1);
      // Assert
      expect(validar).not.toThrow();
    });
  });

  describe('validarPrecioLoteReservado', () => {
    it('no lanza error cuando el lote está DISPONIBLE y recibe precio 0', () => {
      // Arrange + Act
      const validar = () => validarPrecioLoteReservado('DISPONIBLE', 0);
      // Assert
      expect(validar).not.toThrow();
    });

    it('no lanza error cuando el lote está RESERVADO y mantiene precio positivo', () => {
      // Arrange + Act
      const validar = () => validarPrecioLoteReservado('RESERVADO', 50000);
      // Assert
      expect(validar).not.toThrow();
    });

    it('lanza LOTE_SIN_PRECIO cuando el lote está RESERVADO y se intenta fijar precio 0', () => {
      // Arrange + Act + Assert
      expect(() => validarPrecioLoteReservado('RESERVADO', 0)).toThrow(
        expect.objectContaining({ codigo: 'LOTE_SIN_PRECIO' }),
      );
    });
  });
});
