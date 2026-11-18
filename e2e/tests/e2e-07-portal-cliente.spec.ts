import { expect, test } from '@playwright/test';
import { iniciarSesionComo, reiniciarDatos } from '../apoyo/sesion';

test.describe('E2E 07 Portal de consulta del cliente', () => {
  test.beforeEach(async ({ page, request }) => {
    await reiniciarDatos(request);
    await iniciarSesionComo(page, 'cliente');
  });

  test('el cliente visualiza su lote sus compras en mapa y su plan de pagos con saldo de 55000', async ({ page }) => {
    await expect(page.getByTestId('mi-compra-A-05')).toBeVisible();
    await expect(page.getByTestId('mi-compra-saldo')).toContainText('55.000');
    await expect(page.getByTestId('mi-mapa')).toBeVisible();

    await page.getByTestId('mi-plan-A-05').click();

    await expect(page.getByTestId('venta-saldo')).toContainText('55.000');
    await expect(page.getByTestId('cuota-1')).toHaveAttribute('data-estado', 'PAGADA');
  });
});
