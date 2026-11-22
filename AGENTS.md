# AGENTS.md · Gestión de Urbanizaciones y Lotes

Instrucciones para los agentes de código del equipo (Claude Code, Codex u otro) y para las personas
que los usan. **Léelo completo antes de cambiar cualquier archivo.** Si algo de otro documento
contradice este archivo, mandan este archivo y `docs/CONSIGNA.md`, y se avisa al grupo para
corregir el otro documento.

## 1. Contexto

- Proyecto final de **Taller de Actualización V (Testing de Software)**, NUR 2026.
- Equipo: **Raul** (coordina), **Mario**, **Laura** y **Luciana**.
- El producto ya funciona (ver `README.md` §2). **Lo que se evalúa son las pruebas** de las reglas
  comerciales y financieras (`docs/CONSIGNA.md` §12 a §15). Desde el 2026-11-21 el docente evalúa
  solo las **unitarias** y las **E2E**, y pide una **cobertura mínima de 80 %** del backend. Las de
  integración siguen en el repo y en el CI, pero ya no se evalúan. En la defensa cada integrante
  explica sus propias pruebas: no se entrega nada que la persona no entienda.

### Etapas del proyecto

| Etapa | Qué se hace | Quién toca código |
|---|---|---|
| **0 · Producto y repo** | Correcciones del producto, CI y documentación (terminada el 2026-11-08) | Raul |
| **1 · Base de pruebas e interfaz** | Raul: ayudantes compartidos (`backend/tests/apoyo/`, `e2e/apoyo/`) y una prueba de ejemplo por nivel. Mario: mejoras de la interfaz aprobadas en un issue (§6). Laura y Luciana: instalan, recorren la app y diseñan la tabla de casos de sus ítems, sin código (terminada el 2026-11-21) | Raul (pruebas y configuración) y Mario (solo `frontend/src/`) |
| **2 · Pruebas por nivel** | Cada dueño escribe las pruebas de su nivel (§6). La interfaz queda congelada | Cada uno, solo en sus archivos |
| **3 · Cierre** | Regresión completa dos veces, trazabilidad con la consigna, ensayo de la defensa | Todos |

**Etapa actual: 2.** Si la etapa no te permite tocar código, no lo toques: describe el cambio en
un issue de GitHub y avisa al dueño.

## 2. Qué leer según la tarea

| Tarea | Leer antes de empezar |
|---|---|
| Cualquiera | Este archivo y `docs/CONVENCIONES.md` |
| Entender un requisito | `docs/CONSIGNA.md` (manda) y `README.md` §5 (reglas de negocio) |
| Prueba unitaria | `docs/MANUAL_UNITARIAS.md`, `.claude/skills/test-unitario/SKILL.md` y `docs/GUIA_TESTING.md` §2 |
| Prueba de integración | `.claude/skills/test-integracion/SKILL.md` y `docs/GUIA_TESTING.md` §3 |
| Prueba E2E | `.claude/skills/test-e2e/SKILL.md` y `docs/GUIA_TESTING.md` §4 a §6 (`data-testid`) |
| Cambio en el producto | `.claude/skills/nueva-funcionalidad/SKILL.md`, `docs/DECISIONES.md` y `docs/API.md` |
| Revisar un pull request | `.claude/skills/revisar-codigo/SKILL.md` |
| Base de datos | `docs/BASE_DE_DATOS.md` |

Las skills son procedimientos paso a paso en `.claude/skills/<nombre>/SKILL.md`. Claude Code las
carga solo; con Codex u otro agente, abre el `SKILL.md` que corresponda y síguelo.

## 3. Comandos

Requisito: Node.js 22.12 o superior. Una vez: `npm install`.

| Comando | Para qué |
|---|---|
| `npm run dev:pruebas` | App completa con PostgreSQL **en memoria**: no necesita Neon ni credenciales |
| `npm run dev` | App sobre tu rama de Neon (necesita `.env.local`, ver `docs/BASE_DE_DATOS.md`) |
| `npm run typecheck` | Tipos de backend, frontend y e2e |
| `npm run test:unit` | Unitarias (`backend/tests/unitarias/`) |
| `npm run test:integracion` | Integración (`backend/tests/integracion/`, PostgreSQL en memoria) |
| `npm test` | Unitarias e integración juntas |
| `npm run test:e2e` | E2E con Playwright (`e2e/tests/`; levanta `dev:pruebas` solo). Antes, detén cualquier `npm run dev` |
| `npm run test:cobertura -w backend -- tests/unitarias` | Cobertura de `dominio/` y `aplicacion/` medida solo con unitarias, la que se evalúa (mínimo 80 %). `npm run test:cobertura` a secas también corre integración y da un número más alto |

Para escribir y correr pruebas **no hace falta Neon**: integración y E2E usan PostgreSQL en
memoria. Neon es para la demostración y para quien necesite datos que persistan.

## 4. Mapa del código

