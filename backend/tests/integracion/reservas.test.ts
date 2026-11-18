// Consigna §5 y §13: Reservas vencidas no se cancelan y se ordenan de forma determinista (Incidencia #5).
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { UsuarioActual } from '../../src/aplicacion/puertos';
import { crearAppDePrueba, iniciarSesionComo, type AppDePrueba } from '../apoyo/app';
import { buscarCliente, buscarLote, buscarReservaDeLote } from '../apoyo/buscadores';
import {
  DIAS_PARA_QUE_VENZA_B05,
  DOCUMENTOS,
  LOTE_DISPONIBLE,
  LOTE_RESERVA_POR_VENCER,
  OTRO_LOTE_DISPONIBLE,
} from '../apoyo/datosDemo';
import { MANIANA } from '../apoyo/dobles';

/*
 * Después de actuar, estas pruebas leen con app.servicios y no con un GET: el middleware de app.ts
 * vence las reservas antes de cada petición, y ocultaría un vencimiento que no quedó guardado.
 */
describe('Ciclo de vida de reservas vencidas', () => {
  let app: AppDePrueba;
  let asesorToken: string;
  let asesor: UsuarioActual;

  beforeEach(async () => {
    app = await crearAppDePrueba();
    asesorToken = await iniciarSesionComo(app, 'ASESOR');
    asesor = await app.servicios.auth.usuarioDesdeToken(asesorToken);
  });

  afterEach(async () => {
    await app.cerrar();
  });

  it('vence la reserva y rechaza cancelar con 409 RESERVA_NO_ACTIVA si venció al momento de cancelar', async () => {
    // Arrange
    const reservaB05 = await buscarReservaDeLote(app, asesorToken, LOTE_RESERVA_POR_VENCER);
    app.reloj.avanzarDias(DIAS_PARA_QUE_VENZA_B05);
    // Act + Assert
    await expect(app.servicios.reservas.cancelar(reservaB05.id, 'Cancelación tardía', asesor)).rejects.toMatchObject({
      codigo: 'RESERVA_NO_ACTIVA',
    });
    const reservaDespues = await app.servicios.reservas.obtener(reservaB05.id);
    expect(reservaDespues.estado).toBe('VENCIDA');
    const loteDespues = await app.servicios.lotes.obtenerDetalle(reservaB05.loteId, asesor);
    expect(loteDespues.estado).toBe('DISPONIBLE');
  });

  it('vence la reserva expirada y permite reservar nuevamente el lote cuando venció sin correr middleware', async () => {
    // Arrange
    const reservaB05 = await buscarReservaDeLote(app, asesorToken, LOTE_RESERVA_POR_VENCER);
    const ana = await buscarCliente(app, asesorToken, DOCUMENTOS.ana);
    app.reloj.avanzarDias(DIAS_PARA_QUE_VENZA_B05);
    // Act
    const nueva = await app.servicios.reservas.crear({ loteId: reservaB05.loteId, clienteId: ana.id }, asesor);
    // Assert
    expect(nueva.estado).toBe('ACTIVA');
    expect(nueva.cliente.id).toBe(ana.id);
    const anterior = await app.servicios.reservas.obtener(reservaB05.id);
    expect(anterior.estado).toBe('VENCIDA');
  });

  it('vence exactamente las 3 reservas cuyo plazo pasó y libera sus lotes al ejecutar procesarVencidas', async () => {
    // Arrange
    const a01 = await buscarLote(app, asesorToken, LOTE_DISPONIBLE);
    const a02 = await buscarLote(app, asesorToken, OTRO_LOTE_DISPONIBLE);
    const b05 = await buscarLote(app, asesorToken, LOTE_RESERVA_POR_VENCER);
    const maria = await buscarCliente(app, asesorToken, DOCUMENTOS.maria);
    const reservarHastaManiana = (loteId: number) =>
      request(app.express)
        .post('/api/reservas')
        .set('Authorization', `Bearer ${asesorToken}`)
        .send({ loteId, clienteId: maria.id, fechaVencimiento: MANIANA })
        .expect(201);
    await reservarHastaManiana(a01.id);
    await reservarHastaManiana(a02.id);
    app.reloj.avanzarDias(DIAS_PARA_QUE_VENZA_B05); // vencen A-01, A-02 y B-05; la de A-03 (7 días) sigue activa
    // Act
    const vencidas = await app.servicios.reservas.procesarVencidas();
    // Assert
    expect(vencidas).toBe(3);
    const estados = await Promise.all(
      [a01, a02, b05].map(async (lote) => (await app.servicios.lotes.obtenerDetalle(lote.id, asesor)).estado),
    );
    expect(estados).toEqual(['DISPONIBLE', 'DISPONIBLE', 'DISPONIBLE']);
  });
});
