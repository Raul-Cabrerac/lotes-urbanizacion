import { expect, test } from '@playwright/test';
import { abrirProyecto, iniciarSesionComo, reiniciarDatos } from '../apoyo/sesion';

test.describe('E2E 05 Plan de pagos', () => {
  test.beforeEach(async ({ page, request }) => {
    await reiniciarDatos(request);
    await iniciarSesionComo(page, 'asesor');
    await abrirProyecto(page);
  });

  test('se registra venta financiada se genera cronograma y se registra pago de cuota', async ({ page }) => {
    await page.getByTestId('poligono-A-02').click();
    await page.getByTestId('accion-vender').click();

    await page.getByTestId('venta-cliente').selectOption({ index: 1 });
    await page.getByTestId('venta-financiado').click();
    await page.getByTestId('venta-cuota-inicial').fill('10000');
    await page.getByTestId('venta-numero-cuotas').fill('12');
    await page.getByTestId('venta-confirmar').click();

    await expect(page.getByTestId('poligono-A-02')).toHaveAttribute('data-estado', 'VENDIDO');

    await page.getByTestId('detalle-ver-venta').click();
    await expect(page.getByTestId('venta-total-pagado')).toContainText('10.000');

    await page.getByTestId('pagar-cuota-1').click();
    await page.getByTestId('pago-confirmar').click();

    await expect(page.getByTestId('cuota-1')).toHaveAttribute('data-estado', 'PAGADA');

    await page.reload();
    await expect(page.getByTestId('cuota-1')).toHaveAttribute('data-estado', 'PAGADA');
  });
});
