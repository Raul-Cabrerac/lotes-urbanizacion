// Consigna §15: Todos los tests pueden ejecutarse nuevamente
import { expect, test as preparacion } from '@playwright/test';

/**
 * Corre una vez antes de todos los E2E (proyecto "preparacion" de playwright.config.ts).
 *
 * Playwright reutiliza la API que ya esté levantada (detrás del proxy de Vite). Si ese servidor es un
 * `npm run dev` normal, las pruebas modificarían los datos de tu rama de Neon. Solo el modo pruebas
 * (`npm run dev:pruebas`, PostgreSQL en memoria) tiene la ruta de reinicio: en cualquier otro caso
 * esta comprobación falla y Playwright no ejecuta ninguna prueba. Si pasa, los datos demo quedan
 * recién cargados.
 */
const MENSAJE_SI_FALLA =
  'La API no está en modo pruebas. Detén "npm run dev" y vuelve a ejecutar "npm run test:e2e".';

preparacion('reinicia los datos demo cuando el servidor está en modo pruebas', async ({ request }) => {
  // Arrange
  const urlReinicio = '/api/pruebas/reiniciar'; // por el proxy de Vite, como el resto de los E2E
  // Act
  const respuesta = await request.post(urlReinicio);
  // Assert
  expect(respuesta.status(), MENSAJE_SI_FALLA).toBe(200);
});
