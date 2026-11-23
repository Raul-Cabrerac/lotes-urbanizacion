// Consigna §14: E2E 08 - Control de acceso (consigna §11: autenticación y autorización por rol).
import { expect, test } from '@playwright/test';
import { esperarRespuestaApi } from '../apoyo/api';
import { iniciarSesionComo, reiniciarDatos } from '../apoyo/sesion';

/** La venta de B-02, de Juan Pablo (cliente2): es la segunda venta de los datos demo. */
const ID_VENTA_DE_CLIENTE2 = 2;

test.describe('E2E 08 · Control de acceso', () => {
  test.beforeEach(async ({ request }) => {
    await reiniciarDatos(request);
  });

  test('sin sesión, una página privada lleva al inicio de sesión', async ({ page }) => {
    // Arrange: el navegador no tiene sesión iniciada
    const paginaPrivada = '/proyectos';
    // Act
    await page.goto(paginaPrivada);
    // Assert
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId('formulario-login')).toBeVisible();
  });

  test('un cliente no puede entrar a la gestión de usuarios', async ({ page }) => {
    // Arrange
    await iniciarSesionComo(page, 'cliente');
    // Act
    await page.goto('/usuarios');
    // Assert
    await expect(page.getByTestId('acceso-denegado')).toBeVisible();
    await expect(page.getByTestId('menu-usuarios')).toHaveCount(0);
  });

  test('un cliente no puede ver la venta de otro cliente', async ({ page }) => {
    // Arrange
    await iniciarSesionComo(page, 'cliente');
    const respuesta = esperarRespuestaApi(page, 'GET', `/api/ventas/${ID_VENTA_DE_CLIENTE2}`);
    // Act
    await page.goto(`/ventas/${ID_VENTA_DE_CLIENTE2}`);
    // Assert
    expect(await respuesta).toEqual({ estado: 403, codigo: 'SIN_PERMISO' });
    await expect(page.getByTestId('acceso-denegado')).toBeVisible();
  });
});