```
backend/src/dominio/        reglas puras (lote, reserva, planPagos, venta, dinero, fechas, geometria, permisos, errores)
backend/src/aplicacion/     puertos (puertos.ts, repositorios.ts) y servicios que orquestan reglas + repositorios
backend/src/infraestructura/ PostgreSQL (Neon o en memoria), migraciones, repositorios SQL, datos demo, JWT, KML, reloj
backend/src/http/           rutas, validación zod, autenticación, traducción de errores a HTTP
backend/tests/unitarias/    pruebas unitarias (§12), misma estructura que src/: dominio/ y servicios/
backend/tests/integracion/  pruebas de integración (§13): API + PostgreSQL en memoria
backend/tests/apoyo/        ayudantes compartidos de las pruebas del backend
frontend/src/               React + Google Maps; cada control tiene data-testid
e2e/tests/                  pruebas E2E (§14) con Playwright
e2e/apoyo/                  ayudantes de los E2E: sesión por rol, reinicio de datos, mapa, respuestas de la API
docs/                       consigna, convenciones, decisiones, API, guía de testing
```

Detalle en `README.md` §4; por qué las pruebas están ahí, en `docs/DECISIONES.md` §12; la regla
de dependencia, en `docs/CONVENCIONES.md` §4.

## 5. Reglas que no se negocian

1. **Todo en español**; identificadores sin tildes ni eñes (`anio`, `numeroCuotas`).
2. **`dominio/` es puro**: sin Express, `pg`, zod, JWT ni `new Date()`. La fecha sale del puerto
   `Reloj` (`RelojFijo` en pruebas).
3. **Dinero** solo con `dominio/dinero.ts` (`sumar`, `restar`, `comparar`, `dividirEnPartes`). El
   saldo se **calcula**, nunca se guarda.
4. **Errores con `codigo`** estable (catálogo en `docs/API.md`). Las pruebas verifican el `codigo`,
   nunca el texto del mensaje.
5. **Operaciones críticas** dentro de `uow.transaccion`, usando solo los repositorios que recibe.
   Todo `UPDATE` que cambie un estado lleva la condición del estado esperado
   (`WHERE id = $1 AND estado = ...`) y el servicio responde 409 si no cambió ninguna fila.
6. **zod valida la forma** (400); **el dominio valida las reglas** (409 o 422).
7. **Interfaz**: todo control y todo dato verificable lleva `data-testid` (catálogo en
   `docs/GUIA_TESTING.md` §6). No se renombra ni se quita uno existente.
8. **Pruebas** con **Vitest** (`vi.fn()`, no Jest), Supertest y Playwright:
   - primera línea: `// Consigna §N: <ítem>`;
   - estructura AAA con los comentarios `// Arrange`, `// Act`, `// Assert`;
   - casos positivo, negativo y límite; `toThrow` siempre sobre una función flecha;
   - sin `.only`, `.skip`, `waitForTimeout`, esperas fijas, ni `if`/`for`/`try` dentro de un `it`.
     Única excepción: la pausa de 0,5 s entre clics al dibujar en Google Maps, que vive solo en
     `e2e/apoyo/mapa.ts` (Google toma dos clics más rápidos como doble clic; `docs/GUIA_TESTING.md` §4);
   - mocks solo en unitarias; integración con la base en memoria (nunca Neon); E2E sin simular nada;
   - cada prueba en la carpeta de su nivel (§4), nunca dentro de `src/`.

## 6. Equipo: quién es dueño de qué

Reparto **por nivel de prueba**, sin rotación: cada carpeta o archivo tiene una sola dueña o
dueño. Por qué: `docs/DECISIONES.md` §13. El reparto cambió el 2026-11-21, cuando el docente dejó
de evaluar las pruebas de integración.

| Integrante | Nivel | Ítems de la consigna | Rol transversal |
|---|---|---|---|
| **Luciana** | Unitarias del dominio | §12: los ítems que viven en `dominio/` (estados del lote, reservar y vender, saldo, cuotas, pagos inválidos, saldo negativo, vencimiento y la regla de cancelar una reserva) | Cobertura de `dominio/` |
| **Laura** | Unitarias de los servicios | §12: el precio pactado y liberar el lote al cancelar (`VentaServicio`, `ReservaServicio`); reserva y venta duplicadas con mocks; servicios con mocks/stubs | Cobertura de `aplicacion/`. Entre las dos: mínimo 80 % (`docs/MANUAL_UNITARIAS.md`) |
| **Raul** | E2E | §14: E2E 01 a 08 (16 pruebas) | Coordinación; ayudantes `apoyo/`; integra los pull requests y, mientras el CI no esté disponible, los verifica en su PC |
| **Mario** | Interfaz (terminada y congelada) | — | Dueño de `frontend/src/` y del catálogo de `data-testid` (`docs/GUIA_TESTING.md` §6); valida los pull requests de E2E |

**Archivos de cada uno:**

| Integrante | Archivos |
|---|---|
| Luciana | `backend/tests/unitarias/dominio/<modulo>.test.ts` |
| Laura | `backend/tests/unitarias/servicios/<Servicio>.test.ts` |
| Raul | `e2e/tests/`, los ayudantes `e2e/apoyo/` y `backend/tests/apoyo/`, y las pruebas de integración que ya existen |
| Mario | `frontend/src/` |

