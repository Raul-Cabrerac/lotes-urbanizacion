// Consigna §5, §8 y §13: Venta sobre reserva expirada sin middleware (Incidencia #5).
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { crearAppDePrueba, iniciarSesion, type AppDePrueba } from '../apoyo/app';
import { buscarCliente, buscarReservaDeLote } from '../apoyo/buscadores';

describe('POST /api/ventas con reserva expirada', () => {
  let app: AppDePrueba;
  let asesorToken: string;

  beforeEach(async () => {
    app = await crearAppDePrueba();
    asesorToken = await iniciarSesion(app, 'asesor@lotes.bo', 'asesor123');
  });

  afterEach(async () => {
    await app.cerrar();
  });

  it('vence la reserva expirada y registra venta directa (reservaId null) incluso para otro cliente', async () => {
    // Arrange
    const reservaB05 = await buscarReservaDeLote(app, asesorToken, 'B-05');
    const ana = await buscarCliente(app, asesorToken, '5512893');
    const usuario = await app.servicios.auth.usuarioDesdeToken(asesorToken);
    app.reloj.avanzarDias(5); // B-05 vencía en 3 días
    // Act
    const venta = await app.servicios.ventas.registrar(
      { loteId: reservaB05.loteId, clienteId: ana.id, modalidad: 'CONTADO' },
      usuario,
    );
    // Assert
    expect(venta.estado).toBe('VIGENTE');
    expect(venta.reservaId).toBeNull();
    expect(venta.clienteId).toBe(ana.id);
    const reservaDespues = await request(app.express)
      .get(`/api/reservas/${reservaB05.id}`)
      .set('Authorization', `Bearer ${asesorToken}`)
      .expect(200);
    expect(reservaDespues.body.estado).toBe('VENCIDA');
    const loteDespues = await request(app.express)
      .get(`/api/lotes/${reservaB05.loteId}`)
      .set('Authorization', `Bearer ${asesorToken}`)
      .expect(200);
    expect(loteDespues.body.estado).toBe('VENDIDO');
  });
});
