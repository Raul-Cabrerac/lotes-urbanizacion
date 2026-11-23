// Consigna §5, §8 y §13: Venta sobre reserva expirada sin middleware (Incidencia #5).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { UsuarioActual } from '../../src/aplicacion/puertos';
import { crearAppDePrueba, iniciarSesionComo, type AppDePrueba } from '../apoyo/app';
import { buscarCliente, buscarReservaDeLote } from '../apoyo/buscadores';
import { DIAS_PARA_QUE_VENZA_B05, DOCUMENTOS, LOTE_RESERVA_POR_VENCER } from '../apoyo/datosDemo';

describe('POST /api/ventas con reserva expirada', () => {
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

  it('vence la reserva expirada y registra venta directa (reservaId null) incluso para otro cliente', async () => {
    // Arrange
    const reservaB05 = await buscarReservaDeLote(app, asesorToken, LOTE_RESERVA_POR_VENCER);
    const ana = await buscarCliente(app, asesorToken, DOCUMENTOS.ana);
    app.reloj.avanzarDias(DIAS_PARA_QUE_VENZA_B05);
    // Act
    const venta = await app.servicios.ventas.registrar(
      { loteId: reservaB05.loteId, clienteId: ana.id, modalidad: 'CONTADO' },
      asesor,
    );
    // Assert
    expect(venta.estado).toBe('VIGENTE');
    expect(venta.reservaId).toBeNull();
    expect(venta.clienteId).toBe(ana.id);
    // Se lee sin pasar por la API: su middleware vence las reservas en cada petición.
    const reservaDespues = await app.servicios.reservas.obtener(reservaB05.id);
    expect(reservaDespues.estado).toBe('VENCIDA');
    const loteDespues = await app.servicios.lotes.obtenerDetalle(reservaB05.loteId, asesor);
    expect(loteDespues.estado).toBe('VENDIDO');
  });
});
