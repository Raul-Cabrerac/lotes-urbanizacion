// Consigna §11 y §12: Geometrías válidas: dos lotes del mismo proyecto no pueden ocupar el mismo terreno.
import { describe, expect, it } from 'vitest';
import { rectanguloEnMetros, type PoligonoGeoJSON, type Posicion } from '../../../src/dominio/geometria';
import {
  areaCompartidaM2,
  buscarLoteSuperpuesto,
  SUPERPOSICION_TOLERADA_M2,
  validarSinSuperposicion,
} from '../../../src/dominio/superposicion';

const ORIGEN: Posicion = [-63.18, -17.78];

/** Rectángulo en metros desde el origen: rectangulo(0, 0, 12, 30) es un lote de 12 x 30 m. */
const rectangulo = (x: number, y: number, ancho: number, fondo: number): PoligonoGeoJSON =>
  rectanguloEnMetros(ORIGEN, x, y, ancho, fondo);

const lote = (codigo: string, geometria: PoligonoGeoJSON) => ({ codigo, geometria });

/** El mismo polígono con los vértices en el sentido contrario. */
const enSentidoContrario = (poligono: PoligonoGeoJSON): PoligonoGeoJSON => ({
  type: 'Polygon',
  coordinates: [[...poligono.coordinates[0]].reverse()],
});

/**
 * Lote en forma de L (6 lados, 300 m²): ocupa de 0 a 20 m de ancho en los primeros 10 m de fondo
 * y de 0 a 10 m de ancho en los 10 m siguientes. El hueco de la L va de 10 a 20 m en ambos ejes.
 */
const loteEnL = (): PoligonoGeoJSON => {
  const base = rectangulo(0, 0, 20, 10).coordinates[0];
  const brazo = rectangulo(0, 10, 10, 10).coordinates[0];
  return { type: 'Polygon', coordinates: [[base[0], base[1], base[2], brazo[1], brazo[2], brazo[3], base[0]]] };
};

const LOTE_A = rectangulo(0, 0, 12, 30);

