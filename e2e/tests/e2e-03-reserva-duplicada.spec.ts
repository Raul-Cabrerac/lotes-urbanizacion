// Consigna §14: E2E 03 - Evitar reserva duplicada (consigna §7: dos usuarios a la vez sobre el mismo lote).
import { expect, test } from '@playwright/test';
import { esperarRespuestaApi } from '../apoyo/api';
import { seleccionarLote } from '../apoyo/mapa';
import { abrirProyecto, iniciarSesionComo, reiniciarDatos } from '../apoyo/sesion';

test.describe('E2E 03 · Evitar reserva duplicada', () => {
  test.beforeEach(async ({ request }) => {
    await reiniciarDatos(request);
  });

  test('rechaza la reserva del segundo asesor cuando el primero ya reservó el lote', async ({ page, browser }) => {
    // Arrange: cada asesor en su propio navegador, los dos con el lote C-02 DISPONIBLE en pantalla
    const otroNavegador = await browser.newContext();
    const paginaAsesor2 = await otroNavegador.newPage();
    await iniciarSesionComo(page, 'asesor');
    await iniciarSesionComo(paginaAsesor2, 'asesor2');
    await abrirProyecto(page);
    await abrirProyecto(paginaAsesor2);
    await seleccionarLote(page, 'C-02');
    await seleccionarLote(paginaAsesor2, 'C-02');
    await page.getByTestId('accion-reservar').click();
    await page.getByTestId('reserva-cliente').selectOption({ label: 'Ana Lucía Rojas (5512893)' });
    await page.getByTestId('reserva-confirmar').click();
    await expect(page.getByTestId('poligono-C-02')).toHaveAttribute('data-estado', 'RESERVADO');
    // Act: el segundo asesor todavía ve C-02 DISPONIBLE e intenta reservarlo
    await paginaAsesor2.getByTestId('accion-reservar').click();
    await paginaAsesor2.getByTestId('reserva-cliente').selectOption({ label: 'Pedro Suárez Antelo (7340012)' });
    const respuesta = esperarRespuestaApi(paginaAsesor2, 'POST', '/api/reservas');
    await paginaAsesor2.getByTestId('reserva-confirmar').click();
    // Assert
    expect(await respuesta).toEqual({ estado: 409, codigo: 'LOTE_NO_DISPONIBLE' });
    await expect(paginaAsesor2.getByTestId('reserva-error')).toBeVisible();
    await expect(paginaAsesor2.getByTestId('poligono-C-02')).toHaveAttribute('data-estado', 'RESERVADO');
    await page.goto('/reservas');
    await expect(page.getByTestId('fila-reserva-C-02')).toHaveCount(1);
    await otroNavegador.close();
  });
});
