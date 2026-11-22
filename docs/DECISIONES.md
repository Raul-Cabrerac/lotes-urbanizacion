# Decisiones técnicas

Cada decisión indica qué se eligió, qué alternativas había y por qué. Es material para la defensa
oral: cualquier integrante debe poder explicarla. Una decisión nueva se agrega aquí en el mismo
pull request que la introduce.

## 1. Mapa: Google Maps con polígonos dibujados sobre la imagen satelital

- **Elegido:** Google Maps (Maps JavaScript API) cargado con `@googlemaps/js-api-loader`, vista
  satelital con calles. Los lotes se marcan dibujando polígonos directamente sobre el terreno.
- **Alternativas:** Leaflet con OpenStreetMap y el plugin Geoman (la versión anterior del proyecto).
- **Por qué:**
  - La imagen satelital de Google permite ver los terrenos reales y dibujar los lotes encima,
    que es lo que pide la consigna (§4: dibujar y editar polígonos en el mapa).
  - El dibujo es propio y corto (`HerramientaDibujo.tsx`): clic por vértice, "imán" que pega el
    clic al vértice de un lote vecino (los lotes quedan contiguos, sin huecos) y cierre en el primer
    punto. La herramienta de dibujo de Google (DrawingManager) está obsoleta.
  - La edición de forma usa los polígonos editables de Google: se arrastran los vértices.
  - Google dibuja los polígonos en un canvas, sin elementos HTML. Para que los E2E encuentren cada
    lote, una etiqueta HTML sobre el polígono lleva `data-testid="poligono-<código>"` y
    `data-estado` (`capaHtml.ts`).
- **Costo:** la clave necesita un proyecto de Google Cloud con facturación, pero el uso del
  proyecto queda dentro del cupo gratuito. Sin clave el mapa funciona en modo desarrollo (ver
  `docs/GOOGLE_MAPS.md`).

## 2. Base de datos: PostgreSQL en Neon

- **Elegido:** PostgreSQL en Neon (región São Paulo) con el driver node-postgres (`pg`) y un pool.
- **Alternativas:** PostgreSQL instalado en cada máquina o en Docker; el driver serverless de Neon.
- **Por qué:**
  - Es PostgreSQL real: `NUMERIC(14,2)` exacto para el dinero, `DATE` para las fechas, `JSONB`
    para la geometría, claves foráneas, CHECK, índices únicos parciales y bloqueo de filas. Cubre
    la persistencia, las transacciones atómicas y la consistencia de la consigna (§11).
  - No hay nada que instalar: el grupo comparte el proyecto de Neon y cada uno trabaja en su rama.
  - Neon recomienda `pg` con pool para un servidor Node que corre todo el tiempo. `DATABASE_URL`
    pasa por el pooler y la usa la aplicación; `DATABASE_URL_UNPOOLED` es directa y se usa para
    las migraciones.
- **Pruebas sin red:** las pruebas de integración y el modo pruebas de los E2E usan PGlite, el
  mismo motor de PostgreSQL compilado a WebAssembly, en memoria. Mismo SQL y mismos repositorios,
  sin credenciales ni latencia, y sin tocar Neon. `abrirBaseDeDatos` elige: con URL usa Neon, sin
  URL usa la base en memoria.

## 3. Concurrencia: dos barreras contra la reserva duplicada (consigna §7)

1. **Transacción con UPDATE condicional** (`RepositorioLotesSql.cambiarEstadoSi`). El lote cambia
   de estado solo si sigue en el estado esperado:
   `UPDATE lotes SET estado = 'RESERVADO' WHERE id = $1 AND estado = 'DISPONIBLE'`. Si dos
   peticiones llegan a la vez, PostgreSQL bloquea la fila: la segunda espera, vuelve a evaluar el
   `WHERE`, afecta 0 filas y el servicio responde 409 `LOTE_NO_DISPONIBLE`.
2. **Índices únicos parciales:** un lote no puede tener dos reservas `ACTIVA` ni dos ventas
   `VIGENTE`. Si algo se saltara la primera barrera, PostgreSQL rechaza el duplicado.

Se comprobó contra Neon con reservas y ventas simultáneas sobre el mismo lote: una recibe 201 y la
otra 409.

**Cierres condicionados y orden de bloqueo.** Lo mismo vale para cerrar una operación: cancelar,
vencer o convertir una reserva y anular una venta o un pago son `UPDATE` condicionales
(`... WHERE id = $1 AND estado = 'ACTIVA'`). Si otra operación cerró la fila un instante antes, se
responde 409 (`RESERVA_NO_ACTIVA`, `LOTE_NO_DISPONIBLE`, `VENTA_NO_VIGENTE`, `PAGO_YA_ANULADO`) en
vez de pisar su resultado; por ejemplo, una reserva convertida en venta no puede quedar luego como
CANCELADA. Además, toda operación que cambia varias tablas respeta un orden global acíclico de
bloqueos (`proyectos -> lotes`, `reservas -> lotes`, `ventas -> lotes / pagos`) para que dos
transacciones no se esperen mutuamente (deadlock), y `procesarVencidas` procesa cada reserva
expirada en orden determinista (`ORDER BY id`) y transacciones cortas independientes.

