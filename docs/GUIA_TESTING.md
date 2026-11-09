# Guía de testing

Para el equipo, al escribir las pruebas de la consigna (§12, §13 y §14). Aquí no hay pruebas: se
indica **dónde va cada una, qué punto de entrada usar y qué `data-testid` existe**. Las reglas de
estilo (AAA, nombres, casos positivo, negativo y límite) están en `docs/CONVENCIONES.md` §8 y en
las skills `test-unitario`, `test-integracion` y `test-e2e` de `.claude/skills/`.

## 1. Mapa de pruebas: dónde va cada una y de quién es

| Nivel | Archivos | Responsable | Consigna | Herramientas | Comando |
|---|---|---|---|---|---|
| Unitaria | `backend/tests/unitarias/dominio/<modulo>.test.ts` y `backend/tests/unitarias/servicios/<Servicio>.test.ts` | Laura | §12 | Vitest (mocks con `vi.fn()`) | `npm run test:unit` |
| Integración | `backend/tests/integracion/<recurso>.test.ts`: `proyectos`, `lotes`, `clientes`, `reservas` | Raul | §13 | Vitest + Supertest + PostgreSQL en memoria | `npm run test:integracion` |
| Integración | `backend/tests/integracion/<recurso>.test.ts`: `ventas`, `planPagos`, `pagos`, `permisos` | Luciana | §13 | Vitest + Supertest + PostgreSQL en memoria | `npm run test:integracion` |
| E2E | `e2e/tests/e2e-0N-nombre.spec.ts` | Mario | §14 | Playwright | `npm run test:e2e` |

- Las unitarias repiten la estructura de `src/`: `src/dominio/lote.ts` se prueba en
  `tests/unitarias/dominio/lote.test.ts`, y `src/aplicacion/servicios/ReservaServicio.ts` en
  `tests/unitarias/servicios/ReservaServicio.test.ts`.
- Ayudantes compartidos: `backend/tests/apoyo/` y `e2e/apoyo/`. Los mantiene Raul.
- `npm run test:cobertura` mide la cobertura de `dominio/` y `aplicacion/`.
- Por qué esta estructura: `docs/DECISIONES.md` §12. Qué ítem cubre cada responsable: §7 de esta
  guía.

## 2. Unitarias: qué función cubre cada regla

Las reglas son funciones puras en `backend/src/dominio/`: se prueban sin base de datos ni servidor.

| Consigna §12 | Módulo | Qué llamar |
|---|---|---|
| Cambios permitidos de estado de un lote | `dominio/lote.ts` | `TRANSICIONES_LOTE`, `puedeCambiarEstado`, `validarCambioEstado`, `validarCambioEstadoManual` |
| Impedir reservar un lote que no esté DISPONIBLE | `dominio/lote.ts` | `validarLoteReservable(lote, 'PUBLICADO')` → `LOTE_NO_DISPONIBLE` |
| Impedir vender un lote ya VENDIDO | `dominio/lote.ts` | `validarLoteVendible(lote, 'PUBLICADO', clienteId, reservaActiva)` → `LOTE_YA_VENDIDO` |
| Calcular total pagado y saldo pendiente | `dominio/planPagos.ts` | `resumirPlan(precioPactado, cuotas, pagos, hoy)` |
| Generar cuotas de un plan de pagos | `dominio/planPagos.ts` · `dominio/dinero.ts` | `generarPlanDePagos(condiciones)`; `dividirEnPartes(100, 3)` → `[33.33, 33.33, 33.34]` |
| Impedir pagos con montos inválidos | `dominio/planPagos.ts` · `dominio/dinero.ts` | `validarPago(monto, estadoVenta, cuota, saldo)` → `MONTO_INVALIDO`; `esMontoValido` |
| Impedir que el saldo resulte negativo | `dominio/planPagos.ts` | `validarPago(...)` con un monto mayor al saldo → `MONTO_EXCEDE_SALDO` |
| Validar vencimiento de reservas | `dominio/reserva.ts` | `estaVencida(reserva, hoy)`: vence hoy todavía vale, ayer ya no; `validarFechaVencimiento` |
| Una venta conserva el precio pactado | `aplicacion/servicios/VentaServicio.ts` | `registrar(...)` con dobles; luego cambiar el precio del lote y verificar que la venta no cambia |
| Cancelar una reserva y liberar el lote | `dominio/reserva.ts` · `ReservaServicio.ts` | `validarReservaCancelable`; `ReservaServicio.cancelar(...)` con dobles |

