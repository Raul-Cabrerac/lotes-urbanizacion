import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { iniciarEntornoPruebas, type EntornoPruebas } from '../apoyo/entornoPruebas';

describe('Integracion: Reservas', () => {
  let e: EntornoPruebas;

  beforeAll(async () => {
    e = await iniciarEntornoPruebas();
  });

  afterAll(async () => {
    await e.cerrar();
  });

  it('reserva un lote disponible y cambia su estado a RESERVADO', async () => {
    const lotesDisponibles = await request(e.app)
      .get('/api/proyectos/1/lotes?estado=DISPONIBLE')
      .set('Authorization', `Bearer ${e.tokenAsesor}`);

    const loteParaReservar = lotesDisponibles.body[0];

    const resReserva = await request(e.app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${e.tokenAsesor}`)
      .send({
        loteId: loteParaReservar.id,
        clienteId: 1,
        fechaVencimiento: '2026-03-25',
        observacion: 'Reserva para cliente Maria Rene',
      });

    expect(resReserva.status).toBe(201);
    expect(resReserva.body.id).toBeDefined();
    expect(resReserva.body.estado).toBe('ACTIVA');

    const resLote = await request(e.app)
      .get(`/api/lotes/${loteParaReservar.id}`)
      .set('Authorization', `Bearer ${e.tokenAsesor}`);

    expect(resLote.body.estado).toBe('RESERVADO');
    expect(resLote.body.reservaActiva).toBeDefined();
    expect(resLote.body.reservaActiva.id).toBe(resReserva.body.id);
  });

  it('evita la reserva duplicada cuando dos asesores intentan reservar el mismo lote', async () => {
    const lotesDisponibles = await request(e.app)
      .get('/api/proyectos/1/lotes?estado=DISPONIBLE')
      .set('Authorization', `Bearer ${e.tokenAsesor}`);

    const loteObjetivo = lotesDisponibles.body[1];

    const peticion1 = request(e.app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${e.tokenAsesor}`)
      .send({
        loteId: loteObjetivo.id,
        clienteId: 1,
        fechaVencimiento: '2026-03-22',
      });

    const peticion2 = request(e.app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${e.tokenAsesor2}`)
      .send({
        loteId: loteObjetivo.id,
        clienteId: 2,
        fechaVencimiento: '2026-03-22',
      });

    const [res1, res2] = await Promise.all([peticion1, peticion2]);

    const codigos = [res1.status, res2.status].sort();
    expect(codigos).toEqual([201, 409]);

    const error409 = res1.status === 409 ? res1.body : res2.body;
    expect(error409.error.codigo).toBe('LOTE_NO_DISPONIBLE');
  });

  it('cancela una reserva activa y libera el lote devolviendolo a DISPONIBLE', async () => {
    const lotesDisponibles = await request(e.app)
      .get('/api/proyectos/1/lotes?estado=DISPONIBLE')
      .set('Authorization', `Bearer ${e.tokenAsesor}`);

    const lote = lotesDisponibles.body[2];

    const resReserva = await request(e.app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${e.tokenAsesor}`)
      .send({
        loteId: lote.id,
        clienteId: 1,
      });

    expect(resReserva.status).toBe(201);

    const resCancelar = await request(e.app)
      .post(`/api/reservas/${resReserva.body.id}/cancelar`)
      .set('Authorization', `Bearer ${e.tokenAsesor}`)
      .send({ motivo: 'Cliente desestimo el proyecto' });

    expect(resCancelar.status).toBe(200);
    expect(resCancelar.body.estado).toBe('CANCELADA');

    const resLote = await request(e.app)
      .get(`/api/lotes/${lote.id}`)
      .set('Authorization', `Bearer ${e.tokenAsesor}`);

    expect(resLote.body.estado).toBe('DISPONIBLE');
  });
});
