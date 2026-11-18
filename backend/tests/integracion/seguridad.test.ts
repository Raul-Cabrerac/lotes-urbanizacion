import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { iniciarEntornoPruebas, type EntornoPruebas } from '../apoyo/entornoPruebas';

describe('Integracion: Seguridad y Roles', () => {
  let e: EntornoPruebas;

  beforeAll(async () => {
    e = await iniciarEntornoPruebas();
  });

  afterAll(async () => {
    await e.cerrar();
  });

  it('rechaza con 401 peticiones sin token o con token invalido', async () => {
    const resSinToken = await request(e.app).get('/api/proyectos');
    expect(resSinToken.status).toBe(401);
    expect(resSinToken.body.error.codigo).toBe('NO_AUTENTICADO');

    const resTokenInvalido = await request(e.app)
      .get('/api/proyectos')
      .set('Authorization', 'Bearer token_falso_o_corrupto');

    expect(resTokenInvalido.status).toBe(401);
    expect(resTokenInvalido.body.error.codigo).toBe('TOKEN_INVALIDO');
  });

  it('rechaza con 403 cuando un asesor intenta realizar acciones de administrador', async () => {
    const resCrearProyecto = await request(e.app)
      .post('/api/proyectos')
      .set('Authorization', `Bearer ${e.tokenAsesor}`)
      .send({
        nombre: 'Proyecto No Autorizado',
        descripcion: 'Intento de asesor',
        ubicacion: 'Santa Cruz',
      });

    expect(resCrearProyecto.status).toBe(403);
    expect(resCrearProyecto.body.error.codigo).toBe('SIN_PERMISO');

    const resUsuarios = await request(e.app)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${e.tokenAsesor}`);

    expect(resUsuarios.status).toBe(403);
    expect(resUsuarios.body.error.codigo).toBe('SIN_PERMISO');
  });

  it('permite a un cliente consultar su portal con sus compras y reservas propias', async () => {
    const resPortal = await request(e.app)
      .get('/api/portal/mis-operaciones')
      .set('Authorization', `Bearer ${e.tokenCliente}`);

    expect(resPortal.status).toBe(200);
    expect(resPortal.body.cliente).toBeDefined();
    expect(Array.isArray(resPortal.body.ventas)).toBe(true);
    expect(Array.isArray(resPortal.body.reservas)).toBe(true);
    expect(resPortal.body.ventas.length).toBeGreaterThan(0);
  });

  it('rechaza con 403 cuando un cliente intenta consultar una venta perteneciente a otro cliente', async () => {
    const ventasCliente2 = await request(e.app)
      .get('/api/ventas?clienteId=2')
      .set('Authorization', `Bearer ${e.tokenAdmin}`);

    const ventaAjena = ventasCliente2.body[0];
    expect(ventaAjena).toBeDefined();

    const resAccesoAjeno = await request(e.app)
      .get(`/api/ventas/${ventaAjena.id}`)
      .set('Authorization', `Bearer ${e.tokenCliente}`);

    expect(resAccesoAjeno.status).toBe(403);
    expect(resAccesoAjeno.body.error.codigo).toBe('SIN_PERMISO');
  });

  it('rechaza con 403 cuando un cliente intenta acceder a la gestion de usuarios o lotes', async () => {
    const resUsuarios = await request(e.app)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${e.tokenCliente}`);

    expect(resUsuarios.status).toBe(403);
    expect(resUsuarios.body.error.codigo).toBe('SIN_PERMISO');

    const resCrearLote = await request(e.app)
      .post('/api/proyectos/1/lotes')
      .set('Authorization', `Bearer ${e.tokenCliente}`)
      .send({ codigo: 'X-01' });

    expect(resCrearLote.status).toBe(403);
    expect(resCrearLote.body.error.codigo).toBe('SIN_PERMISO');
  });
});