Otras reglas que vale la pena cubrir: `calcularEstadoCuota` y `validarPagoAnulable`
(`planPagos.ts`), `normalizarPoligono` y `calcularAreaM2` (`geometria.ts`), `sumarMeses` del 31 de
enero a febrero (`fechas.ts`), `tienePermiso` (`permisos.ts`) y `validarDatosComerciales`
(`lote.ts`).

**Dobles para los servicios.** Los servicios reciben todo por el constructor (ver
`aplicacion/puertos.ts`). Una `UnidadDeTrabajo` falsa entrega los mismos repositorios simulados
dentro y fuera de la transacción:

```ts
const repos = { lotes: { buscarPorId: vi.fn(), cambiarEstadoSi: vi.fn() } /* ... */ };
const uow = { repos, transaccion: (trabajo) => trabajo(repos) };
const reloj = new RelojFijo(new Date('2026-03-15T12:00:00')); // infraestructura/reloj.ts
const servicio = new ReservaServicio(uow as unknown as UnidadDeTrabajo, reloj);
```

Al simular repositorios, tener en cuenta lo que devuelven desde las correcciones de concurrencia
(`docs/DECISIONES.md` §3 y §6):

- `reservas.finalizar`, `ventas.anular` y `pagos.anular` devuelven `true` si cambiaron la fila.
  En el doble: `vi.fn().mockResolvedValue(true)` para el caso normal; con `false` se simula que
  otro usuario la cerró antes, y el servicio debe responder con su código 409
  (`RESERVA_NO_ACTIVA`, `VENTA_NO_VIGENTE`, `PAGO_YA_ANULADO`). Un `vi.fn()` sin valor devuelve
  `undefined`, que cuenta como `false`.
- `PagoServicio.registrar` llama primero a `ventas.bloquearPorId(ventaId)`: el doble necesita ese
  método (`vi.fn()` alcanza).

## 3. Integración: puntos de entrada reales

| Qué | Dónde | Uso |
|---|---|---|
| PostgreSQL en memoria | `infraestructura/bd/baseDeDatos.ts` | `const bd = await abrirBaseDeDatos()` sin URL: base nueva, vacía y con el esquema. Al final `await bd.cerrar()` |
| Datos demo | `infraestructura/bd/datosDemo.ts` | `await cargarDatosDemo(bd, new Date('2026-03-15T12:00:00'))` |
| Reloj fijo | `infraestructura/reloj.ts` | `new RelojFijo(fecha)`; `avanzarDias(10)` para vencimientos |
| Servicios reales | `src/contenedor.ts` | `crearContenedor({ bd, jwtSecreto: 'pruebas', jwtExpiraEn: '1h', reloj, bcryptRondas: 4 })` |
| API sin abrir un puerto | `src/app.ts` | `request(crearApp(servicios)).post('/api/reservas')` con Supertest |
| Token para la API | `POST /api/auth/login` | `{ email: 'asesor@lotes.bo', password: 'asesor123' }` → `token` |

- Cada prueba abre su propia base en memoria (PGlite). Es el mismo SQL que corre en Neon, sin red
  ni credenciales. Las pruebas nunca usan la base de Neon.
- **Concurrencia (§7).** Dos `POST /api/reservas` lanzados juntos con `Promise.all` sobre el mismo
  lote dan exactamente un 201 y un 409 `LOTE_NO_DISPONIBLE`. Lo mismo con dos `POST /api/ventas`.
- **Persistencia.** Después de un `POST`, un `GET` confirma que el cambio quedó guardado.

## 4. E2E: cómo correrlas

1. Una vez por máquina, dentro de la carpeta `e2e`: `npx playwright install chromium`.
2. `npm run test:e2e` levanta la app en modo pruebas (`npm run dev:pruebas`): PostgreSQL en
   memoria, sin tocar Neon, y `POST /api/pruebas/reiniciar` habilitado.
3. Cada prueba llama a `POST http://localhost:3000/api/pruebas/reiniciar` en `beforeEach` e inicia
   sesión por la interfaz.
4. **Detén `npm run dev` antes de `npm run test:e2e`.** Playwright reutiliza el servidor que ya esté
   en el puerto 3000. Antes de todas las pruebas corre `e2e/tests/servidor-de-pruebas.setup.ts`
   (proyecto `preparacion`): si ese servidor no está en modo pruebas, por ejemplo un `npm run dev`
   sobre Neon, se detiene con un mensaje claro en vez de modificar tus datos. Un
   `npm run dev:pruebas` abierto sí se reutiliza, y así las pruebas arrancan más rápido mientras las
   escribes.

