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
- Ayudantes en `e2e/apoyo/` (los mantiene Raul):
  - `sesion.ts`: `USUARIOS`, `reiniciarDatos(request)`, `iniciarSesionComo(page, 'asesor')`,
    `abrirProyecto(page, id = 1)` y `tokenApi(request, usuario)`.
  - `mapa.ts`: `seleccionarLote(page, 'C-02')` (clic en el polígono y espera su panel) y
    `dibujarRectangulo(page)` (ver §6).
  - `api.ts`: `esperarRespuestaApi(page, 'POST', '/api/reservas')`, que devuelve el estado HTTP y
    el `codigo` del error para comprobar que un rechazo lo decidió el servidor.

## 4. Estructura obligatoria

```ts
// Consigna §14: E2E 02 - Reservar lote.
import { expect, test } from '@playwright/test';
import { seleccionarLote } from '../apoyo/mapa';
import { abrirProyecto, iniciarSesionComo, reiniciarDatos } from '../apoyo/sesion';

test.describe('E2E 02 · Reservar lote', () => {
  test.beforeEach(async ({ page, request }) => {
    await reiniciarDatos(request);
    await iniciarSesionComo(page, 'asesor');
    await abrirProyecto(page);
  });

  test('el lote pasa a RESERVADO al confirmar la reserva', async ({ page }) => {
    // Arrange
    await seleccionarLote(page, 'C-02'); // clic sobre el lote en el mapa
    await expect(page.getByTestId('detalle-estado')).toHaveAttribute('data-estado', 'DISPONIBLE');
    // Act
    await page.getByTestId('accion-reservar').click();
    await page.getByTestId('reserva-cliente').selectOption({ label: 'Ana Lucía Rojas (5512893)' });
    await page.getByTestId('reserva-confirmar').click();
    // Assert
    await expect(page.getByTestId('poligono-C-02')).toHaveAttribute('data-estado', 'RESERVADO');
    await page.reload(); // persistió, no fue solo la pantalla
    await expect(page.getByTestId('poligono-C-02')).toHaveAttribute('data-estado', 'RESERVADO');
  });
});
```

- Los clientes se eligen por su texto (`'Nombre (documento)'`), nunca por posición.
- Los estados se verifican con `data-estado`, no con el texto que se muestra.

## 5. Los 8 flujos de la consigna (§14)

Están implementados en `e2e/tests/`: 16 pruebas, una o más por flujo. Los marcados con * son
casos negativos o límite.

| Flujo | Usuario | Prueba | Verificación |
|---|---|---|---|
| E2E 01 Crear proyecto | admin | Proyecto nuevo → `importar-kml` → `kml-usar-ejemplo` → `kml-precio` 50.000 → `kml-importar` → `publicar-proyecto` | `poligono-M1-01` DISPONIBLE; `item-lote-M1-06` con Bs 50.000; `contador-DISPONIBLE` 8; PUBLICADO; tras recargar |
| | admin | Las Palmeras → `dibujar-lote` → `dibujarRectangulo` → `lote-codigo` P-05, `lote-precio` 90.000 | `lote-calculado`; `poligono-P-05` DISPONIBLE; tras recargar |
| E2E 02 Reservar lote | asesor | C-02 → `accion-reservar` → `reserva-cliente-nuevo` → datos del cliente → `reserva-confirmar` | `poligono-C-02` RESERVADO; `detalle-reserva` con el cliente; tras recargar |
| | asesor | * A-03 (RESERVADO) | no existe `accion-reservar` |
| E2E 03 Reserva duplicada | asesor y asesor2, en **dos contextos** | Los dos abren C-02; reserva el primero; el segundo pulsa `reserva-confirmar` | 409 `LOTE_NO_DISPONIBLE`; `reserva-error`; su mapa pasa a RESERVADO; una sola `fila-reserva-C-02` activa |
| E2E 04 Venta | asesor | A-01 → `accion-vender` → `venta-cliente` → `venta-contado` → `venta-confirmar` → `detalle-ver-venta` | VENDIDO; VIGENTE; `venta-precio-pactado` Bs 78.000; `venta-saldo` Bs 0; `cuota-0` PAGADA |
| | asesor | * A-05 (VENDIDO) | no existe `accion-vender` |
| E2E 05 Plan de pagos | asesor | A-02 financiado (inicial 12.000 + 12 cuotas) → `detalle-ver-venta` → `pagar-cuota-1` → `pago-confirmar` | `cuota-12` PENDIENTE y saldo Bs 60.000; luego `cuota-1` PAGADA, pagado Bs 17.000, saldo Bs 55.000; tras recargar |
| | asesor | * Venta de A-05: `pago-monto` 55.000,01 | 422 `MONTO_EXCEDE_SALDO`; `pago-error`; saldo sin cambios |
| E2E 06 Liberar reserva | asesor | A-03 → `accion-cancelar-reserva` → `confirmar-motivo` → `confirmar-aceptar` | `poligono-A-03` DISPONIBLE; `accion-reservar` visible; tras recargar |
| | asesor | C-03, cuya reserva venció | DISPONIBLE; `fila-reserva-C-03` en `pestana-reservas-VENCIDA` |
| E2E 07 Portal del cliente | cliente | Su portal → `mi-compra-A-05` | `poligono-A-05` en `mi-mapa`; pagado Bs 20.000; saldo Bs 55.000; sin `mi-compra-B-02` |
| | cliente | `mi-plan-A-05` | `cuota-1` PAGADA, `cuota-2` PENDIENTE, saldo Bs 55.000, `tabla-pagos` |
| E2E 08 Control de acceso | sin sesión | `page.goto('/proyectos')` | queda en `/login` |
| | cliente | * `page.goto('/usuarios')` | `acceso-denegado`; sin `menu-usuarios` |
| | cliente | * `page.goto('/ventas/2')` (venta de cliente2) | 403 `SIN_PERMISO`; `acceso-denegado` |