## 4. Arquitectura en capas con puertos

- **Elegido:** dominio, aplicación (servicios), infraestructura y HTTP, con las dependencias
  apuntando hacia el dominio. Los servicios reciben interfaces (`UnidadDeTrabajo`, `Reloj`,
  `Hasher`, `ServicioTokens`, `LectorKml`) por el constructor; `contenedor.ts` las conecta.
- **Por qué:** las reglas de negocio son funciones puras en `dominio/` que se prueban sin base de
  datos ni HTTP. Los servicios se prueban con dobles (`vi.fn()`) y la integración usa las
  implementaciones reales. Es lo que pide la consigna (§12: reglas reales, mocks cuando corresponde).
- **Sin ORM:** el SQL está escrito a mano, un archivo por repositorio. Es corto, se lee y se explica.

## 5. Reloj inyectado

- La fecha actual solo se obtiene en `RelojSistema`. Las pruebas usan `RelojFijo`.
- **Por qué:** el vencimiento de reservas, las cuotas vencidas y las fechas del cronograma dependen
  de hoy. Con un reloj fijo las pruebas son deterministas.

## 6. El saldo se calcula, no se guarda

- `resumirPlan` calcula el total pagado (suma de pagos VÁLIDOS), el saldo (precio pactado menos
  total pagado) y el estado de cada cuota (PENDIENTE, PAGADA o VENCIDA) cada vez que se consulta.
- **Por qué:** no hay dos fuentes de verdad que puedan desincronizarse. Anular un pago lo excluye
  de la suma y el saldo se corrige solo, conservando la trazabilidad (consigna §9).
- **Pagos simultáneos y anulación:** `PagoServicio.registrar` y `PagoServicio.anular` bloquean la fila de la venta
  (`RepositorioVentas.bloquearPorId`, `SELECT ... FOR UPDATE`) antes de validar el saldo o anular un pago. Si dos
  personas pagan la misma venta a la vez, la segunda espera, lee el saldo ya descontado y
  `validarPago` la rechaza si se pasa (`MONTO_EXCEDE_SALDO` o `CUOTA_YA_PAGADA`). Asimismo, si una
  venta ya fue `ANULADA` (o se anula concurrentemente), `PagoServicio.anular` rechaza anular sus
  pagos con `409 VENTA_NO_VIGENTE`. Sin el bloqueo
  las dos leían el mismo saldo, el total pagado podía superar el precio pactado y la venta quedaba
  respondiendo error 500. PGlite atiende una transacción a la vez, así que esta carrera solo se
  reproduce sobre PostgreSQL real (Neon).

## 7. Express 5, zod y errores con código

- Express 5 propaga al manejador de errores lo que lanzan las rutas `async`.
- zod valida la **forma** de los datos (400). Las **reglas** de negocio las valida el dominio
  (409 o 422). Cada validación existe una sola vez.
- Toda excepción lleva un `codigo` estable (`LOTE_NO_DISPONIBLE`, `MONTO_EXCEDE_SALDO`...). Las
  pruebas verifican el código, no el texto: el mensaje puede mejorar sin romper pruebas.

## 8. Geometría sin librerías externas

- `dominio/geometria.ts` valida el polígono y calcula la superficie (m²) y las medidas
  referenciales con fórmulas esféricas cortas. No depende de Turf ni de otra librería.
- Al terminar de dibujar, el frontend pide el cálculo al backend
  (`POST /api/lotes/analizar-geometria`) en vez de repetir la regla.

## 9. Frontend: React y Vite, sin estado global

- Cada página pide sus datos a la API y los vuelve a pedir después de cada operación: lo que se ve
  es siempre lo que está guardado.
- `data-testid` en todo control: es lo que permite E2E estables (consigna §14).

## 10. Pruebas: Vitest, Supertest y Playwright

- **Vitest** para unitarias e integración: rápido y con TypeScript nativo.
- **Supertest** llama a la app Express sin abrir un puerto (`crearApp` no hace `listen`).
- **Playwright** para E2E: espera automática, varios contextos de navegador (para E2E 03) y
  `getByTestId`.
- `npm run dev:pruebas` usa PostgreSQL en memoria y habilita `POST /api/pruebas/reiniciar`, para
  que cada E2E empiece desde los mismos datos.

## 11. Origen del código

La base funcional (dominio, servicios, rutas y pantallas) viene de una primera versión hecha con
otro asistente. Se adaptó a Neon, se cambió el mapa a Google Maps y se reorganizó para cumplir las
convenciones del equipo (archivos cortos, sin `any` ni `!`, un repositorio por archivo).

