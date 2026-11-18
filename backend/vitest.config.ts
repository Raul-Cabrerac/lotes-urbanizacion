import { defineConfig } from 'vitest/config';

/**
 * Configuración de Vitest para el backend. Las pruebas viven en tests/, separadas del código
 * (por qué: docs/DECISIONES.md §12):
 * - Unitarias: `tests/unitarias/**\/*.test.ts` (`npm run test:unit`).
 * - Integración: `tests/integracion/**\/*.test.ts`, API + base de datos en memoria
 *   (`npm run test:integracion`).
 * - Ayudantes compartidos: `tests/apoyo/` (no son pruebas).
 * La cobertura mide solo las capas con reglas de negocio (dominio y aplicación).
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/dominio/**', 'src/aplicacion/**'],
      reporter: ['text', 'html'],
    },
  },
});