Notas sobre el mapa (Google Maps):

- Cada lote tiene una etiqueta HTML sobre su polígono con `data-testid="poligono-<código>"` y
  `data-estado`. Un clic en ella selecciona el lote, igual que un clic en el polígono.
- Sin clave de Google el mapa muestra un aviso de Google; no tapa las etiquetas ni la barra.
- **Dibujar un lote:** `dibujar-lote`, luego `page.mouse.click(x, y)` sobre `mapa` en cada
  esquina, con `waitForTimeout(500)` entre clics (dos clics muy seguidos cuentan como doble clic).
  Para cerrar: clic sobre el primer punto o `terminar-dibujo`. Se abre `modal-lote`.
- Al seleccionar un lote se abre el panel de la derecha y el mapa se angosta. Si después hay que
  hacer clic en coordenadas del mapa, cierra antes el panel con `detalle-cerrar`.
- Los avisos se apilan: usa `getByTestId('aviso-exito').filter({ hasText: '...' })`.

## 5. Datos demo de referencia

Las fechas son relativas al día en que se cargan los datos.

**Proyecto "Urbanización Los Jardines del Urubó"** (PUBLICADO, 22 lotes en los manzanos A, B y C):

| Lote | Estado | Precio | Situación |
|---|---|---|---|
| A-05 | VENDIDO | 75 000 | Financiado a María René Banzer: inicial 15 000 + 12 × 5 000; pagado 20 000, saldo 55 000 (el ejemplo del PDF) |
| B-02 | VENDIDO | 68 000 | Financiado a Juan Pablo Justiniano: 24 cuotas, la cuota 3 está VENCIDA |
| A-08 | VENDIDO | 82 000 | Contado a Ana Lucía Rojas (venía de una reserva) |
| A-03 | RESERVADO | 72 000 | Reserva de María René Banzer, vence en 7 días |
| B-05 | RESERVADO | 70 000 | Reserva de Pedro Suárez Antelo, vence en 3 días |
| C-06 | BLOQUEADO | 64 000 | No se puede reservar ni vender |
| C-02 | DISPONIBLE | 60 000 | Tuvo una reserva cancelada |
| C-03 | DISPONIBLE | 62 000 | Tuvo una reserva que venció |
| Resto | DISPONIBLE | 60 000 a 82 000 | Libres para reservar o vender |

**Proyecto "Condominio Las Palmeras"**: BORRADOR (solo lo ve el administrador), lotes P-01 a P-04;
P-04 no tiene precio.

| Cliente | Documento | Usuario del portal |
|---|---|---|
| María René Banzer | 4839201 | `cliente@lotes.bo` |
| Juan Pablo Justiniano | 6201457 | `cliente2@lotes.bo` |
| Ana Lucía Rojas | 5512893 | — |
| Pedro Suárez Antelo | 7340012 | — |

KML de ejemplo en `frontend/public/ejemplos/`: `urbanizacion_el_mirador.kml` (8 lotes M1-01 a
M1-08 y su perímetro) y `kml_con_errores.kml` (caso negativo: no se importa nada).

## 6. Catálogo de `data-testid`

