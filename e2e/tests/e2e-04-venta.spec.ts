import { expect, test } from '@playwright/test';
import { abrirProyecto, iniciarSesionComo, reiniciarDatos } from '../apoyo/sesion';

test.describe('E2E 04 Venta al contado', () => {
  test.beforeEach(async ({ page, request }) => {
    await reiniciarDatos(request);
    await iniciarSesionComo(page, 'asesor');
    await abrirProyecto(page);
  });

  test('el asesor vende un lote al contado y pasa a estado VENDIDO', async ({ page }) => {
    await page.getByTestId('poligono-A-01').click();
    await expect(page.getByTestId('detalle-estado')).toHaveText('DISPONIBLE');

    await page.getByTestId('accion-vender').click();
    await page.getByTestId('venta-cliente').selectOption({ index: 1 });
    await page.getByTestId('venta-contado').click();
    await page.getByTestId('venta-confirmar').click();

    await expect(page.getByTestId('poligono-A-01')).toHaveAttribute('data-estado', 'VENDIDO');

    await page.getByTestId('detalle-ver-venta').click();
    await expect(page.getByTestId('venta-estado')).toHaveText('VIGENTE');
    await expect(page.getByTestId('venta-precio-pactado')).toBeVisible();

    await page.reload();
    await expect(page.getByTestId('venta-estado')).toHaveText('VIGENTE');
  });
});
