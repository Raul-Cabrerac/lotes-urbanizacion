import { defineConfig, devices } from '@playwright/test';

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
    env: {
      ENTORNO: 'pruebas',
      DATABASE_URL: 'memoria',
    },
    timeout: 120_000,
  },
});
