---
name: test-e2e
description: Escribe, completa o corrige pruebas End-to-End con Playwright sobre la aplicación completa en navegador (mapa de Google Maps incluido), usando los data-testid del catálogo, el reinicio de datos en modo pruebas y los 8 flujos de la consigna (§14, E2E 01 a E2E 08). Usar cuando se pida un test E2E, automatizar un flujo de usuario o estabilizar una prueba de navegador.
argument-hint: "[flujo E2E 01..08 o pantalla a probar]"
---

# Skill: prueba End-to-End

## 1. Qué es E2E en este proyecto

- Se prueba **el flujo completo como lo vive el usuario**: navegador real → frontend → API →
  base de datos. No se simula nada.
- La app corre en **modo pruebas** (`npm run dev:pruebas`): PostgreSQL en memoria, sin tocar Neon,
  y la ruta `POST /api/pruebas/reiniciar`, que vuelve a cargar los datos demo. Playwright la
  levanta solo (`webServer` en `e2e/playwright.config.ts`).
- Cada prueba empieza desde un estado conocido: **reinicia los datos en `beforeEach`**. Después del
  reinicio, "Los Jardines del Urubó" es el proyecto 1 y "Las Palmeras" el 2.

## 2. Antes de escribir

1. Leer el flujo en la consigna (§14) y su guion en `README.md`.
2. Copiar los `data-testid` exactos de `docs/GUIA_TESTING.md` §6. Si un control no tiene
   `data-testid`, se agrega al componente **antes** de escribir la prueba y se documenta.
3. Definir precondición (datos y sesión), acciones y resultado observable **y** persistido (qué
   debe seguir igual tras recargar).

## 3. Dónde va y el apoyo común

- `e2e/tests/e2e-0N-nombre.spec.ts`, uno por flujo: `e2e-01-crear-proyecto.spec.ts`,
  `e2e-02-reservar-lote.spec.ts`, `e2e-03-reserva-duplicada.spec.ts`, `e2e-04-venta.spec.ts`,
  `e2e-05-plan-de-pagos.spec.ts`, `e2e-06-liberar-reserva.spec.ts`,
  `e2e-07-portal-cliente.spec.ts`, `e2e-08-control-de-acceso.spec.ts`.
- Apoyo en `e2e/apoyo/sesion.ts` (crear una vez):

```ts
import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const USUARIOS = {
  admin: { email: 'admin@lotes.bo', password: 'admin123' },
  asesor: { email: 'asesor@lotes.bo', password: 'asesor123' },
  asesor2: { email: 'asesor2@lotes.bo', password: 'asesor123' },
  cliente: { email: 'cliente@lotes.bo', password: 'cliente123' },
  cliente2: { email: 'cliente2@lotes.bo', password: 'cliente123' },
} as const;

/** Vuelve a cargar los datos demo (la API corre con ENTORNO=pruebas). */
export async function reiniciarDatos(request: APIRequestContext): Promise<void> {
  const respuesta = await request.post('/api/pruebas/reiniciar');
  expect(respuesta.ok()).toBeTruthy();
}

/** Inicia sesión por la interfaz, como lo haría una persona. */
export async function iniciarSesionComo(page: Page, usuario: keyof typeof USUARIOS): Promise<void> {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(USUARIOS[usuario].email);
  await page.getByTestId('login-password').fill(USUARIOS[usuario].password);
  await page.getByTestId('login-ingresar').click();
  await expect(page.getByTestId('usuario-nombre')).toBeVisible();
}

/** Abre el mapa del proyecto (1 = Los Jardines del Urubó después del reinicio). */
export async function abrirProyecto(page: Page, id = 1): Promise<void> {
  await page.goto('/proyectos');
  await page.getByTestId(`proyecto-${id}`).click();
  await expect(page.getByTestId('mapa')).toBeVisible();
}
```

## 4. Estructura obligatoria

```ts
// Consigna §14 · E2E 02 - Reservar lote.
import { expect, test } from '@playwright/test';
import { abrirProyecto, iniciarSesionComo, reiniciarDatos } from '../apoyo/sesion';

test.describe('E2E 02 · Reservar lote', () => {
  test.beforeEach(async ({ page, request }) => {
    await reiniciarDatos(request);
    await iniciarSesionComo(page, 'asesor');
    await abrirProyecto(page);
  });

  test('el lote pasa a RESERVADO al confirmar la reserva', async ({ page }) => {
    // Arrange
    await page.getByTestId('poligono-C-02').click(); // clic sobre el lote en el mapa
    await expect(page.getByTestId('detalle-estado')).toHaveText('DISPONIBLE');
    // Act
    await page.getByTestId('accion-reservar').click();
    await page.getByTestId('reserva-cliente').selectOption({ index: 1 });
    await page.getByTestId('reserva-confirmar').click();
    // Assert
    await expect(page.getByTestId('poligono-C-02')).toHaveAttribute('data-estado', 'RESERVADO');
    await page.reload(); // persistió, no fue solo la pantalla
    await expect(page.getByTestId('poligono-C-02')).toHaveAttribute('data-estado', 'RESERVADO');
  });
});
```

## 5. Los 8 flujos de la consigna (§14)