Dos usuarios a la vez (E2E 03): el fixture `page` es el primer asesor y el segundo usa un contexto
propio, con su propia sesión:

```ts
const otroNavegador = await browser.newContext();
const paginaAsesor2 = await otroNavegador.newPage();
await iniciarSesionComo(paginaAsesor2, 'asesor2');
// ... al final de la prueba:
await otroNavegador.close();
```

## 6. El mapa de Google Maps

- Google dibuja los polígonos en un canvas. El elemento que se usa en las pruebas es la etiqueta
  HTML de cada lote: `poligono-<código>` con `data-estado`. Un clic en ella selecciona el lote.
- Sin clave de Google aparece arriba del mapa un diálogo de Google que **tapa los lotes C-04,
  C-05 y C-06** del proyecto 1. Para hacer clic, usar lotes libres: C-02, C-03, A-01, A-02, A-03
  y A-05.
- **Dibujar un lote:** con el mapa ya cargado (alguna etiqueta de lote visible), pulsar
  `dibujar-lote` y llamar a `dibujarRectangulo(page)`. El ayudante hace un
  `page.mouse.click(x, y)` por esquina y espera 0,5 s antes de cada uno: Google Maps descarta un
  clic que llega a menos de ~0,3 s del anterior (medido: con 0,2 s se perdían vértices). Es la
  única espera fija permitida (AGENTS.md §5) y vive solo en ese ayudante. Esperar el contador
  `dibujo-vertices` no alcanza, porque cambia al instante.
- En un proyecto recién creado, sin lotes, los primeros clics se pierden porque el mapa no
  terminó de cargar: por eso el E2E 01 dibuja en Las Palmeras, después de ver `poligono-P-01`.
- Al seleccionar un lote se abre el panel de la derecha y el mapa se angosta. Si después hay que
  hacer clic en coordenadas del mapa, cerrar antes el panel con `detalle-cerrar`.

## 7. Reglas para que no sean frágiles

- Solo `getByTestId`. Nunca selectores por clase CSS, por texto de botón o por posición.
- Usar las esperas automáticas de `expect(locator)` (`toBeVisible`, `toHaveText`, `toHaveAttribute`).
- Los avisos se apilan: `getByTestId('aviso-exito').filter({ hasText: 'reservado' })`.
- Verificar el resultado y la persistencia (recargar).
- En un rechazo, verificar el estado HTTP y el `codigo` con `esperarRespuestaApi`, además del
  error en pantalla. Nunca el texto del mensaje.
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

- [ ] Comentario inicial `// Consigna §14: E2E 0N - <flujo>`.
- [ ] `beforeEach` reinicia datos e inicia sesión por la interfaz.
- [ ] Solo `data-testid`; esperas automáticas.
- [ ] Verifica `data-estado` y persistencia tras recargar.
- [ ] `npm run test:e2e` pasa dos veces seguidas.
