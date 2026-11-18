import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { iniciarEntornoPruebas, type EntornoPruebas } from '../apoyo/entornoPruebas';

describe('Integracion: Ventas y Pagos', () => {
  let e: EntornoPruebas;

  beforeAll(async () => {
    e = await iniciarEntornoPruebas();
  });

  afterAll(async () => {
    await e.cerrar();
  });

  it('simula un plan de pagos antes de registrar la venta sin guardar datos', async () => {
    const res = await request(e.app)
      .post('/api/ventas/simular-plan')
      .set('Authorization', `Bearer ${e.tokenAsesor}`)
      .send({
        precioPactado: 60000,
        modalidad: 'FINANCIADO',
        cuotaInicial: 12000,
        numeroCuotas: 12,
      });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(13);
    expect(res.body[0].numero).toBe(0);
    expect(res.body[0].monto).toBe(12000);
    expect(res.body[1].monto).toBe(4000);
  });

  it('registra una venta al contado y comprueba que el lote pase a VENDIDO', async () => {
    const lotesDisponibles = await request(e.app)
      .get('/api/proyectos/1/lotes?estado=DISPONIBLE')
      .set('Authorization', `Bearer ${e.tokenAsesor}`);

    const lote = lotesDisponibles.body[0];

    const resVenta = await request(e.app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${e.tokenAsesor}`)
      .send({
        loteId: lote.id,
        clienteId: 1,
        modalidad: 'CONTADO',
        precioPactado: 65000,
        metodoPago: 'TRANSFERENCIA',
      });

    expect(resVenta.status).toBe(201);
    expect(resVenta.body.id).toBeDefined();
    expect(resVenta.body.modalidad).toBe('CONTADO');
    expect(resVenta.body.precioPactado).toBe(65000);
    expect(resVenta.body.resumen.saldada).toBe(true);
    expect(resVenta.body.resumen.totalPagado).toBe(65000);
    expect(resVenta.body.resumen.saldoPendiente).toBe(0);

    const resLote = await request(e.app)
      .get(`/api/lotes/${lote.id}`)
      .set('Authorization', `Bearer ${e.tokenAsesor}`);

    expect(resLote.body.estado).toBe('VENDIDO');
  });

  it('registra una venta financiada, persiste sus cuotas, registra un pago y recalcula saldo', async () => {
    const lotesDisponibles = await request(e.app)
      .get('/api/proyectos/1/lotes?estado=DISPONIBLE')
      .set('Authorization', `Bearer ${e.tokenAsesor}`);

    const lote = lotesDisponibles.body[1];

    const resVenta = await request(e.app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${e.tokenAsesor}`)
      .send({
        loteId: lote.id,
        clienteId: 2,
        modalidad: 'FINANCIADO',
        precioPactado: 60000,
        cuotaInicial: 12000,
        numeroCuotas: 12,
        metodoPago: 'EFECTIVO',
      });

    expect(resVenta.status).toBe(201);
    const ventaId = resVenta.body.id;
    expect(resVenta.body.cuotas).toHaveLength(13);
    expect(resVenta.body.resumen.totalPagado).toBe(12000);
    expect(resVenta.body.resumen.saldoPendiente).toBe(48000);

    const cuota1 = resVenta.body.cuotas.find((c: any) => c.numero === 1);
    expect(cuota1).toBeDefined();

    const resPago = await request(e.app)
      .post(`/api/ventas/${ventaId}/pagos`)
      .set('Authorization', `Bearer ${e.tokenAsesor}`)
      .send({
        cuotaId: cuota1.id,
        monto: cuota1.monto,
        metodo: 'QR',
        referencia: 'Pago de cuota 1 verificado',
      });

    expect(resPago.status).toBe(201);
    expect(resPago.body.resumen.totalPagado).toBe(16000);
    expect(resPago.body.resumen.saldoPendiente).toBe(44000);
    expect(resPago.body.resumen.cuotasPagadas).toBe(2);

    const cuota1Actualizada = resPago.body.cuotas.find((c: any) => c.id === cuota1.id);
    expect(cuota1Actualizada.estado).toBe('PAGADA');
  });

  it('permite a un administrador anular un pago con motivo y el saldo se actualiza dinamicamente', async () => {
    const ventaExistente = await request(e.app)
      .get('/api/ventas/1')
      .set('Authorization', `Bearer ${e.tokenAdmin}`);

    const saldoAnterior = ventaExistente.body.resumen.saldoPendiente;
    const pagoAnulable = ventaExistente.body.pagos.find((p: any) => p.estado === 'VALIDO' && p.cuotaNumero > 0);

    if (pagoAnulable) {
      const resAnular = await request(e.app)
        .post(`/api/pagos/${pagoAnulable.id}/anular`)
        .set('Authorization', `Bearer ${e.tokenAdmin}`)
        .send({ motivo: 'Comprobante bancario rebotado por fondos' });

      expect(resAnular.status).toBe(200);

      const ventaActualizada = await request(e.app)
        .get('/api/ventas/1')
        .set('Authorization', `Bearer ${e.tokenAdmin}`);

      expect(ventaActualizada.body.resumen.saldoPendiente).toBe(saldoAnterior + pagoAnulable.monto);
    }
  });
});
