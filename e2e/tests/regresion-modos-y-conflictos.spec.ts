// Consigna §4 y §7: regresión de la incidencia #6 (modos del mapa y sincronización tras un conflicto 409).
import { expect, test } from '@playwright/test';
import { abrirProyecto, iniciarSesionComo, reiniciarDatos, tokenApi } from '../apoyo/sesion';

test.describe('Regresión UI · modos del mapa y conflictos 409', () => {
  test.beforeEach(async ({ request }) => {
    await reiniciarDatos(request);
  });

  test('sale del modo dibujo al seleccionar otro lote desde el panel', async ({ page }) => {
    // Arrange
    await iniciarSesionComo(page, 'admin');
    await abrirProyecto(page);
    await page.getByTestId('dibujar-lote').click();
    await expect(page.getByTestId('aviso-dibujo')).toBeVisible();
    // Act
    await page.getByTestId('item-lote-C-02').click();
    // Assert
    await expect(page.getByTestId('aviso-dibujo')).toBeHidden();
    await expect(page.getByTestId('panel-lote')).toBeVisible();
  });

  test('oculta las acciones comerciales mientras se edita la forma del lote', async ({ page }) => {
    // Arrange
    await iniciarSesionComo(page, 'admin');
    await abrirProyecto(page);
    await page.getByTestId('item-lote-C-02').click();
    await expect(page.getByTestId('accion-reservar')).toBeVisible();
    await expect(page.getByTestId('accion-vender')).toBeVisible();
    // Act
    await page.getByTestId('accion-editar-forma').click();
    // Assert
    await expect(page.getByTestId('aviso-edicion')).toBeVisible();
    await expect(page.getByTestId('cancelar-forma')).toBeVisible();
    await expect(page.getByTestId('accion-reservar')).toBeHidden();
    await expect(page.getByTestId('accion-vender')).toBeHidden();
  });

  test('cancela la edición de forma al abrir un diálogo del proyecto', async ({ page }) => {
    // Arrange
    await iniciarSesionComo(page, 'admin');
    await abrirProyecto(page);
    await page.getByTestId('item-lote-C-02').click();
    await page.getByTestId('accion-editar-forma').click();
    await expect(page.getByTestId('aviso-edicion')).toBeVisible();
    // Act
    await page.getByTestId('editar-proyecto').click();
    // Assert
    await expect(page.getByTestId('modal-proyecto')).toBeVisible();
    await expect(page.getByTestId('aviso-edicion')).toBeHidden();
  });

  test('sincroniza VentaDetalle cuando ModalPago recibe 409 porque la venta fue anulada', async ({ page, request }) => {
    // Arrange
    await iniciarSesionComo(page, 'asesor');
    const adminToken = await tokenApi(request, 'admin');
    const ventasRes = await request.get('/api/ventas', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const ventas = (await ventasRes.json()) as { id: number; lote: { codigo: string } }[];
    const ventaA05 = ventas.find((v) => v.lote.codigo === 'A-05');
    expect(ventaA05).toBeDefined();
    await page.goto(`/ventas/${ventaA05?.id}`);
    await expect(page.getByTestId('venta-estado')).toHaveAttribute('data-estado', 'VIGENTE');
    await page.getByTestId('pagar-cuota-2').click();
    await expect(page.getByTestId('modal-pago')).toBeVisible();
    // Otro actor anula la venta mientras ModalPago está abierto
    const anulacion = await request.post(`/api/ventas/${ventaA05?.id}/anular`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { motivo: 'Anulación concurrente desde otro usuario' },
    });
    expect(anulacion.status()).toBe(200);
    // Act
    await page.getByTestId('pago-confirmar').click();
    // Assert: muestra error en el modal y al cerrar ya refleja estado ANULADA sin recargar
    await expect(page.getByTestId('pago-error')).toBeVisible();
    await page.getByTestId('pago-cancelar').click();
    await expect(page.getByTestId('venta-estado')).toHaveAttribute('data-estado', 'ANULADA');
  });

  test('sincroniza Reservas cuando confirmar cancelación recibe 409 por cierre previo', async ({ page, request }) => {
    // Arrange
    await iniciarSesionComo(page, 'asesor');
    const adminToken = await tokenApi(request, 'admin');
    const reservasRes = await request.get('/api/reservas?estado=ACTIVA', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const reservas = (await reservasRes.json()) as { id: number; lote: { codigo: string } }[];
    const reservaA03 = reservas.find((r) => r.lote.codigo === 'A-03');
    expect(reservaA03).toBeDefined();
    await page.goto('/reservas');
    await expect(page.getByTestId('fila-reserva-A-03')).toBeVisible();
    await page.getByTestId('cancelar-reserva-A-03').click();
    const modal = page.getByTestId('modal-confirmar');
    await expect(modal.getByTestId('confirmar-aceptar')).toBeVisible();
    // Otro usuario cancela antes
    const cancelRes = await request.post(`/api/reservas/${reservaA03?.id}/cancelar`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { motivo: 'Cancelada por otro usuario' },
    });
    expect(cancelRes.status()).toBe(200);
    // Act
    await modal.getByTestId('confirmar-aceptar').click();
    // Assert: el error se ve en el modal y, al cerrarlo, la tabla de Activas ya no tiene la fila
    await expect(modal.getByTestId('mensaje-error')).toBeVisible();
    await modal.getByTestId('confirmar-cancelar').click();
    await expect(page.getByTestId('tabla-reservas')).toBeVisible();
    await expect(page.getByTestId('fila-reserva-A-03')).toBeHidden();
  });
});
