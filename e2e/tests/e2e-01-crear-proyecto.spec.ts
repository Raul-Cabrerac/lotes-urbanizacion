import { expect, test } from '@playwright/test';
import { iniciarSesionComo, reiniciarDatos } from '../apoyo/sesion';

test.describe('E2E 01 Crear proyecto', () => {
  test.beforeEach(async ({ request }) => {
    await reiniciarDatos(request);
  });

  test('administrador crea proyecto importa lotes desde kml y publica el proyecto', async ({ page }) => {
    await iniciarSesionComo(page, 'admin');
    await page.getByTestId('menu-proyectos').click();
    await page.getByTestId('nuevo-proyecto').click();

    await page.getByTestId('proyecto-nombre').fill('Urbanizacion Las Palmas E2E');
    await page.getByTestId('proyecto-ubicacion').fill('Zona Norte');
    await page.getByTestId('proyecto-descripcion').fill('Proyecto de prueba automatizada');
    await page.getByTestId('proyecto-guardar').click();

    await expect(page.getByTestId('proyecto-titulo')).toHaveText('Urbanizacion Las Palmas E2E');
    await expect(page.getByTestId('proyecto-estado')).toHaveText('BORRADOR');

    await page.getByTestId('importar-kml').click();
    await page.getByTestId('kml-usar-ejemplo').click();
    await page.getByTestId('kml-precio').fill('65000');
    await page.getByTestId('kml-importar').click();

    await expect(page.getByTestId('poligono-M1-01')).toBeVisible();
    await expect(page.getByTestId('poligono-M1-01')).toHaveAttribute('data-estado', 'DISPONIBLE');

    await page.getByTestId('publicar-proyecto').click();
    await page.getByTestId('confirmar-aceptar').click();

    await expect(page.getByTestId('proyecto-estado')).toHaveText('PUBLICADO');

    await page.reload();
    await expect(page.getByTestId('proyecto-estado')).toHaveText('PUBLICADO');
    await expect(page.getByTestId('poligono-M1-01')).toHaveAttribute('data-estado', 'DISPONIBLE');
  });
});
