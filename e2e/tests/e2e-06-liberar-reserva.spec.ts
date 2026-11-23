// Consigna §14: E2E 06 - Liberar reserva (consigna §5: cancelar o vencer devuelve el lote a DISPONIBLE).
import { expect, test } from '@playwright/test';
import { seleccionarLote } from '../apoyo/mapa';
import { abrirProyecto, iniciarSesionComo, reiniciarDatos } from '../apoyo/sesion';

test.describe('E2E 06 · Liberar reserva', () => {
  test.beforeEach(async ({ page, request }) => {
    await reiniciarDatos(request);
    await iniciarSesionComo(page, 'asesor');
    await abrirProyecto(page);
  });

  test('cancela una reserva sin venta y el lote vuelve a DISPONIBLE para reservarse de nuevo', async ({ page }) => {
    // Arrange: A-03 está reservado para María y no tiene venta
    await seleccionarLote(page, 'A-03');
    await expect(page.getByTestId('detalle-reserva')).toBeVisible();
    // Act
    await page.getByTestId('accion-cancelar-reserva').click();
    await page.getByTestId('confirmar-motivo').fill('La clienta desistió de la compra.');
    await page.getByTestId('confirmar-aceptar').click();
    // Assert
    await expect(page.getByTestId('poligono-A-03')).toHaveAttribute('data-estado', 'DISPONIBLE');
    await expect(page.getByTestId('detalle-reserva')).toHaveCount(0);
    await expect(page.getByTestId('accion-reservar')).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('poligono-A-03')).toHaveAttribute('data-estado', 'DISPONIBLE');
  });

  test('una reserva vencida ya liberó su lote y figura entre las vencidas', async ({ page }) => {
    // Arrange: en los datos demo, la reserva de C-03 venció hace 3 días
    const lote = 'C-03';
    // Act
    await seleccionarLote(page, lote);
    // Assert
    await expect(page.getByTestId('detalle-estado')).toHaveAttribute('data-estado', 'DISPONIBLE');
    await page.goto('/reservas');
    await page.getByTestId('pestana-reservas-VENCIDA').click();
    await expect(page.getByTestId('fila-reserva-C-03')).toBeVisible();
  });
});
