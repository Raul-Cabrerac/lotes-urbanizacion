// Consigna §14: E2E 01 - Crear proyecto, cargar y dibujar lotes, asignar sus datos y verlos en el mapa.
import { expect, test } from '@playwright/test';
import { dibujarRectangulo } from '../apoyo/mapa';
import { abrirProyecto, iniciarSesionComo, reiniciarDatos } from '../apoyo/sesion';

test.describe('E2E 01 · Crear proyecto', () => {
  test.beforeEach(async ({ page, request }) => {
    await reiniciarDatos(request);
    await iniciarSesionComo(page, 'admin');
  });

  test('crea un proyecto, importa sus lotes desde un KML con precio y lo publica', async ({ page }) => {
    // Arrange
    await page.goto('/proyectos');
    // Act
    await page.getByTestId('nuevo-proyecto').click();
    await page.getByTestId('proyecto-nombre').fill('Urbanización El Mirador');
    await page.getByTestId('proyecto-ubicacion').fill('Warnes - Santa Cruz');
    await page.getByTestId('proyecto-descripcion').fill('Proyecto creado por el E2E 01.');
    await page.getByTestId('proyecto-guardar').click();
    await page.getByTestId('importar-kml').click();
    await page.getByTestId('kml-usar-ejemplo').click();
    await expect(page.getByTestId('kml-nombre')).toContainText('urbanizacion_el_mirador.kml'); // el ejemplo cargó
    await page.getByTestId('kml-precio').fill('50000');
    await page.getByTestId('kml-importar').click();
    await page.getByTestId('publicar-proyecto').click();
    await page.getByTestId('confirmar-aceptar').click();
    // Assert
    await expect(page.getByTestId('proyecto-titulo')).toHaveText('Urbanización El Mirador');
    await expect(page.getByTestId('poligono-M1-01')).toHaveAttribute('data-estado', 'DISPONIBLE');
    await expect(page.getByTestId('item-lote-M1-06')).toContainText('Bs 50.000'); // el KML no traía su precio
    await expect(page.getByTestId('contador-DISPONIBLE')).toContainText('8');
    await expect(page.getByTestId('proyecto-estado')).toHaveAttribute('data-estado', 'PUBLICADO');
    await page.reload();
    await expect(page.getByTestId('poligono-M1-08')).toHaveAttribute('data-estado', 'DISPONIBLE');
    await expect(page.getByTestId('proyecto-estado')).toHaveAttribute('data-estado', 'PUBLICADO');
  });

  test('dibuja un lote sobre el mapa y guarda su código y precio', async ({ page }) => {
    // Arrange: Las Palmeras (proyecto 2) ya tiene lotes; verlos asegura que el mapa terminó de cargar
    await abrirProyecto(page, 2);
    await expect(page.getByTestId('poligono-P-01')).toBeVisible();
    // Act
    await page.getByTestId('dibujar-lote').click();
    await dibujarRectangulo(page);
    await expect(page.getByTestId('lote-calculado')).toBeVisible(); // el backend validó el polígono
    await page.getByTestId('lote-codigo').fill('P-05');
    await page.getByTestId('lote-precio').fill('90000');
    await page.getByTestId('lote-guardar').click();
    // Assert
    await expect(page.getByTestId('poligono-P-05')).toHaveAttribute('data-estado', 'DISPONIBLE');
    await expect(page.getByTestId('detalle-precio')).toHaveText('Bs 90.000');
    await page.reload();
    await expect(page.getByTestId('poligono-P-05')).toHaveAttribute('data-estado', 'DISPONIBLE');
  });
});
