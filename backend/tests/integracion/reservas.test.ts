// Consigna §5 y §13: Reservas vencidas no se cancelan y se ordenan de forma determinista (Incidencia #5).
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { crearAppDePrueba, iniciarSesion, type AppDePrueba } from '../apoyo/app';
import { buscarCliente, buscarLote, buscarReservaDeLote } from '../apoyo/buscadores';

describe('Ciclo de vida de reservas vencidas', () => {
  let app: AppDePrueba;
  let asesorToken: string;

  beforeEach(async () => {
    app = await crearAppDePrueba();
    asesorToken = await iniciarSesion(app, 'asesor@lotes.bo', 'asesor123');
  });

  afterEach(async () => {
    await app.cerrar();
  });

  it('vence la reserva y rechaza cancelar con 409 RESERVA_NO_ACTIVA si venció al momento de cancelar', async () => {
    // Arrange
    const reservaB05 = await buscarReservaDeLote(app, asesorToken, 'B-05');
    const usuario = await app.servicios.auth.usuarioDesdeToken(asesorToken);
    app.reloj.avanzarDias(5); // B-05 vencía en 3 días
    // Act + Assert
    await expect(app.servicios.reservas.cancelar(reservaB05.id, 'Cancelación tardía', usuario)).rejects.toMatchObject({
      codigo: 'RESERVA_NO_ACTIVA',
    });
    const reservaDespues = await request(app.express)
      .get(`/api/reservas/${reservaB05.id}`)
      .set('Authorization', `Bearer ${asesorToken}`)
      .expect(200);
    expect(reservaDespues.body.estado).toBe('VENCIDA');
    const loteDespues = await request(app.express)
      .get(`/api/lotes/${reservaB05.loteId}`)
      .set('Authorization', `Bearer ${asesorToken}`)
      .expect(200);
    expect(loteDespues.body.estado).toBe('DISPONIBLE');
  });

  it('vence la reserva expirada y permite reservar nuevamente el lote cuando venció sin correr middleware', async () => {
    // Arrange
    const reservaB05 = await buscarReservaDeLote(app, asesorToken, 'B-05');
    const ana = await buscarCliente(app, asesorToken, '5512893');
    const usuario = await app.servicios.auth.usuarioDesdeToken(asesorToken);
    app.reloj.avanzarDias(5);
    // Act
    const nueva = await app.servicios.reservas.crear({ loteId: reservaB05.loteId, clienteId: ana.id }, usuario);
    // Assert
    expect(nueva.estado).toBe('ACTIVA');
    expect(nueva.cliente.id).toBe(ana.id);
    const anterior = await request(app.express)
      .get(`/api/reservas/${reservaB05.id}`)
      .set('Authorization', `Bearer ${asesorToken}`)
      .expect(200);
    expect(anterior.body.estado).toBe('VENCIDA');
  });

  it('lista las reservas vencidas en orden determinista (ORDER BY id) al ejecutar procesarVencidas', async () => {
    // Arrange
    const a01 = await buscarLote(app, asesorToken, 'A-01');
    const a02 = await buscarLote(app, asesorToken, 'A-02');
    const maria = await buscarCliente(app, asesorToken, '4839201');
    await request(app.express)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${asesorToken}`)
      .send({ loteId: a01.id, clienteId: maria.id, fechaVencimiento: '2026-03-16' })
      .expect(201);
    await request(app.express)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${asesorToken}`)
      .send({ loteId: a02.id, clienteId: maria.id, fechaVencimiento: '2026-03-16' })
      .expect(201);
    const consultasSql: string[] = [];
    const origQuery = app.bd.sql.query.bind(app.bd.sql);
    app.bd.sql.query = async <T>(sql: string, params?: unknown[]) => {
      if (sql.includes('fecha_vencimiento < $1::date')) consultasSql.push(sql);
      return origQuery<T>(sql, params);
    };
    app.reloj.avanzarDias(5);
    // Act
    const vencidas = await app.servicios.reservas.procesarVencidas();
    // Assert
    expect(vencidas).toBeGreaterThanOrEqual(2);
    expect(consultasSql[0]).toMatch(/ORDER BY\s+id/i);
  });
});
