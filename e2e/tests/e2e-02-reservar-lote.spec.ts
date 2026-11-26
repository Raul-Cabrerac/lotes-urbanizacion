// Consigna §14: E2E 02 - Reservar lote.
import { expect, test } from '@playwright/test';
import { seleccionarLote } from '../apoyo/mapa';
import { abrirProyecto, iniciarSesionComo, reiniciarDatos } from '../apoyo/sesion';

test.describe('E2E 02 · Reservar lote', () => {
  test.beforeEach(async ({ page, request }) => {
    await reiniciarDatos(request);
    await iniciarSesionComo(page, 'asesor');
    await abrirProyecto(page);
  });

  test('reserva un lote DISPONIBLE para un cliente nuevo, con su anticipo, y el lote pasa a RESERVADO', async ({ page }) => {
    // Arrange
    await seleccionarLote(page, 'C-02');
    await expect(page.getByTestId('detalle-estado')).toHaveAttribute('data-estado', 'DISPONIBLE');
    // Act
    await page.getByTestId('accion-reservar').click();
    await page.getByTestId('reserva-cliente-nuevo').click();
    await page.getByTestId('cliente-nombre').fill('Carla Rojas Méndez');
    await page.getByTestId('cliente-documento').fill('9000001');
    await page.getByTestId('cliente-telefono').fill('70000001');
    await page.getByTestId('cliente-guardar').click();
    await expect(page.getByTestId('reserva-cliente')).not.toHaveValue(''); // quedó elegido el cliente nuevo
    await page.getByTestId('reserva-anticipo').fill('7000'); // lo que paga el cliente; el mínimo es el 10 %: Bs 6.000
    await page.getByTestId('reserva-confirmar').click();
    // Assert
    await expect(page.getByTestId('poligono-C-02')).toHaveAttribute('data-estado', 'RESERVADO');
    await expect(page.getByTestId('detalle-reserva')).toContainText('Carla Rojas Méndez');
    await expect(page.getByTestId('detalle-anticipo')).toContainText('Bs 7.000');
    await page.reload();
    await expect(page.getByTestId('poligono-C-02')).toHaveAttribute('data-estado', 'RESERVADO');
  });

  test('no ofrece reservar un lote que ya está RESERVADO', async ({ page }) => {
    // Arrange: en los datos demo, A-03 está reservado para María
    const lote = 'A-03';
    // Act
    await seleccionarLote(page, lote);
    // Assert
    await expect(page.getByTestId('detalle-estado')).toHaveAttribute('data-estado', 'RESERVADO');
    await expect(page.getByTestId('accion-reservar')).toHaveCount(0);
  });
});