| Pantalla | `data-testid` |
|---|---|
| Inicio de sesión | `formulario-login`, `login-email`, `login-password`, `login-ingresar`, `login-error`, `login-demo-<correo>` |
| Barra y avisos | `menu`, `menu-proyectos`, `menu-clientes`, `menu-reservas`, `menu-ventas`, `menu-reportes`, `menu-usuarios`, `menu-mi-portal`, `usuario-nombre`, `usuario-rol`, `boton-salir`, `aviso-exito`, `aviso-error` |
| Errores | `acceso-denegado`, `acceso-denegado-volver`, `no-encontrado`, `no-encontrado-volver` |
| Proyectos | `nuevo-proyecto`, `proyecto-<id>` |
| Formulario de proyecto | `modal-proyecto`, `proyecto-nombre`, `proyecto-ubicacion`, `proyecto-descripcion`, `proyecto-guardar`, `proyecto-cancelar` |
| Panel del proyecto | `volver-proyectos`, `proyecto-titulo`, `proyecto-estado`, `editar-proyecto`, `publicar-proyecto`, `contador-<ESTADO>`, `filtro-estado`, `filtro-etapa`, `filtro-manzano`, `filtro-busqueda`, `lista-lotes`, `item-lote-<código>` con `data-estado`, `resumen-manzanos` |
| Mapa | `mapa`, `mapa-error`, `leyenda`, `poligono-<código>` con `data-estado`, `actualizar-mapa`, `ayuda-asesor` |
| Dibujo y edición | `dibujar-lote`, `dibujar-limite`, `aviso-dibujo`, `cancelar-dibujo`, `herramienta-dibujo`, `dibujo-vertices`, `vertice-dibujo`, `deshacer-vertice`, `terminar-dibujo`, `aviso-edicion`, `guardar-forma`, `cancelar-forma` |
| Panel del lote | `panel-lote` con `data-lote`, `detalle-cerrar`, `detalle-codigo`, `detalle-estado`, `detalle-superficie`, `detalle-dimensiones`, `detalle-precio`, `detalle-reserva`, `detalle-venta`, `detalle-ver-venta` |
| Acciones del lote | `accion-reservar`, `accion-vender`, `accion-cancelar-reserva`, `accion-editar-lote`, `accion-editar-forma`, `accion-bloquear`, `accion-desbloquear`, `accion-eliminar` |
| Datos del lote | `modal-lote`, `lote-calculado`, `lote-codigo`, `lote-precio`, `lote-manzano`, `lote-etapa`, `lote-superficie`, `lote-dimensiones`, `lote-error`, `lote-guardar`, `lote-cancelar` |
| Importar KML | `importar-kml`, `modal-kml`, `kml-archivo`, `kml-nombre`, `kml-usar-ejemplo`, `kml-precio`, `kml-manzano`, `kml-etapa`, `kml-error`, `kml-importar`, `kml-cancelar` |
| Reserva | `modal-reserva`, `reserva-cliente` (y `reserva-cliente-buscar`, `reserva-cliente-nuevo`), `reserva-vencimiento`, `reserva-observacion`, `reserva-error`, `reserva-confirmar`, `reserva-cancelar` |
| Cliente (formulario) | `modal-cliente`, `cliente-nombre`, `cliente-documento`, `cliente-telefono`, `cliente-email`, `cliente-direccion`, `cliente-guardar`, `cliente-cancelar` |
| Venta | `modal-venta`, `venta-cliente-reserva`, `venta-cliente` (y `-buscar`, `-nuevo`), `venta-precio`, `venta-contado`, `venta-financiado`, `venta-cuota-inicial`, `venta-numero-cuotas`, `venta-primera-cuota`, `venta-metodo`, `venta-vista-plan`, `venta-error-plan`, `venta-error`, `venta-confirmar`, `venta-cancelar` |
| Confirmaciones | `modal-cancelar-reserva`, `modal-eliminar-lote`, `modal-publicar`, `confirmar-motivo`, `confirmar-aceptar`, `confirmar-cancelar`, `modal-cerrar` |
| Plan de pagos | `volver-ventas`, `venta-estado`, `anular-venta`, `venta-anulada`, `resumen-saldo`, `venta-precio-pactado`, `venta-total-pagado`, `venta-saldo`, `venta-vencidas`, `venta-proxima`, `venta-mapa`, `tabla-cuotas`, `cuota-<n>` con `data-estado`, `cuota-<n>-estado`, `pagar-cuota-<n>`, `tabla-pagos`, `pago-<id>`, `anular-pago-<id>` |
| Registrar pago | `modal-pago`, `pago-monto`, `pago-metodo`, `pago-referencia`, `pago-error`, `pago-confirmar`, `pago-cancelar` |
| Clientes | `nuevo-cliente`, `buscar-cliente`, `tabla-clientes`, `fila-cliente-<documento>`, `editar-cliente-<documento>`, `volver-clientes`, `cliente-saldo-total` |
| Reservas | `pestana-reservas-<ESTADO o todas>`, `tabla-reservas`, `fila-reserva-<código>`, `ver-en-mapa-<código>`, `cancelar-reserva-<código>` |
| Ventas | `ventas-filtro-proyecto`, `ventas-filtro-cliente`, `ventas-filtro-estado`, `tabla-ventas`, `fila-venta-<código>`, `ver-venta-<código>` |
| Portal del cliente | `mi-compra-<código>`, `mi-compra-pagado`, `mi-compra-saldo`, `mi-plan-<código>`, `mi-reserva-<código>`, `mi-mapa` |
| Usuarios | `nuevo-usuario`, `tabla-usuarios`, `fila-usuario-<correo>`, `usuario-activo-<correo>`, `modal-usuario`, `usuario-nombre-input`, `usuario-email`, `usuario-password`, `usuario-rol-select`, `usuario-cliente`, `usuario-error`, `usuario-guardar`, `usuario-cancelar` |
| Reportes | `reporte-actualizar`, `reporte-vendido`, `reporte-cobrado`, `reporte-por-cobrar`, `reporte-vencido`, `tabla-reporte`, `reporte-proyecto-<id>` |

