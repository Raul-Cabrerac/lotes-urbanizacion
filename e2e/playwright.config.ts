import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para los E2E.
 * - Levanta la app completa en modo pruebas (`npm run dev:pruebas` desde la raíz): la API usa
 *   PostgreSQL en memoria (no toca los datos de Neon) y habilita `POST /api/pruebas/reiniciar`
 *   para volver a los datos demo.
 * - Espera a que la API responda en /api/salud antes de empezar (es la parte más lenta en arrancar).
 * - Un solo worker: todas las pruebas comparten la misma base de datos de pruebas.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    testIdAttribute: 'data-testid',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev:pruebas',
    cwd: '..',
    url: 'http://localhost:3000/api/salud',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
