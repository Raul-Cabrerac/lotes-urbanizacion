import { expect, test } from '@playwright/test';
import { abrirProyecto, iniciarSesionComo, reiniciarDatos } from '../apoyo/sesion';

test.describe('E2E 06 Liberar reserva', () => {
  test.beforeEach(async ({ page, request }) => {
    await reiniciarDatos(request);
    await iniciarSesionComo(page, 'asesor');
    await abrirProyecto(page);
  });

  test('el asesor cancela una reserva activa y el lote vuelve a estar DISPONIBLE', async ({ page }) => {
    await page.getByTestId('poligono-A-03').click();
    await expect(page.getByTestId('detalle-estado')).toHaveText('RESERVADO');

    await page.getByTestId('accion-cancelar-reserva').click();
    await page.getByTestId('confirmar-motivo').fill('El cliente no concreto la compra');
    await page.getByTestId('confirmar-aceptar').click();

    await expect(page.getByTestId('poligono-A-03')).toHaveAttribute('data-estado', 'DISPONIBLE');
    await expect(page.getByTestId('detalle-estado')).toHaveText('DISPONIBLE');
    await expect(page.getByTestId('accion-reservar')).toBeVisible();

    await page.reload();
    await expect(page.getByTestId('poligono-A-03')).toHaveAttribute('data-estado', 'DISPONIBLE');
  });
});
