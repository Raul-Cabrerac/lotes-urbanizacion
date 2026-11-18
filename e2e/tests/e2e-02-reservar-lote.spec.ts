import { expect, test } from '@playwright/test';
import { abrirProyecto, iniciarSesionComo, reiniciarDatos } from '../apoyo/sesion';

test.describe('E2E 02 Reservar lote', () => {
  test.beforeEach(async ({ page, request }) => {
    await reiniciarDatos(request);
    await iniciarSesionComo(page, 'asesor');
    await abrirProyecto(page);
  });

  test('el asesor reserva un lote disponible para un nuevo cliente y pasa a RESERVADO', async ({ page }) => {
    await page.getByTestId('poligono-C-02').click();
    await expect(page.getByTestId('detalle-estado')).toHaveText('DISPONIBLE');

    await page.getByTestId('accion-reservar').click();
    await page.getByTestId('reserva-cliente-nuevo').click();

    await page.getByTestId('cliente-nombre').fill('Carlos Mendoza');
    await page.getByTestId('cliente-documento').fill('8899776');
    await page.getByTestId('cliente-telefono').fill('75551234');
    await page.getByTestId('cliente-guardar').click();

    await page.getByTestId('reserva-confirmar').click();

    await expect(page.getByTestId('poligono-C-02')).toHaveAttribute('data-estado', 'RESERVADO');
    await expect(page.getByTestId('detalle-estado')).toHaveText('RESERVADO');

    await page.reload();
    await expect(page.getByTestId('poligono-C-02')).toHaveAttribute('data-estado', 'RESERVADO');
  });
});
