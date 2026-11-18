// Consigna §13: Anulación de pagos y consistencia con venta ANULADA (Incidencia #3).
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { crearAppInterceptable, iniciarSesion, type AppInterceptable } from '../apoyo/app';
import { buscarVentaDeLote } from '../apoyo/buscadores';

describe('POST /api/pagos/:id/anular', () => {
  let app: AppInterceptable;
  let adminToken: string;

  beforeEach(async () => {
    app = await crearAppInterceptable();
    adminToken = await iniciarSesion(app, 'admin@lotes.bo', 'admin123');
  });

  afterEach(async () => {
    await app.cerrar();
  });

  it('responde 409 VENTA_NO_VIGENTE y conserva el pago VALIDO al intentar anular un pago de una venta ya ANULADA', async () => {
    // Arrange
    const venta = await buscarVentaDeLote(app, adminToken, 'A-05');
    const pagoValido = venta.pagos.find((p) => p.estado === 'VALIDO');
    expect(pagoValido).toBeDefined();
    await request(app.express)
      .post(`/api/ventas/${venta.id}/anular`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ motivo: 'Cliente desistió de la compra' })
      .expect(200);
    // Act
    const respuesta = await request(app.express)
      .post(`/api/pagos/${pagoValido?.id}/anular`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ motivo: 'Intento tras anulación de venta' });
    // Assert
    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error.codigo).toBe('VENTA_NO_VIGENTE');
    const ventaActualizada = await request(app.express)
      .get(`/api/ventas/${venta.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(ventaActualizada.body.resumen.totalPagado).toBe(venta.resumen.totalPagado);
    expect(ventaActualizada.body.resumen.saldoPendiente).toBe(venta.resumen.saldoPendiente);
    expect(ventaActualizada.body.pagos.find((p: { id: number }) => p.id === pagoValido?.id).estado).toBe('VALIDO');
  });

  it('responde 409 VENTA_NO_VIGENTE si la venta se anula concurrentemente antes de bloquearla al anular el pago', async () => {
    // Arrange
    const venta = await buscarVentaDeLote(app, adminToken, 'A-05');
    const pagoValido = venta.pagos.find((p) => p.estado === 'VALIDO');
    let intercalado = false;
    app.alInterceptarDespues(async (texto, _params, ejecutar, filas) => {
      if (!intercalado && texto.includes('FROM pagos pg JOIN cuotas cu') && texto.includes('WHERE pg.id = $1')) {
        intercalado = true;
        const fila = (filas?.[0] as { venta_id: number } | undefined);
        if (fila) {
          await ejecutar(
            "UPDATE ventas SET estado = 'ANULADA', motivo_anulacion = 'Anulada en carrera' WHERE id = $1",
            [fila.venta_id],
          );
        }
      }
    });
    // Act
    const respuesta = await request(app.express)
      .post(`/api/pagos/${pagoValido?.id}/anular`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ motivo: 'Anulación concurrente con anular venta' });
    // Assert
    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error.codigo).toBe('VENTA_NO_VIGENTE');
  });
});
