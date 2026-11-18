import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { iniciarEntornoPruebas, type EntornoPruebas } from '../apoyo/entornoPruebas';

describe('Integracion: Lotes', () => {
  let e: EntornoPruebas;

  beforeAll(async () => {
    e = await iniciarEntornoPruebas();
  });

  afterAll(async () => {
    await e.cerrar();
  });

  it('crea un lote dibujado y recupera su geometria y datos calculados', async () => {
    const geometria = {
      type: 'Polygon',
      coordinates: [
        [
          [-63.18, -17.78],
          [-63.179, -17.78],
          [-63.179, -17.779],
          [-63.18, -17.779],
          [-63.18, -17.78],
        ],
      ],
    };

    const resCrear = await request(e.app)
      .post('/api/proyectos/1/lotes')
      .set('Authorization', `Bearer ${e.tokenAdmin}`)
      .send({
        codigo: 'Z-99',
        manzano: 'Manzano Z',
        etapa: 'Etapa 3',
        precio: 85000,
        geometria,
      });

    expect(resCrear.status).toBe(201);
    expect(resCrear.body.codigo).toBe('Z-99');
    expect(resCrear.body.estado).toBe('DISPONIBLE');
    expect(resCrear.body.precio).toBe(85000);
    expect(resCrear.body.superficieM2).toBeGreaterThan(0);

    const resDetalle = await request(e.app)
      .get(`/api/lotes/${resCrear.body.id}`)
      .set('Authorization', `Bearer ${e.tokenAdmin}`);

    expect(resDetalle.status).toBe(200);
    expect(resDetalle.body.id).toBe(resCrear.body.id);
    expect(resDetalle.body.geometria).toEqual(geometria);
  });

  it('analiza una geometria devolviendo superficie y dimensiones calculadas', async () => {
    const geometria = {
      type: 'Polygon',
      coordinates: [
        [
          [-63.18, -17.78],
          [-63.179, -17.78],
          [-63.179, -17.779],
          [-63.18, -17.779],
          [-63.18, -17.78],
        ],
      ],
    };

    const res = await request(e.app)
      .post('/api/lotes/analizar-geometria')
      .set('Authorization', `Bearer ${e.tokenAdmin}`)
      .send({ geometria });

    expect(res.status).toBe(200);
    expect(res.body.superficieM2).toBeGreaterThan(0);
    expect(res.body.dimensiones).toBeDefined();
  });

  it('consulta lotes filtrados por estado y proyecto', async () => {
    const resDisponibles = await request(e.app)
      .get('/api/proyectos/1/lotes?estado=DISPONIBLE')
      .set('Authorization', `Bearer ${e.tokenAsesor}`);

    expect(resDisponibles.status).toBe(200);
    expect(Array.isArray(resDisponibles.body)).toBe(true);
    expect(resDisponibles.body.length).toBeGreaterThan(0);
    expect(resDisponibles.body.every((l: any) => l.estado === 'DISPONIBLE')).toBe(true);

    const resVendidos = await request(e.app)
      .get('/api/proyectos/1/lotes?estado=VENDIDO')
      .set('Authorization', `Bearer ${e.tokenAsesor}`);

    expect(resVendidos.status).toBe(200);
    expect(resVendidos.body.every((l: any) => l.estado === 'VENDIDO')).toBe(true);
  });
});
