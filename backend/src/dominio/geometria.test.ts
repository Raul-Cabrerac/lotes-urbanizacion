import { describe, expect, it } from 'vitest';
import {
  calcularAreaM2,
  distanciaMetros,
  normalizarPoligono,
  type PoligonoGeoJSON,
  rectanguloEnMetros,
  sugerirDimensiones,
} from './geometria';

describe('geometria', () => {
  const origen: [number, number] = [-63.18, -17.78];

  describe('normalizarPoligono', () => {
    it('normaliza un poligono simple y lo devuelve cerrado', () => {
      const entrada = {
        type: 'Polygon',
        coordinates: [
          [
            [-63.18, -17.78],
            [-63.17, -17.78],
            [-63.17, -17.77],
            [-63.18, -17.77],
            [-63.18, -17.78],
          ],
        ],
      };

      const resultado = normalizarPoligono(entrada);

      expect(resultado.type).toBe('Polygon');
      expect(resultado.coordinates[0]).toHaveLength(5);
      expect(resultado.coordinates[0][0]).toEqual(resultado.coordinates[0][4]);
    });

    it('lanza GEOMETRIA_INVALIDA si la entrada no es un poligono GeoJSON', () => {
      expect(() => normalizarPoligono(null)).toThrow(
        expect.objectContaining({ codigo: 'GEOMETRIA_INVALIDA' }),
      );
      expect(() => normalizarPoligono({ type: 'Point', coordinates: [0, 0] })).toThrow(
        expect.objectContaining({ codigo: 'GEOMETRIA_INVALIDA' }),
      );
    });

    it('lanza GEOMETRIA_INVALIDA si tiene menos de 3 vertices distintos', () => {
      const linea = {
        type: 'Polygon',
        coordinates: [
          [
            [-63.18, -17.78],
            [-63.17, -17.78],
            [-63.18, -17.78],
          ],
        ],
      };
      expect(() => normalizarPoligono(linea)).toThrow(
        expect.objectContaining({ codigo: 'GEOMETRIA_INVALIDA' }),
      );
    });

    it('lanza GEOMETRIA_INVALIDA si los lados se cruzan entre si', () => {
      const relojDeArena = {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [2, 2],
            [0, 2],
            [2, 0],
            [0, 0],
          ],
        ],
      };
      expect(() => normalizarPoligono(relojDeArena)).toThrow(
        expect.objectContaining({ codigo: 'GEOMETRIA_INVALIDA' }),
      );
    });
  });

  describe('calcularAreaM2 y dimensiones', () => {
    it('calcula aproximadamente el area de un rectangulo de 10x30m', () => {
      const poligono = rectanguloEnMetros(origen, 0, 0, 10, 30);
      const area = calcularAreaM2(poligono);

      expect(area).toBeGreaterThan(298);
      expect(area).toBeLessThan(302);
    });

    it('sugiere formato frente x fondo para 4 lados', () => {
      const poligono = rectanguloEnMetros(origen, 0, 0, 10, 30);
      const dimensiones = sugerirDimensiones(poligono);

      expect(dimensiones).toContain('x');
      expect(dimensiones).toContain('m');
    });

    it('sugiere irregular cuando tiene mas o menos de 4 lados', () => {
      const triangulo: PoligonoGeoJSON = {
        type: 'Polygon',
        coordinates: [
          [
            [-63.18, -17.78],
            [-63.17, -17.78],
            [-63.17, -17.77],
            [-63.18, -17.78],
          ],
        ],
      };
      expect(sugerirDimensiones(triangulo)).toBe('Irregular (3 lados)');
    });

    it('calcula distancias positivas entre puntos', () => {
      const p1: [number, number] = [-63.18, -17.78];
      const p2: [number, number] = [-63.18, -17.77];
      expect(distanciaMetros(p1, p2)).toBeGreaterThan(1000);
    });
  });
});