describe('superposicion', () => {
  describe('areaCompartidaM2', () => {
    it.each([
      ['están separados por una calle de 5 m', rectangulo(17, 0, 12, 30)],
      ['comparten un lado completo (lotes vecinos)', rectangulo(12, 0, 12, 30)],
      ['se tocan solo en una esquina', rectangulo(12, 30, 12, 30)],
    ])('devuelve 0 cuando los dos lotes %s', (_caso, otro) => {
      // Arrange
      const vecino = otro;
      // Act
      const compartida = areaCompartidaM2(LOTE_A, vecino);
      // Assert
      expect(compartida).toBeCloseTo(0, 2);
    });

    it.each([
      ['se pisan en una franja de 6 x 30 m', rectangulo(6, 0, 12, 30), 180],
      ['uno queda completamente dentro del otro', rectangulo(2, 5, 5, 10), 50],
      ['son el mismo polígono', rectangulo(0, 0, 12, 30), 360],
    ])('devuelve la superficie en común cuando los dos lotes %s', (_caso, otro, esperada) => {
      // Arrange
      const superpuesto = otro;
      // Act
      const compartida = areaCompartidaM2(LOTE_A, superpuesto);
      // Assert
      expect(compartida).toBeCloseTo(esperada, 1);
    });

    it('devuelve la misma superficie sin importar cuál de los dos lotes se pasa primero', () => {
      // Arrange
      const otro = rectangulo(6, 0, 12, 30);
      // Act
      const deAHaciaB = areaCompartidaM2(LOTE_A, otro);
      const deBHaciaA = areaCompartidaM2(otro, LOTE_A);
      // Assert
      expect(deBHaciaA).toBeCloseTo(deAHaciaB, 6);
    });

    it('devuelve la misma superficie cuando un polígono viene dibujado en sentido contrario', () => {
      // Arrange
      const otro = enSentidoContrario(rectangulo(6, 0, 12, 30));
      // Act
      const compartida = areaCompartidaM2(LOTE_A, otro);
      // Assert
      expect(compartida).toBeCloseTo(180, 1);
    });

    it('devuelve 0 cuando un lote ocupa exactamente el hueco de un lote en forma de L', () => {
      // Arrange
      const enElHueco = rectangulo(10, 10, 10, 10);
      // Act
      const compartida = areaCompartidaM2(loteEnL(), enElHueco);
      // Assert
      expect(compartida).toBeCloseTo(0, 2);
    });

    it('devuelve solo la parte pisada (75 m²) cuando un lote cruza la esquina interior de un lote en forma de L', () => {
      // Arrange: de los 100 m² del cuadrado, 25 m² caen en el hueco de la L
      const sobreLaEsquina = rectangulo(5, 5, 10, 10);
      // Act
      const compartida = areaCompartidaM2(loteEnL(), sobreLaEsquina);
      // Assert
      expect(compartida).toBeCloseTo(75, 1);
    });
  });

  describe('buscarLoteSuperpuesto', () => {
    it('devuelve null cuando el proyecto todavía no tiene lotes', () => {
      // Arrange
      const sinLotes: { codigo: string; geometria: PoligonoGeoJSON }[] = [];
      // Act
      const pisado = buscarLoteSuperpuesto(LOTE_A, sinLotes);
      // Assert
      expect(pisado).toBeNull();
    });

    it('devuelve null cuando los demás lotes solo comparten un lado con el nuevo', () => {
      // Arrange
      const vecinos = [lote('A-02', rectangulo(12, 0, 12, 30)), lote('A-05', rectangulo(0, 30, 12, 30))];
      // Act
      const pisado = buscarLoteSuperpuesto(LOTE_A, vecinos);
      // Assert
      expect(pisado).toBeNull();
    });

    it('devuelve el lote pisado y no el vecino cuando solo uno de los dos se superpone', () => {
      // Arrange
      const vecino = lote('A-02', rectangulo(12, 0, 12, 30));
      const pisadoEsperado = lote('A-09', rectangulo(6, 10, 12, 30));
      // Act
      const pisado = buscarLoteSuperpuesto(LOTE_A, [vecino, pisadoEsperado]);
      // Assert
      expect(pisado).toBe(pisadoEsperado);
    });

    it('devuelve null en el límite: una franja compartida de 0,9 m² no supera la tolerancia de 1 m²', () => {
      // Arrange: 3 cm de ancho por 30 m de fondo
      const casiVecino = lote('A-02', rectangulo(11.97, 0, 12, 30));
      // Act
      const pisado = buscarLoteSuperpuesto(LOTE_A, [casiVecino]);
      // Assert
      expect(SUPERPOSICION_TOLERADA_M2).toBe(1);
      expect(pisado).toBeNull();
    });

    it('devuelve el lote en el límite: una franja compartida de 1,2 m² supera la tolerancia de 1 m²', () => {
      // Arrange: 4 cm de ancho por 30 m de fondo
      const encimado = lote('A-02', rectangulo(11.96, 0, 12, 30));
      // Act
      const pisado = buscarLoteSuperpuesto(LOTE_A, [encimado]);
      // Assert
      expect(pisado).toBe(encimado);
    });
  });

  describe('validarSinSuperposicion', () => {
    it('no lanza error cuando el lote es el primero del proyecto', () => {
      // Arrange
      const nuevo = lote('A-01', LOTE_A);
      // Act
      const validar = () => validarSinSuperposicion(nuevo, []);
      // Assert
      expect(validar).not.toThrow();
    });

    it('no lanza error cuando el lote solo comparte lados con sus vecinos', () => {
      // Arrange
      const nuevo = lote('A-01', LOTE_A);
      const vecinos = [lote('A-02', rectangulo(12, 0, 12, 30)), lote('A-05', rectangulo(0, 30, 12, 30))];
      // Act
      const validar = () => validarSinSuperposicion(nuevo, vecinos);
      // Assert
      expect(validar).not.toThrow();
    });

    it.each([
      ['pisa una parte de otro lote', rectangulo(6, 0, 12, 30)],
      ['queda completamente dentro de otro lote', rectangulo(2, 5, 5, 10)],
      ['contiene por completo a otro lote', rectangulo(-5, -5, 30, 50)],
      ['ocupa exactamente el mismo terreno que otro lote', rectangulo(0, 0, 12, 30)],
    ])('lanza LOTE_SUPERPUESTO cuando el lote nuevo %s', (_caso, geometria) => {
      // Arrange
      const existentes = [lote('A-01', LOTE_A)];
      const nuevo = lote('A-09', geometria);
      // Act + Assert
      expect(() => validarSinSuperposicion(nuevo, existentes)).toThrow(
        expect.objectContaining({ codigo: 'LOTE_SUPERPUESTO' }),
      );
    });

    it('lanza LOTE_SUPERPUESTO cuando el lote nuevo cruza un lote en forma de L', () => {
      // Arrange
      const existentes = [lote('C-01', loteEnL())];
      const nuevo = lote('C-02', rectangulo(5, 5, 10, 10));
      // Act + Assert
      expect(() => validarSinSuperposicion(nuevo, existentes)).toThrow(
        expect.objectContaining({ codigo: 'LOTE_SUPERPUESTO' }),
      );
    });

    it('no lanza error cuando el lote nuevo ocupa el hueco de un lote en forma de L', () => {
      // Arrange
      const existentes = [lote('C-01', loteEnL())];
      const nuevo = lote('C-02', rectangulo(10, 10, 10, 10));
      // Act
      const validar = () => validarSinSuperposicion(nuevo, existentes);
      // Assert
      expect(validar).not.toThrow();
    });
  });
});
