import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { iniciarEntornoPruebas, type EntornoPruebas } from '../apoyo/entornoPruebas';

describe('Integracion: Clientes', () => {
  let e: EntornoPruebas;

  beforeAll(async () => {
    e = await iniciarEntornoPruebas();
  });

  afterAll(async () => {
    await e.cerrar();
  });

  it('registra un cliente y persiste sus datos en la base de datos', async () => {
    const nuevoCliente = {
      nombreCompleto: 'Gabriel Garcia Marquez',
      documento: '9876543',
      telefono: '77665544',
      email: 'gabriel@literatura.bo',
      direccion: 'Av. Las Palmas 123',
    };

    const resCrear = await request(e.app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${e.tokenAsesor}`)
      .send(nuevoCliente);

    expect(resCrear.status).toBe(201);
    expect(resCrear.body.id).toBeDefined();
    expect(resCrear.body.nombreCompleto).toBe(nuevoCliente.nombreCompleto);
    expect(resCrear.body.documento).toBe(nuevoCliente.documento);

    const resObtener = await request(e.app)
      .get(`/api/clientes/${resCrear.body.id}`)
      .set('Authorization', `Bearer ${e.tokenAsesor}`);

    expect(resObtener.status).toBe(200);
    expect(resObtener.body.id).toBe(resCrear.body.id);
    expect(resObtener.body.nombreCompleto).toBe(nuevoCliente.nombreCompleto);
    expect(resObtener.body.telefono).toBe(nuevoCliente.telefono);
    expect(Array.isArray(resObtener.body.reservas)).toBe(true);
    expect(Array.isArray(resObtener.body.ventas)).toBe(true);
  });

  it('busca clientes por termino de busqueda en nombre o documento', async () => {
    const res = await request(e.app)
      .get('/api/clientes?q=4839201')
      .set('Authorization', `Bearer ${e.tokenAsesor}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].documento).toBe('4839201');
  });
});
