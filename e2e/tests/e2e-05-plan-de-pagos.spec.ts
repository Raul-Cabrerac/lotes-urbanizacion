// Consigna §14: E2E 05 - Plan de pagos (venta financiada, cronograma, pago y nuevo saldo).
import { expect, test } from '@playwright/test';
import { esperarRespuestaApi } from '../apoyo/api';
import { seleccionarLote } from '../apoyo/mapa';
import { abrirProyecto, iniciarSesionComo, reiniciarDatos } from '../apoyo/sesion';

test.describe('E2E 05 · Plan de pagos', () => {
  test.beforeEach(async ({ page, request }) => {
    await reiniciarDatos(request);
    await iniciarSesionComo(page, 'asesor');
    await abrirProyecto(page);
  });

  test('registra el pago de una cuota de la venta financiada: queda PAGADA y el saldo baja', async ({ page }) => {
    // Arrange: venta financiada de A-02 (Bs 72.000) con cuota inicial de Bs 12.000 y 12 cuotas de Bs 5.000
    await seleccionarLote(page, 'A-02');
    await page.getByTestId('accion-vender').click();
    await page.getByTestId('venta-cliente').selectOption({ label: 'Ana Lucía Rojas (5512893)' });
    await page.getByTestId('venta-financiado').check();
    await page.getByTestId('venta-cuota-inicial').fill('12000');
    await page.getByTestId('venta-numero-cuotas').fill('12');
    await page.getByTestId('venta-confirmar').click();
    await page.getByTestId('detalle-ver-venta').click();
    await expect(page.getByTestId('cuota-0')).toHaveAttribute('data-estado', 'PAGADA'); // la inicial, al firmar
    await expect(page.getByTestId('cuota-12')).toHaveAttribute('data-estado', 'PENDIENTE'); // cronograma de 12 cuotas
    await expect(page.getByTestId('venta-saldo')).toHaveText('Bs 60.000');
    // Act
    await page.getByTestId('pagar-cuota-1').click();
    await page.getByTestId('pago-confirmar').click();
    // Assert
    await expect(page.getByTestId('cuota-1')).toHaveAttribute('data-estado', 'PAGADA');
    await expect(page.getByTestId('venta-total-pagado')).toHaveText('Bs 17.000');
    await expect(page.getByTestId('venta-saldo')).toHaveText('Bs 55.000');
    await page.reload();
    await expect(page.getByTestId('cuota-1')).toHaveAttribute('data-estado', 'PAGADA');
    await expect(page.getByTestId('venta-saldo')).toHaveText('Bs 55.000');
  });

  test('rechaza un pago mayor al saldo y el saldo no cambia', async ({ page }) => {
    // Arrange: la venta de A-05 tiene saldo Bs 55.000; se intenta pagar Bs 0,01 más (caso límite)
    await seleccionarLote(page, 'A-05');
    await page.getByTestId('detalle-ver-venta').click();
    await page.getByTestId('pagar-cuota-2').click();
    await page.getByTestId('pago-monto').fill('55000.01');
    const respuesta = esperarRespuestaApi(page, 'POST', '/pagos');
    // Act
    await page.getByTestId('pago-confirmar').click();
    // Assert
    expect(await respuesta).toEqual({ estado: 422, codigo: 'MONTO_EXCEDE_SALDO' });
    await expect(page.getByTestId('pago-error')).toBeVisible();
    await page.getByTestId('pago-cancelar').click();
    await expect(page.getByTestId('venta-saldo')).toHaveText('Bs 55.000');
  });
});