Las unitarias que ya están en `main` las escribió Mario: siguen en su archivo y cada dueña agrega
las suyas sin borrarlas.

**Revisión cruzada.** Laura y Luciana se revisan entre ellas. Mario revisa los de Raul y, si los
aprueba, los integra. Raul integra los demás.

**La interfaz está terminada.** Desde la etapa 2 está congelada: cualquier cambio en
`frontend/src/` necesita el visto bueno de Mario (§7, regla 9), no quita pasos de los flujos de la
consigna y no renombra `data-testid`.

**Unitarias del frontend (opcional).** Solo si §12 ya está completo y en verde: funciones puras de
`frontend/src/` (el color de cada estado del lote, la geometría del dibujo, el formato de montos)
en `frontend/tests/unitarias/`. La consigna no las exige; Raul las configura si se piden.

**Antes de escribir pruebas:** cada uno instala Node 22, clona el repo, corre `npm ci` y
`npm run dev:pruebas`, recorre la app en <http://localhost:5173> con los usuarios demo y lee la
guía de su nivel. Para las unitarias, empezar por `docs/MANUAL_UNITARIAS.md`.

## 7. Reglas para no pisarse (evitar regresiones)

1. **Toca solo tus archivos** (§6). Si necesitas algo fuera de ellos, abre un issue o habla con su
   dueño; no lo cambies "de paso".
2. **Una rama `test/` solo crea o edita pruebas.** Nunca código de producción.
3. **Si una prueba descubre un bug**, no ajustes la prueba para que pase ni corrijas el producto en
   tu rama. Abre un issue `bug` y avisa a Raul; la corrección va en una rama `fix/` aparte, con la
   prueba que lo demuestra (rojo → verde), y la revisa quien encontró el bug.
4. **Archivos compartidos congelados.** Solo Raul los cambia, en un pull request propio y
   agregando (sin romper lo existente):
   - ayudantes de prueba: `backend/tests/apoyo/` y `e2e/apoyo/`;
   - `backend/src/datosDemo.ts` (las pruebas dependen de esos datos);
   - migraciones existentes (un cambio de esquema es una migración nueva);
   - `package.json` y `package-lock.json` (no se instalan dependencias por cuenta propia);
   - configuración: `vitest.config.ts`, `playwright.config.ts`, `tsconfig.json`, `.github/`.
5. **Pruebas independientes.** Integración: base nueva en memoria por prueba. E2E: datos demo
   reiniciados antes de cada prueba. Los datos extra se crean en el Arrange por la API. Ninguna
   prueba depende del orden ni de otra prueba.
6. **Documentos compartidos**: en tablas como la trazabilidad (`docs/GUIA_TESTING.md` §7), cada uno
   edita solo sus filas.
7. **Sin secretos**: `.env.local`, claves y cadenas de conexión no van en código, commits ni
   prompts.
8. **Sin cambios de arquitectura ni de herramientas** (ORM, otra base, Neon Auth, otra librería de
   mapas, Jest...) sin acuerdo del grupo registrado en `docs/DECISIONES.md`.
9. **La interfaz es de Mario** y está congelada. Cualquier cambio en `frontend/src/`, incluso de
   una rama `fix/` o `feat/`, necesita su visto bueno: un cambio en la vista puede romper los E2E.

## 8. Flujo de trabajo con git

1. `git switch main` y `git pull`. Rama nueva: `tipo/descripcion-corta`, con tipo `test`, `fix`,
   `docs`, `feat`, `refactor` o `chore`.
2. Commits pequeños: `tipo: descripción en imperativo` (`test: cubre el vencimiento de reservas`).
3. Antes del pull request: `npm run typecheck` y las pruebas de tu nivel en verde **dos veces
   seguidas**. Trae lo último de `main` con `git pull origin main`.
4. Pull request hacia `main` completando la plantilla. El CI (`.github/workflows/ci.yml`: tipos,
   unitarias, integración y E2E) tiene que pasar. Mientras el CI de GitHub no esté disponible,
   pega en el pull request la salida de los comandos del paso 3, y Raul los vuelve a correr en su
   PC antes de integrar.
5. Lo revisa y aprueba el integrante que indica la revisión cruzada (§6), con la skill
   `revisar-codigo`. Nadie aprueba ni integra su propio pull request.

## 9. Cómo debe trabajar el agente

- Antes de escribir, identifica el ítem de la consigna y el dueño del archivo (§6). Si el archivo no
  es de la persona con quien trabajas, detente y avísale.
- No decidas reglas de negocio: si la consigna o el código no lo aclaran, pregunta.
- No inventes `data-testid`, rutas ni códigos de error: búscalos en `docs/GUIA_TESTING.md` §6 y en
  `docs/API.md`.
- Ejecuta los comandos y muestra la salida real; no afirmes que algo pasa sin haberlo corrido.
- Cambios mínimos: no reformatees ni "mejores" archivos que no son parte de la tarea.
- Escribe código, pruebas, commits y respuestas en español.

## 10. Definition of Done

La lista está en `docs/CONVENCIONES.md` §11 y en la plantilla de pull request
(`.github/pull_request_template.md`).
