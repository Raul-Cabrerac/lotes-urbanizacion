import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { iniciarEntornoPruebas, type EntornoPruebas } from '../apoyo/entornoPruebas';

describe('Integracion: Proyectos', () => {
  let e: EntornoPruebas;

  beforeAll(async () => {
    e = await iniciarEntornoPruebas();
  });

  afterAll(async () => {
    await e.cerrar();
  });

  it('crea un proyecto y persiste sus datos en la base de datos', async () => {
    const nuevoProyecto = {
      nombre: 'Urbanizacion Nueva Esperanza',
      descripcion: 'Proyecto residencial en el norte',
      ubicacion: 'Santa Cruz, Warnes',
    };

    const resCrear = await request(e.app)
      .post('/api/proyectos')
      .set('Authorization', `Bearer ${e.tokenAdmin}`)
      .send(nuevoProyecto);

    expect(resCrear.status).toBe(201);
    expect(resCrear.body.id).toBeDefined();
    expect(resCrear.body.nombre).toBe(nuevoProyecto.nombre);
    expect(resCrear.body.estado).toBe('BORRADOR');

    const resObtener = await request(e.app)
      .get(`/api/proyectos/${resCrear.body.id}`)
      .set('Authorization', `Bearer ${e.tokenAdmin}`);

    expect(resObtener.status).toBe(200);
    expect(resObtener.body.nombre).toBe(nuevoProyecto.nombre);
    expect(resObtener.body.descripcion).toBe(nuevoProyecto.descripcion);
    expect(resObtener.body.ubicacion).toBe(nuevoProyecto.ubicacion);
    expect(resObtener.body.estado).toBe('BORRADOR');
  });

  it('permite a un asesor ver proyectos publicados pero no los borradores', async () => {
    const resAsesor = await request(e.app)
      .get('/api/proyectos')
      .set('Authorization', `Bearer ${e.tokenAsesor}`);

    expect(resAsesor.status).toBe(200);
    expect(Array.isArray(resAsesor.body)).toBe(true);
    const tieneBorradores = resAsesor.body.some((p: any) => p.estado === 'BORRADOR');
    expect(tieneBorradores).toBe(false);

    const resAdmin = await request(e.app)
      .get('/api/proyectos')
      .set('Authorization', `Bearer ${e.tokenAdmin}`);

    expect(resAdmin.status).toBe(200);
    const tieneBorradorAdmin = resAdmin.body.some((p: any) => p.estado === 'BORRADOR');
    expect(tieneBorradorAdmin).toBe(true);
  });
});
