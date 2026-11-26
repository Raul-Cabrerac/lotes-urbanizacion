import { describe, it, expect } from 'vitest';
import { aRuta, aPoligono, centroDe, verticeCercano, type Punto } from '../../src/componentes/mapa/geometriaMapa';
import type { Poligono } from '../../src/api/tipos';

describe('geometriaMapa', () => {
  it('convierte un poligono geojson cerrado a ruta descartando el punto final duplicado', () => {
    const geojson: Poligono = {
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
    const ruta = aRuta(geojson);
    expect(ruta).toEqual([
      { lat: -17.78, lng: -63.18 },
      { lat: -17.78, lng: -63.17 },
      { lat: -17.77, lng: -63.17 },
    ]);
  });

  it('convierte un poligono sin punto duplicado sin alterar los vertices', () => {
    const geojson: Poligono = {
      type: 'Polygon',
      coordinates: [
        [
          [-63.18, -17.78],
          [-63.17, -17.78],
          [-63.17, -17.77],
        ],
      ],
    };
    const ruta = aRuta(geojson);
    expect(ruta).toHaveLength(3);
  });

  it('convierte un poligono vacio a una ruta vacia', () => {
    const geojson: Poligono = {
      type: 'Polygon',
      coordinates: [],
    };
    const ruta = aRuta(geojson);
    expect(ruta).toEqual([]);
  });

  it('convierte una ruta de puntos a poligono geojson cerrando el anillo', () => {
    const ruta: Punto[] = [
      { lat: -17.78, lng: -63.18 },
      { lat: -17.78, lng: -63.17 },
      { lat: -17.77, lng: -63.17 },
    ];
    const geojson = aPoligono(ruta);
    expect(geojson.type).toBe('Polygon');
    expect(geojson.coordinates).toHaveLength(1);
    expect(geojson.coordinates[0]).toEqual([
      [-63.18, -17.78],
      [-63.17, -17.78],
      [-63.17, -17.77],
      [-63.18, -17.78],
    ]);
  });

  it('calcula el centro aproximado promediando las coordenadas de los vertices', () => {
    const ruta: Punto[] = [
      { lat: 10, lng: 20 },
      { lat: 20, lng: 40 },
    ];
    const centro = centroDe(ruta);
    expect(centro).toEqual({ lat: 15, lng: 30 });
  });

  it('encuentra el vertice mas cercano dentro del radio en pixeles', () => {
    const proyeccion = {
      fromLatLngToContainerPixel: (p: google.maps.LatLng | google.maps.LatLngLiteral) => {
        const punto = p as Punto;
        return { x: punto.lng, y: punto.lat } as google.maps.Point;
      },
    } as unknown as google.maps.MapCanvasProjection;

    const candidatos: Punto[] = [
      { lat: 100, lng: 100 },
      { lat: 200, lng: 200 },
    ];

    const cercano = verticeCercano({ lat: 102, lng: 101 }, candidatos, proyeccion, 10);
    expect(cercano).toEqual({ lat: 100, lng: 100 });
  });

  it('devuelve null si ningun candidato esta dentro del radio', () => {
    const proyeccion = {
      fromLatLngToContainerPixel: (p: google.maps.LatLng | google.maps.LatLngLiteral) => {
        const punto = p as Punto;
        return { x: punto.lng, y: punto.lat } as google.maps.Point;
      },
    } as unknown as google.maps.MapCanvasProjection;

    const candidatos: Punto[] = [{ lat: 100, lng: 100 }];
    const cercano = verticeCercano({ lat: 150, lng: 150 }, candidatos, proyeccion, 10);
    expect(cercano).toBeNull();
  });
});
