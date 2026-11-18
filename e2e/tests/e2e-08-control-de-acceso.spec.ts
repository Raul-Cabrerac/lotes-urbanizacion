import { expect, test } from '@playwright/test';
import { iniciarSesionComo, reiniciarDatos } from '../apoyo/sesion';

test.describe('E2E 08 Control de acceso', () => {
  test.beforeEach(async ({ request }) => {
    await reiniciarDatos(request);
  });

  test('bloquea accesos sin permisos y redirige a login sin sesion', async ({ page }) => {
    await page.goto('/proyectos');
    await expect(page.getByTestId('formulario-login')).toBeVisible();

    await iniciarSesionComo(page, 'cliente');

    await page.goto('/usuarios');
    await expect(page.getByTestId('acceso-denegado')).toBeVisible();

    await page.goto('/ventas/2');
    await expect(page.getByTestId('acceso-denegado')).toBeVisible();
  });
});