## 12. Ubicación de las pruebas: cada nivel junto a lo que prueba

- **Elegido:**

  ```
  backend/tests/unitarias/     unitarias (§12): reglas del dominio y servicios con mocks
  backend/tests/integracion/   integración (§13): API + PostgreSQL en memoria
  backend/tests/apoyo/         ayudantes compartidos de las pruebas del backend
  e2e/tests/                   E2E (§14): el sistema completo en el navegador
  e2e/apoyo/                   inicio de sesión por rol y reinicio de los datos de prueba
  ```

  Cada nivel tiene su carpeta y su comando: `npm run test:unit`, `npm run test:integracion` y
  `npm run test:e2e`.
- **Alternativas:**
  1. Cada prueba unitaria junto a su archivo de código (`src/dominio/lote.test.ts`), como estaba
     configurado al principio.
  2. Una carpeta `tests/` en la raíz del repositorio, con subcarpetas por nivel y por parte
     (`tests/unitarias/backend/`, `tests/integracion/frontend/`...).
- **Por qué:**
  - **Una prueba vive junto a lo que prueba.** Las unitarias y las de integración prueban una sola
    parte del sistema, el backend, así que van dentro de `backend/`. El E2E prueba el sistema
    completo (navegador, interfaz, API y base de datos), no pertenece a ninguna parte y por eso
    tiene su propia carpeta en la raíz.
  - `backend/`, `frontend/` y `e2e/` son paquetes independientes (npm workspaces), cada uno con
    sus dependencias, su configuración de TypeScript (Node o navegador) y su Vitest. Dentro de su
    paquete, las pruebas funcionan con la configuración que ya existe, con imports cortos y con la
    cobertura midiendo `src/` sin pasos extra. La carpeta en la raíz (alternativa 2) exigía un
    cuarto paquete, dos configuraciones de TypeScript, forzar la cobertura sobre código de otro
    paquete e imports como `../../../backend/src/...`: más configuración y más riesgo de errores
    entre cuatro personas, sin aportar nada a lo que evalúa la consigna.
  - Frente a la alternativa 1, separar `tests/unitarias/` de `src/` deja una carpeta por nivel y
    por responsable, no mezcla pruebas con código de producción y se muestra con claridad en la
    defensa.
- **Sin pruebas de integración del frontend.** Las pruebas de integración de la consigna (§13)
  son de API y base de datos: persistir, recuperar, rechazar, permisos. Las reglas de negocio
  están en el backend y el frontend no las repite (`docs/CONVENCIONES.md` §4). La interfaz se
  prueba con los E2E (§14), que la usan como una persona. Las unitarias del frontend (funciones
  puras, como el color de cada estado del lote) son opcionales y solo se escriben si §12 ya está
  completo.

## 13. Organización del equipo: un nivel de prueba por persona

- **Elegido:** cada integrante es dueño de un nivel de prueba, sin rotación: Laura las unitarias,
  Raul y Luciana la integración (repartida por recurso: cada archivo tiene un solo dueño) y Mario
  los E2E junto con las mejoras de la interfaz. El detalle está en `AGENTS.md` §6.
- **Alternativas:** cada integrante con un módulo de negocio y sus tres niveles de prueba; rotar
  las responsabilidades cada semana.
- **Por qué:**
  - Cada carpeta, o cada archivo en el caso de integración, tiene un solo dueño: nadie edita las
    pruebas de otro y no hay conflictos al integrar los cambios.
  - Cada uno aprende a fondo una herramienta: Vitest con mocks, Supertest con base de datos o
    Playwright.
  - La interfaz y los E2E quedan en las mismas manos: quien cambia la vista es quien mantiene las
    pruebas que dependen de ella. La interfaz se termina antes de escribir los E2E y desde ese
    momento se congela.
  - Para que todos puedan explicar los tres niveles en la defensa, cada pull request lo revisa
    alguien de otro nivel.

## 14. Una sola fuente para las reglas que cruzan capas

- **Estado:** propuesta en la rama `dev`, pendiente del acuerdo del grupo (`AGENTS.md` §7.8).
  `main` no cambia hasta que se apruebe.
