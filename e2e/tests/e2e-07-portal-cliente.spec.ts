// Consigna §14: E2E 07 - Portal y consulta del cliente (consigna §10 y §11: solo ve sus operaciones).
import { expect, test } from '@playwright/test';
import { iniciarSesionComo, reiniciarDatos } from '../apoyo/sesion';

test.describe('E2E 07 · Portal del cliente', () => {
  test.beforeEach(async ({ page, request }) => {
    await reiniciarDatos(request);
    // María compró A-05 (Bs 75.000): pagó Bs 20.000 y le quedan Bs 55.000
    await iniciarSesionComo(page, 'cliente');
  });

  test('muestra su lote en el mapa con lo pagado y el saldo, y no las compras de otro cliente', async ({ page }) => {
    // Arrange: al iniciar sesión, el cliente entra a su portal
    const compra = page.getByTestId('mi-compra-A-05');
    // Act
    await compra.click();
    // Assert
    await expect(page.getByTestId('mi-mapa').getByTestId('poligono-A-05')).toBeVisible();
    await expect(compra.getByTestId('mi-compra-pagado')).toHaveText('Bs 20.000');
    await expect(compra.getByTestId('mi-compra-saldo')).toHaveText('Bs 55.000');
    await expect(page.getByTestId('mi-compra-B-02')).toHaveCount(0); // B-02 es de Juan Pablo
  });

  test('abre su plan de pagos con las cuotas, los pagos realizados y el saldo', async ({ page }) => {
    // Arrange: el portal ya está abierto
    const plan = page.getByTestId('mi-plan-A-05');
    // Act
    await plan.click();
    // Assert
    await expect(page.getByTestId('venta-total-pagado')).toHaveText('Bs 20.000');
    await expect(page.getByTestId('venta-saldo')).toHaveText('Bs 55.000');
    await expect(page.getByTestId('cuota-1')).toHaveAttribute('data-estado', 'PAGADA');
    await expect(page.getByTestId('cuota-2')).toHaveAttribute('data-estado', 'PENDIENTE');
    await expect(page.getByTestId('tabla-pagos')).toBeVisible();
  });
});