| Flujo | Usuario | Acciones (en orden) | Verificación |
|---|---|---|---|
| E2E 01 Crear proyecto | admin | `nuevo-proyecto` → `proyecto-nombre`, `proyecto-ubicacion`, `proyecto-descripcion` → `proyecto-guardar` → `dibujar-lote` → clics en el `mapa` (ver §6) → `terminar-dibujo` → `lote-codigo`, `lote-precio` → `lote-guardar`; además `importar-kml` → `kml-usar-ejemplo` → `kml-precio` → `kml-importar` → `publicar-proyecto` → `confirmar-aceptar` | `poligono-<código>` visible con `data-estado="DISPONIBLE"`; `proyecto-estado` = PUBLICADO; tras recargar siguen |
| E2E 02 Reservar lote | asesor | `poligono-C-02` → `accion-reservar` → `reserva-cliente-nuevo` → `cliente-nombre`, `cliente-documento`, `cliente-telefono` → `cliente-guardar` → `reserva-confirmar` | `poligono-C-02[data-estado=RESERVADO]`, `detalle-estado`; recargar |
| E2E 03 Evitar reserva duplicada | asesor y asesor2 en **dos contextos** | ambos abren C-02 DISPONIBLE; asesor reserva; asesor2 pulsa `accion-reservar` → `reserva-cliente` → `reserva-confirmar` | asesor2 ve `reserva-error` (mensaje de `LOTE_NO_DISPONIBLE`); su mapa se actualiza a RESERVADO; en `/reservas` hay una sola reserva de C-02 |
| E2E 04 Venta | asesor | `poligono-A-01` → `accion-vender` → `venta-cliente` → `venta-contado` → `venta-confirmar` → `detalle-ver-venta` | `poligono-A-01[data-estado=VENDIDO]`; `venta-estado` = VIGENTE; `venta-precio-pactado` = precio del lote |
| E2E 05 Plan de pagos | asesor | `poligono-A-02` → `accion-vender` → `venta-cliente` → `venta-financiado` → `venta-cuota-inicial` → `venta-numero-cuotas` → `venta-vista-plan` → `venta-confirmar` → `detalle-ver-venta` → `pagar-cuota-1` → `pago-confirmar` | `cuota-1[data-estado=PAGADA]`; `venta-total-pagado` y `venta-saldo` actualizados; recargar |
| E2E 06 Liberar reserva | asesor | `poligono-A-03` (RESERVADO) → `accion-cancelar-reserva` → `confirmar-motivo` → `confirmar-aceptar` | `poligono-A-03[data-estado=DISPONIBLE]`; `accion-reservar` vuelve a estar visible |
| E2E 07 Portal del cliente | cliente | entra a su portal → `mi-compra-A-05` → `mi-plan-A-05` | `poligono-A-05` dentro de `mi-mapa`; `venta-saldo` contiene 55.000; `cuota-1` PAGADA y `cuota-2` PENDIENTE |
| E2E 08 Control de acceso | cliente | `page.goto('/usuarios')`; `page.goto('/ventas/<id de una venta de cliente2>')`; sin sesión, `page.goto('/proyectos')` | `acceso-denegado` visible en ambas pantallas; sin sesión redirige a `/login` |

Dos usuarios a la vez (E2E 03):

```ts
test('rechaza la segunda reserva sobre el mismo lote', async ({ browser, request }) => {
  await reiniciarDatos(request);
  const paginaA = await (await browser.newContext()).newPage();
  const paginaB = await (await browser.newContext()).newPage();
  // iniciarSesionComo(paginaA, 'asesor'), iniciarSesionComo(paginaB, 'asesor2'),
  // ambos abren el proyecto y hacen clic en poligono-C-02...
});
```

## 6. El mapa de Google Maps

- Google dibuja los polígonos en un canvas. El elemento que se usa en las pruebas es la etiqueta
  HTML de cada lote: `poligono-<código>` con `data-estado`. Un clic en ella selecciona el lote.
- Sin clave de Google aparece un aviso de Google en el mapa; no tapa las etiquetas ni las barras.
- **Dibujar un lote:** después de `dibujar-lote`, cada vértice es un `page.mouse.click(x, y)`
  dentro de la caja de `mapa`. Entre clic y clic hace falta `page.waitForTimeout(500)`: dos clics
  muy seguidos cuentan como doble clic y se pierde un vértice (es la única espera fija permitida).
  `dibujo-vertices` muestra cuántos vértices hay. Se cierra con `terminar-dibujo`.
- Al seleccionar un lote se abre el panel de la derecha y el mapa se angosta. Si después hay que
  hacer clic en coordenadas del mapa, cerrar antes el panel con `detalle-cerrar`.

## 7. Reglas para que no sean frágiles

- Solo `getByTestId`. Nunca selectores por clase CSS, por texto de botón o por posición.
- Usar las esperas automáticas de `expect(locator)` (`toBeVisible`, `toHaveText`, `toHaveAttribute`).
- Los avisos se apilan: `getByTestId('aviso-exito').filter({ hasText: 'reservado' })`.
- Verificar el resultado y la persistencia (recargar).
- Una prueba, un flujo. Reiniciar datos en `beforeEach`; `workers: 1` porque comparten la base.
- Si una prueba falla "a veces", el problema es de la prueba: revisar esperas y datos.

## 8. Comandos

```
npx playwright install chromium          # una sola vez por máquina (dentro de e2e/)
npm run test:e2e                         # levanta la app en modo pruebas y corre todo
npx playwright test e2e-03               # un archivo (por nombre parcial)
npx playwright test --ui                 # interfaz interactiva
npx playwright test --headed --debug     # ver el navegador paso a paso
npx playwright codegen http://localhost:5173   # grabar acciones (con npm run dev:pruebas corriendo)
npx playwright show-report               # reporte HTML del último run
```

## 9. Lista de verificación

- [ ] Comentario inicial `// Consigna §14 · E2E 0N`.
- [ ] `beforeEach` reinicia datos e inicia sesión por la interfaz.
- [ ] Solo `data-testid`; esperas automáticas.
- [ ] Verifica `data-estado` y persistencia tras recargar.
- [ ] `npm run test:e2e` pasa dos veces seguidas.
