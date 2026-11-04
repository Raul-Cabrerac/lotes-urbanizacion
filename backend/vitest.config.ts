import { defineConfig } from 'vitest/config';

/**
 * Configuración de Vitest para el backend.
 * - Unitarias: `src/**\/*.test.ts` (junto al módulo que prueban).
 * - Integración: `tests/**\/*.test.ts` (API + base de datos en memoria).
 * La cobertura mide solo las capas con reglas de negocio (dominio y aplicación).
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/dominio/**', 'src/aplicacion/**'],
      reporter: ['text', 'html'],
    },
  },
});
