import { expect, test } from '@playwright/test';
import { abrirProyecto, iniciarSesionComo, reiniciarDatos } from '../apoyo/sesion';

test.describe('E2E 03 Evitar reserva duplicada', () => {
  test('rechaza la segunda reserva simultanea sobre el mismo lote', async ({ browser, request }) => {
    await reiniciarDatos(request);

    const contextoA = await browser.newContext();
    const contextoB = await browser.newContext();
    const paginaA = await contextoA.newPage();
    const paginaB = await contextoB.newPage();

    await iniciarSesionComo(paginaA, 'asesor');
    await iniciarSesionComo(paginaB, 'asesor2');

    await abrirProyecto(paginaA);
    await abrirProyecto(paginaB);

    await paginaA.getByTestId('poligono-C-02').click();
    await paginaB.getByTestId('poligono-C-02').click();

    await paginaA.getByTestId('accion-reservar').click();
    await paginaA.getByTestId('reserva-cliente').selectOption({ index: 1 });
    await paginaA.getByTestId('reserva-confirmar').click();

    await expect(paginaA.getByTestId('poligono-C-02')).toHaveAttribute('data-estado', 'RESERVADO');

    await paginaB.getByTestId('accion-reservar').click();
    await paginaB.getByTestId('reserva-cliente').selectOption({ index: 1 });
    await paginaB.getByTestId('reserva-confirmar').click();

    await expect(paginaB.getByTestId('reserva-error')).toBeVisible();

    await contextoA.close();
    await contextoB.close();
  });
});
