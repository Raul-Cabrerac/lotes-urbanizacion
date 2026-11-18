// Consigna §12: Reglas de estado, eliminación y precio en lotes (Incidencia #4).
import { describe, expect, it } from 'vitest';
import {
  operacionesDelLote,
  tienePrecio,
  validarLoteEliminable,
  validarPrecioLoteReservado,
} from '../../../src/dominio/lote';
import type { EstadoLote, EstadoProyecto } from '../../../src/dominio/tipos';

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

  describe('operacionesDelLote', () => {
    const ninguna = { reservar: false, vender: false, bloquear: false, desbloquear: false, eliminar: false };
    type Caso = [caso: string, estado: EstadoLote, precio: number, estadoProyecto: EstadoProyecto, esperadas: typeof ninguna];
    const casos: Caso[] = [
      [
        'admite reservar, vender, bloquear y eliminar cuando está DISPONIBLE, con precio y el proyecto PUBLICADO',
        'DISPONIBLE', 45000, 'PUBLICADO', { ...ninguna, reservar: true, vender: true, bloquear: true, eliminar: true },
      ],
      [
        'no admite reservar ni vender cuando está DISPONIBLE pero el proyecto está en BORRADOR',
        'DISPONIBLE', 45000, 'BORRADOR', { ...ninguna, bloquear: true, eliminar: true },
      ],
      [
        'no admite reservar ni vender cuando está DISPONIBLE pero su precio es 0',
        'DISPONIBLE', 0, 'PUBLICADO', { ...ninguna, bloquear: true, eliminar: true },
      ],
      ['solo admite vender cuando está RESERVADO', 'RESERVADO', 45000, 'PUBLICADO', { ...ninguna, vender: true }],
      [
        'admite desbloquear y eliminar cuando está BLOQUEADO',
        'BLOQUEADO', 45000, 'PUBLICADO', { ...ninguna, desbloquear: true, eliminar: true },
      ],
      ['no admite ninguna operación cuando está VENDIDO', 'VENDIDO', 45000, 'PUBLICADO', ninguna],
    ];

    it.each(casos)('%s', (_caso, estado, precio, estadoProyecto, esperadas) => {
      // Arrange
      const loteActual = lote(estado, precio);
      // Act
      const operaciones = operacionesDelLote(loteActual, estadoProyecto);
      // Assert
      expect(operaciones).toEqual(esperadas);
    });
  });

  describe('tienePrecio', () => {
    it.each([
      [false, 'Bs 0', 0],
      [true, 'Bs 0.01', 0.01],
    ] as const)('devuelve %s cuando el precio es %s', (esperado, _texto, precio) => {
      // Arrange
      const precioDelLote = precio;
      // Act
      const resultado = tienePrecio(precioDelLote);
      // Assert
      expect(resultado).toBe(esperado);
    });
  });
});
