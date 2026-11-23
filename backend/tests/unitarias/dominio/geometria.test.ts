// Consigna §4, §11 y §12: Validación de polígonos GeoJSON, áreas, dimensiones y distancias.
import { describe, expect, it } from 'vitest';
import {
  calcularAreaM2,
  distanciaMetros,
  MIN_VERTICES,
  normalizarPoligono,
  rectanguloEnMetros,
  sugerirDimensiones,
  type PoligonoGeoJSON,
  type Posicion,
} from '../../../src/dominio/geometria';

const ORIGEN: Posicion = [-63.18, -17.78];

const poligonoRegular = (cantidadVertices: number, radio = 0.002): PoligonoGeoJSON => {
  const anillo: Posicion[] = Array.from({ length: cantidadVertices }, (_, i) => {
    const angulo = (2 * Math.PI * i) / cantidadVertices;
    return [
      Number((ORIGEN[0] + radio * Math.cos(angulo)).toFixed(8)),
      Number((ORIGEN[1] + radio * Math.sin(angulo)).toFixed(8)),
    ];
  });
  return { type: 'Polygon', coordinates: [anillo] };
};

describe('geometria', () => {
  describe('MIN_VERTICES', () => {
    it('define un mínimo de 3 vértices distintos para un polígono', () => {
      // Arrange
      const minimoEsperado = 3;
      // Act
      const minimoActual = MIN_VERTICES;
      // Assert
      expect(minimoActual).toBe(minimoEsperado);
    });
  });

  describe('normalizarPoligono', () => {
    it('cierra el anillo automáticamente cuando el polígono válido viene abierto', () => {
      // Arrange
      const abierto: PoligonoGeoJSON = {
        type: 'Polygon',
        coordinates: [[
          [-63.18, -17.78],
          [-63.179, -17.78],
          [-63.179, -17.779],
        ]],
      };
      // Act
      const normalizado = normalizarPoligono(abierto);
      // Assert
      expect(normalizado.type).toBe('Polygon');
      expect(normalizado.coordinates[0]).toHaveLength(4);
      expect(normalizado.coordinates[0][3]).toEqual(normalizado.coordinates[0][0]);
    });

    it('mantiene cerrado el anillo cuando el último punto ya coincide con el primero', () => {
      // Arrange
      const cerrado = rectanguloEnMetros(ORIGEN, 0, 0, 12, 30);
      // Act
      const normalizado = normalizarPoligono(cerrado);
      // Assert
      expect(normalizado.coordinates[0]).toHaveLength(5);
      expect(normalizado.coordinates[0][4]).toEqual(normalizado.coordinates[0][0]);
    });

    it('elimina puntos consecutivos repetidos dejando únicamente vértices únicos', () => {
      // Arrange
      const conDuplicados: PoligonoGeoJSON = {
        type: 'Polygon',
        coordinates: [[
          [-63.18, -17.78],
          [-63.18, -17.78],
          [-63.179, -17.78],
          [-63.179, -17.78],
          [-63.179, -17.779],
          [-63.18, -17.78],
        ]],
      };
      // Act
      const normalizado = normalizarPoligono(conDuplicados);
      // Assert
      expect(normalizado.coordinates[0]).toHaveLength(4);
    });

    it('acepta un polígono válido de exactamente 500 vértices en el límite superior', () => {
      // Arrange
      const poligono500 = poligonoRegular(500);
      // Act
      const normalizado = normalizarPoligono(poligono500);
      // Assert
      expect(normalizado.coordinates[0]).toHaveLength(501);
    });

    it('acepta vértices en los límites válidos de longitud (-180/180) y latitud (-90/90)', () => {
      // Arrange
      const enLimite: PoligonoGeoJSON = {
        type: 'Polygon',
        coordinates: [[
          [180, 0],
          [179.999, 0],
          [179.999, 0.001],
        ]],
      };
      // Act
      const normalizado = normalizarPoligono(enLimite);
      // Assert
      expect(normalizado.coordinates[0][0]).toEqual([180, 0]);
    });

    it('acepta un polígono válido con vértices colineales no superpuestos en bordes horizontal y vertical', () => {
      // Arrange: borde inferior horizontal y borde izquierdo vertical tienen puntos intermedios colineales
      const conColineales: PoligonoGeoJSON = {
        type: 'Polygon',
        coordinates: [[
          [-63.18, -17.78],
          [-63.1795, -17.78],
          [-63.179, -17.78],
          [-63.179, -17.779],
          [-63.18, -17.779],
          [-63.18, -17.7795],
        ]],
      };
      // Act
      const normalizado = normalizarPoligono(conColineales);
      // Assert
      expect(normalizado.coordinates[0]).toHaveLength(7);
    });

    it('acepta un polígono en forma de L con bordes paralelos alineados sin superposición', () => {
      // Arrange: verifica segmentos colineales separados sin auto-intersección
      const enL: PoligonoGeoJSON = {
        type: 'Polygon',
        coordinates: [[
          [-63.182, -17.78],
          [-63.181, -17.78],
          [-63.181, -17.779],
          [-63.18, -17.779],
          [-63.18, -17.78],
          [-63.179, -17.78],
          [-63.179, -17.778],
          [-63.182, -17.778],
        ]],
      };
      // Act
      const normalizado = normalizarPoligono(enL);
      // Assert
      expect(normalizado.coordinates[0]).toHaveLength(9);
    });

    it('acepta un polígono justo por encima del área mínima de 1 m²', () => {
      // Arrange
      const minimo = rectanguloEnMetros(ORIGEN, 0, 0, 1.1, 1.1);
      // Act
      const normalizado = normalizarPoligono(minimo);
      // Assert
      expect(calcularAreaM2(normalizado)).toBeGreaterThanOrEqual(1);
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['tipo distinto de Polygon', { type: 'Point', coordinates: [-63.18, -17.78] }],
      ['sin arreglo coordinates', { type: 'Polygon', coordinates: 'invalido' }],
      ['sin contornos (arreglo vacío)', { type: 'Polygon', coordinates: [] }],
      ['con más de un contorno (hueco)', {
        type: 'Polygon',
        coordinates: [
          [[-63.18, -17.78], [-63.179, -17.78], [-63.179, -17.779]],
          [[-63.1798, -17.7798], [-63.1792, -17.7798], [-63.1792, -17.7792]],
        ],
      }],
      ['contorno no es arreglo', { type: 'Polygon', coordinates: ['no-arreglo'] }],
      ['coordenada no es arreglo', { type: 'Polygon', coordinates: [['punto']] }],
      ['coordenada con menos de dos números', { type: 'Polygon', coordinates: [[[-63.18]]] }],
      ['longitud NaN', { type: 'Polygon', coordinates: [[[Number.NaN, -17.78], [-63.179, -17.78], [-63.179, -17.779]]] }],
      ['latitud Infinity', { type: 'Polygon', coordinates: [[[-63.18, Number.POSITIVE_INFINITY], [-63.179, -17.78], [-63.179, -17.779]]] }],
      ['longitud mayor a 180', { type: 'Polygon', coordinates: [[[180.01, -17.78], [-63.179, -17.78], [-63.179, -17.779]]] }],
      ['longitud menor a -180', { type: 'Polygon', coordinates: [[[-180.01, -17.78], [-63.179, -17.78], [-63.179, -17.779]]] }],
      ['latitud mayor a 90', { type: 'Polygon', coordinates: [[[-63.18, 90.01], [-63.179, -17.78], [-63.179, -17.779]]] }],
      ['latitud menor a -90', { type: 'Polygon', coordinates: [[[-63.18, -90.01], [-63.179, -17.78], [-63.179, -17.779]]] }],
    ] as const)('lanza GEOMETRIA_INVALIDA por estructura o coordenadas inválidas (%s)', (_desc, entrada) => {
      // Arrange
      const geo: unknown = entrada;
      // Act
      const validar = () => normalizarPoligono(geo);
      // Assert
      expect(validar).toThrow(
        expect.objectContaining({ codigo: 'GEOMETRIA_INVALIDA' }),
      );
    });

    it.each([
      ['anillo vacío', { type: 'Polygon', coordinates: [[]] }],
      ['un solo vértice', { type: 'Polygon', coordinates: [[[-63.18, -17.78]]] }],
      ['dos vértices distintos', { type: 'Polygon', coordinates: [[[-63.18, -17.78], [-63.179, -17.78]]] }],
      ['tres puntos que se reducen a 2 distintos tras deduplicar', {
        type: 'Polygon',
        coordinates: [[[-63.18, -17.78], [-63.18, -17.78], [-63.179, -17.78], [-63.18, -17.78]]],
      }],
    ] as const)('lanza GEOMETRIA_INVALIDA cuando tiene menos de 3 vértices distintos (%s)', (_desc, entrada) => {
      // Arrange
      const geo: unknown = entrada;
      // Act
      const validar = () => normalizarPoligono(geo);
      // Assert
      expect(validar).toThrow(
        expect.objectContaining({ codigo: 'GEOMETRIA_INVALIDA' }),
      );
    });

    it('lanza GEOMETRIA_INVALIDA cuando supera el límite máximo de 500 vértices', () => {
      // Arrange
      const poligono501 = poligonoRegular(501);
      // Act
      const validar = () => normalizarPoligono(poligono501);
      // Assert
      expect(validar).toThrow(
        expect.objectContaining({ codigo: 'GEOMETRIA_INVALIDA' }),
      );
    });

    it.each([
      ['cruce en X (reloj de arena)', {
        type: 'Polygon',
        coordinates: [[
          [-63.18, -17.78],
          [-63.179, -17.779],
          [-63.18, -17.779],
          [-63.179, -17.78],
        ]],
      }],
      ['vértice intermedio tocando lado opuesto en forma colineal horizontal', {
        type: 'Polygon',
        coordinates: [[
          [-63.18, -17.78],
          [-63.178, -17.78],
          [-63.178, -17.778],
          [-63.179, -17.78],
          [-63.18, -17.778],
        ]],
      }],
      ['segmento colineal posterior que contiene un vértice anterior (vertical)', {
        type: 'Polygon',
        coordinates: [[
          [-63.18, -17.7795],
          [-63.18, -17.7785],
          [-63.179, -17.7785],
          [-63.179, -17.778],
          [-63.18, -17.778],
          [-63.18, -17.78],
          [-63.179, -17.78],
          [-63.179, -17.7795],
        ]],
      }],
      ['segmento colineal que solapa parcialmente a otro anterior', {
        type: 'Polygon',
        coordinates: [[
          [-63.18, -17.78],
          [-63.179, -17.78],
          [-63.179, -17.779],
          [-63.1795, -17.78],
          [-63.1785, -17.78],
          [-63.1785, -17.778],
          [-63.18, -17.778],
        ]],
      }],
    ] as const)('lanza GEOMETRIA_INVALIDA cuando los lados se cruzan o tocan (%s)', (_desc, entrada) => {
      // Arrange
      const geo: unknown = entrada;
      // Act
      const validar = () => normalizarPoligono(geo);
      // Assert
      expect(validar).toThrow(
        expect.objectContaining({ codigo: 'GEOMETRIA_INVALIDA' }),
      );
    });

    it.each([
      ['área menor a 1 m² (0.4 x 0.4 m)', rectanguloEnMetros(ORIGEN, 0, 0, 0.4, 0.4)],
      ['vértices colineales con superficie cero', {
        type: 'Polygon' as const,
        coordinates: [[
          [-63.18, -17.78],
          [-63.179, -17.78],
          [-63.178, -17.78],
        ]] as Posicion[][],
      }],
    ] as const)('lanza GEOMETRIA_INVALIDA cuando la superficie es menor a 1 m² (%s)', (_desc, entrada) => {
      // Arrange
      const geo = entrada;
      // Act
      const validar = () => normalizarPoligono(geo);
      // Assert
      expect(validar).toThrow(
        expect.objectContaining({ codigo: 'GEOMETRIA_INVALIDA' }),
      );
    });
  });

  describe('calcularAreaM2', () => {
    it('calcula el área en m² de un rectángulo cerrado de 12 x 30 m', () => {
      // Arrange
      const lote = rectanguloEnMetros(ORIGEN, 0, 0, 12, 30);
      // Act
      const area = calcularAreaM2(lote);
      // Assert
      expect(area).toBeCloseTo(360, 0);
    });

    it('calcula el mismo área cuando el polígono recibido viene sin cerrar', () => {
      // Arrange
      const cerrado = rectanguloEnMetros(ORIGEN, 0, 0, 10, 20);
      const abierto: PoligonoGeoJSON = {
        type: 'Polygon',
        coordinates: [cerrado.coordinates[0].slice(0, -1)],
      };
      // Act
      const areaAbierto = calcularAreaM2(abierto);
      // Assert
      expect(areaAbierto).toBeCloseTo(200, 0);
    });

    it('conserva el cálculo correcto cuando el primer y último punto comparten longitud pero difieren en latitud', () => {
      // Arrange: triángulo rectángulo abierto donde primero[0] === ultimo[0] y primero[1] !== ultimo[1]
      const triangulo: PoligonoGeoJSON = {
        type: 'Polygon',
        coordinates: [[
          [-63.18, -17.78],
          [-63.179, -17.78],
          [-63.18, -17.779],
        ]],
      };
      // Act
      const area = calcularAreaM2(triangulo);
      // Assert
      expect(area).toBeGreaterThan(5000);
    });
  });

  describe('sugerirDimensiones', () => {
    it('formatea "frente x fondo m" sin decimal cuando las medidas de 4 lados son exactas', () => {
      // Arrange
      const lote = rectanguloEnMetros(ORIGEN, 0, 0, 12, 30);
      // Act
      const dimensiones = sugerirDimensiones(lote);
      // Assert
      expect(dimensiones).toBe('12 x 30 m');
    });

    it('formatea medidas con coma decimal cuando un lote de 4 lados tiene decimales', () => {
      // Arrange
      const lote = rectanguloEnMetros(ORIGEN, 0, 0, 12.5, 30.4);
      // Act
      const dimensiones = sugerirDimensiones(lote);
      // Assert
      expect(dimensiones).toBe('12,5 x 30,4 m');
    });

    it.each([
      ['3 lados', 3, 'Irregular (3 lados)'],
      ['5 lados', 5, 'Irregular (5 lados)'],
    ] as const)('devuelve etiqueta irregular cuando el polígono tiene %s', (_desc, lados, esperado) => {
      // Arrange
      const irregular = normalizarPoligono(poligonoRegular(lados));
      // Act
      const dimensiones = sugerirDimensiones(irregular);
      // Assert
      expect(dimensiones).toBe(esperado);
    });
  });

  describe('distanciaMetros', () => {
    it('devuelve 0 cuando ambas posiciones son idénticas', () => {
      // Arrange
      const punto: Posicion = [-63.18, -17.78];
      // Act
      const distancia = distanciaMetros(punto, punto);
      // Assert
      expect(distancia).toBe(0);
    });

    it('calcula la distancia en metros entre vértices de un lote de 12 x 30 m', () => {
      // Arrange
      const lote = rectanguloEnMetros(ORIGEN, 0, 0, 12, 30);
      const [p0, p1, p2] = lote.coordinates[0];
      // Act
      const frente = distanciaMetros(p0, p1);
      const fondo = distanciaMetros(p1, p2);
      // Assert
      expect(frente).toBeCloseTo(12, 1);
      expect(fondo).toBeCloseTo(30, 1);
    });
  });

  describe('rectanguloEnMetros', () => {
    it('genera un polígono GeoJSON cerrado de 5 posiciones con el área y desplazamiento solicitados', () => {
      // Arrange
      const xMetros = 50;
      const yMetros = 100;
      const ancho = 15;
      const fondo = 25;
      // Act
      const rectangulo = rectanguloEnMetros(ORIGEN, xMetros, yMetros, ancho, fondo);
      const anillo = rectangulo.coordinates[0];
      // Assert
      expect(rectangulo.type).toBe('Polygon');
      expect(anillo).toHaveLength(5);
      expect(anillo[4]).toEqual(anillo[0]);
      expect(anillo[0][0]).toBeGreaterThan(ORIGEN[0]);
      expect(anillo[0][1]).toBeGreaterThan(ORIGEN[1]);
      expect(calcularAreaM2(rectangulo)).toBeCloseTo(375, 0);
    });
  });
});
