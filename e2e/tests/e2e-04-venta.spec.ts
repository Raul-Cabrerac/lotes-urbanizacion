// Consigna §14: E2E 04 - Venta.
import { expect, test } from '@playwright/test';
import { seleccionarLote } from '../apoyo/mapa';
import { abrirProyecto, iniciarSesionComo, reiniciarDatos } from '../apoyo/sesion';

test.describe('E2E 04 · Venta', () => {
  test.beforeEach(async ({ page, request }) => {
    await reiniciarDatos(request);
    await iniciarSesionComo(page, 'asesor');
    await abrirProyecto(page);
  });

  test('vende al contado un lote DISPONIBLE: pasa a VENDIDO y la venta guarda el precio pactado', async ({ page }) => {
    // Arrange: A-01 está DISPONIBLE y su precio es Bs 78.000
    await seleccionarLote(page, 'A-01');
    // Act
    await page.getByTestId('accion-vender').click();
    await page.getByTestId('venta-cliente').selectOption({ label: 'Ana Lucía Rojas (5512893)' });
    await page.getByTestId('venta-contado').check();
    await page.getByTestId('venta-confirmar').click();
    // Assert
    await expect(page.getByTestId('poligono-A-01')).toHaveAttribute('data-estado', 'VENDIDO');
    await expect(page.getByTestId('detalle-venta')).toContainText('Ana Lucía Rojas');
    await page.getByTestId('detalle-ver-venta').click();
    await expect(page.getByTestId('venta-estado')).toHaveAttribute('data-estado', 'VIGENTE');
    await expect(page.getByTestId('venta-precio-pactado')).toHaveText('Bs 78.000');
    await expect(page.getByTestId('venta-saldo')).toHaveText('Bs 0');
    await expect(page.getByTestId('cuota-0')).toHaveAttribute('data-estado', 'PAGADA'); // el pago al contado
    await page.reload();
    await expect(page.getByTestId('venta-precio-pactado')).toHaveText('Bs 78.000');
  });

  test('no ofrece vender un lote que ya está VENDIDO', async ({ page }) => {
    // Arrange: en los datos demo, A-05 está vendido a María
    const lote = 'A-05';
    // Act
    await seleccionarLote(page, lote);
    // Assert
    await expect(page.getByTestId('detalle-estado')).toHaveAttribute('data-estado', 'VENDIDO');
    await expect(page.getByTestId('accion-vender')).toHaveCount(0);
  });
});