## 7. Trazabilidad con la consigna

Completar la última columna a medida que se escriben las pruebas (cada responsable, solo sus
filas). Esta tabla se muestra en la presentación final. Las últimas filas son ítems del checklist
§15 y de §5, §7 y §11 que no aparecen en las listas de §12 a §14 pero también se evalúan.

| Consigna | Ítem | Nivel | Responsable | Prueba |
|---|---|---|---|---|
| §12 | Cambios permitidos de estado de un lote | Unitario | Laura | pendiente |
| §12 | Impedir reservar un lote que no esté DISPONIBLE | Unitario | Laura | pendiente |
| §12 | Impedir vender un lote ya VENDIDO | Unitario | Laura | pendiente |
| §12 | Calcular total pagado y saldo pendiente | Unitario | Laura | pendiente |
| §12 | Generar cuotas de un plan de pagos | Unitario | Laura | pendiente |
| §12 | Impedir pagos con montos inválidos | Unitario | Laura | pendiente |
| §12 | Impedir que el saldo resulte negativo | Unitario | Laura | pendiente |
| §12 | Validar vencimiento de reservas | Unitario | Laura | pendiente |
| §12 | Validar que una venta conserve el precio pactado | Unitario | Laura | pendiente |
| §12 | Validar reglas para cancelar una reserva y liberar el lote | Unitario | Laura | pendiente |
| §13 | Crear un proyecto y persistir sus datos | Integración | Raul | pendiente |
| §13 | Crear o importar lotes y recuperar su geometría | Integración | Raul | pendiente |
| §13 | Registrar un cliente | Integración | Raul | pendiente |
| §13 | Reservar un lote y verificar el cambio de estado | Integración | Raul | pendiente |
| §13 | Reservar nuevamente el mismo lote y verificar el rechazo | Integración | Raul | pendiente |
| §13 | Registrar una venta y comprobar que el lote pase a VENDIDO | Integración | Luciana | pendiente |
| §13 | Crear un plan de pagos y persistir sus cuotas | Integración | Luciana | pendiente |
| §13 | Registrar un pago y verificar cuota, total pagado y saldo | Integración | Luciana | pendiente |
| §13 | Consultar lotes filtrados por estado o proyecto | Integración | Raul | pendiente |
| §13 | Comprobar permisos de administrador, asesor y cliente | Integración | Luciana | pendiente |
| §13 | Comprobar que un cliente no acceda a operaciones de otro | Integración | Luciana | pendiente |
| §14 | E2E 01 Crear proyecto, dibujar lotes y verlos en el mapa | E2E | Mario | pendiente |
| §14 | E2E 02 Reservar lote | E2E | Mario | pendiente |
| §14 | E2E 03 Evitar reserva duplicada | E2E | Mario | pendiente |
| §14 | E2E 04 Venta | E2E | Mario | pendiente |
| §14 | E2E 05 Plan de pagos | E2E | Mario | pendiente |
| §14 | E2E 06 Liberar reserva | E2E | Mario | pendiente |
| §14 | E2E 07 Portal del cliente | E2E | Mario | pendiente |
| §14 | E2E 08 Control de acceso | E2E | Mario | pendiente |
| §15 | Test de venta duplicada | Unitario e Integración | Laura y Luciana | pendiente |
| §15 | Mocks/stubs cuando corresponde (servicios con repositorios simulados) | Unitario | Laura | pendiente |
| §7 | Dos reservas simultáneas del mismo lote: una se acepta y la otra recibe 409 | Integración | Raul | pendiente |
| §5 | Una reserva vencida libera el lote | Integración | Raul | pendiente |
| §11 | Consistencia: si falla el registro de la venta, no queda nada a medias | Integración | Luciana | pendiente |