- **Elegido:**
  - Cada entidad declara su máquina de estados como una tabla de operaciones en su módulo del
    dominio (`OPERACIONES_LOTE`, `OPERACIONES_RESERVA`, `OPERACIONES_VENTA`, `OPERACIONES_PAGO`,
    `OPERACIONES_PROYECTO`, con `admite` de `dominio/transiciones.ts`). La leen las validaciones,
    el único UPDATE condicional de los repositorios (`transicionarSi` en `consultas.ts`) y los
    botones de la interfaz.
  - El frontend importa de `backend/src/dominio` (es código puro) los tipos, las listas de
    estados, los límites y las reglas de qué operación admite cada registro, en vez de copiarlos.
  - Una reserva vencida se cierra en su propia transacción antes de reservar, vender o cancelar
    (`vencerReserva` y `vencerReservaDelLote`), además de en cada petición. Las operaciones ya no
    tienen casos especiales para el vencimiento.
  - Los códigos de error forman un catálogo tipado (`CODIGOS_ERROR` en `dominio/errores.ts`):
    cada código tiene un solo tipo y el tipo decide el estado HTTP.
  - Lo que ve cada rol (los estados de proyecto visibles, las operaciones de un cliente) se decide en
    `dominio/permisos.ts`.
  - Los errores de PostgreSQL se traducen en un solo lugar, `crearConsultas` en
    `infraestructura/bd/repositorios/consultas.ts`: cada restricción única tiene su código del
    catálogo, y `http/` ya no conoce los códigos de PostgreSQL.
  - Los datos demo se cargan por los servicios, así que pasan a `backend/src/datosDemo.ts`, junto
    a la raíz de composición; el vaciado SQL queda en `infraestructura/bd/baseDeDatos.ts`.
- **Alternativas:** dejar las reglas repetidas en cada capa; que la API devuelva las acciones
  permitidas de cada recurso; un paquete compartido de tipos entre backend y frontend.
- **Por qué:**
  - Un cambio de regla tocaba hasta cinco lugares (dominio, servicio, SQL, interfaz y
    documentación) sin que nada avisara si uno quedaba atrás. Ahora toca uno.
  - Importar el dominio no agrega dependencias ni configuración: no hay `rootDir` y Vite sirve
    archivos del workspace. Que la API devolviera las acciones habría cambiado todas las
    respuestas y la documentación de `docs/API.md`.
  - Con el vencimiento en su propia transacción, el lote ya liberado es un hecho guardado antes
    de que empiece la operación, en vez de un caso que cada operación debía recordar.

## 15. Reglas de producto aclaradas por el grupo

- **Contexto:** al reordenar el código (§14) quedaron preguntas que el código no respondía. El
  grupo las decidió así (2026-11-18):
- **Decisión:**
  - **Un lote inconsistente no frena el vencimiento de reservas.** `procesarVencidas` corre antes
    de cada petición. Si una reserva vencida apunta a un lote que ya no está RESERVADO, esa reserva
    se omite, se avisa en el log y las demás vencen; operar sobre ese lote sí responde 409
    `LOTE_MODIFICADO`. Antes, un solo lote así hacía responder 409 a toda la API.
  - **El resumen por manzano muestra los lotes BLOQUEADOS.** El administrador puede retirar un lote
    de la venta por cualquier motivo, y el resumen tiene que sumar el total.
  - **Cada pantalla exige el permiso de lo que muestra y opera, no el de su nombre.** `/ventas` es
    la mesa de trabajo de quien vende y cobra, así que exige `ventas:registrar`; el cliente ve sus
    ventas en su portal y abre su detalle (`/ventas/:id`, `ventas:ver`). El mapa
    `/proyectos/:id` opera lotes, así que exige `lotes:ver`. Cada línea de
    `frontend/src/rutas.ts` lleva su razón.
  - **Los valores iniciales de los formularios son sugerencias, no reglas:** 7 días de reserva y,
    en la venta, modalidad financiada, cuota inicial del 20 % y 12 cuotas. El backend no los exige y
    las pruebas no los tratan como reglas. Están con nombre en `ModalReserva.tsx` y
    `ModalVenta.tsx`.
- **Por qué:** son reglas del negocio. Escritas aquí y junto al código, nadie tiene que adivinar
  si un valor es una regla o un descuido, ni volver a preguntarlo.

## 16. «Crédito financiado»: el nombre visible de la venta financiada

- **Contexto:** al revisar el proyecto, el docente pidió (2026-11-21) que las modalidades de pago
  incluyan el «crédito financiado».
- **Elegido:** la modalidad `FINANCIADO` se muestra como «Crédito financiado» en todas las
  pantallas. Es una sola línea, `ETIQUETA_MODALIDAD` en `frontend/src/utilidades/estados.ts`. No
  cambian el valor `FINANCIADO`, la base de datos, la API ni los `data-testid`.
- **Alternativas:** agregar una tercera modalidad distinta (por ejemplo, un crédito bancario).
  Habría que definir una regla que la consigna no tiene y tocar más de 20 archivos, con una
  migración nueva.
- **Por qué:** la consigna (§9) define dos modalidades, al contado o financiada, y la financiada ya
  es un crédito directo de la empresa: cuota inicial, cuotas mensuales, cronograma, pagos y saldo.
  Cambiar el nombre cumple el pedido sin riesgo, y los E2E no dependen de ese texto.
