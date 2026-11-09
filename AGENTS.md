# AGENTS.md · Gestión de Urbanizaciones y Lotes

Instrucciones para los agentes de código del equipo (Claude Code, Codex u otro) y para las personas
que los usan. **Léelo completo antes de cambiar cualquier archivo.** Si algo de otro documento
contradice este archivo, mandan este archivo y `docs/CONSIGNA.md`, y se avisa al grupo para
corregir el otro documento.

## 1. Contexto

- Proyecto final de **Taller de Actualización V (Testing de Software)**, NUR 2026.
- Equipo: **Raul** (coordina), **Mario**, **Laura** y **Luciana**.
- El producto ya funciona (ver `README.md` §2). **Lo que se evalúa son las pruebas** unitarias, de
  integración y E2E de las reglas comerciales y financieras (`docs/CONSIGNA.md` §12 a §15). En la
  defensa cada integrante explica sus propias pruebas: no se entrega nada que la persona no
  entienda.

### Etapas del proyecto

| Etapa | Qué se hace | Quién toca código |
|---|---|---|
| **0 · Producto y repo** ✔ | Correcciones del producto, CI y documentación (terminada el 2026-11-08) | Raul |
| **1 · Base de pruebas e interfaz** | Raul: ayudantes compartidos (`backend/tests/apoyo/`, `e2e/apoyo/`) y una prueba de ejemplo por nivel. Mario: mejoras de la interfaz aprobadas en un issue (§6). Laura y Luciana: instalan, recorren la app y diseñan la tabla de casos de sus ítems, sin código | Raul (pruebas y configuración) y Mario (solo `frontend/src/`) |
| **2 · Pruebas por nivel** | Cada dueño escribe las pruebas de su nivel (§6). La interfaz queda congelada | Cada uno, solo en sus archivos |
| **3 · Cierre** | Regresión completa dos veces, trazabilidad con la consigna, ensayo de la defensa | Todos |

**Etapa actual: 1.** Si la etapa no te permite tocar código, no lo toques: describe el cambio en
un issue de GitHub y avisa al dueño.

## 2. Qué leer según la tarea

| Tarea | Leer antes de empezar |
|---|---|
| Cualquiera | Este archivo y `docs/CONVENCIONES.md` |
| Entender un requisito | `docs/CONSIGNA.md` (manda) y `README.md` §5 (reglas de negocio) |
| Prueba unitaria | `.claude/skills/test-unitario/SKILL.md` y `docs/GUIA_TESTING.md` §2 |
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
| `npm run test:cobertura` | Cobertura de `dominio/` y `aplicacion/` |

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
e2e/apoyo/                  ayudantes de los E2E: sesión por rol, reinicio de datos
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
   - sin `.only`, `.skip`, `waitForTimeout`, esperas fijas, ni `if`/`for`/`try` dentro de un `it`;
   - mocks solo en unitarias; integración con la base en memoria (nunca Neon); E2E sin simular nada;
   - cada prueba en la carpeta de su nivel (§4), nunca dentro de `src/`.

## 6. Equipo: quién es dueño de qué

Reparto **por nivel de prueba**, sin rotación: cada carpeta, o cada archivo en integración, tiene
un solo dueño. Por qué: `docs/DECISIONES.md` §13.

| Integrante | Nivel | Ítems de la consigna | Rol transversal |
|---|---|---|---|
| **Laura** | Unitarias del backend | §12 completo (los 10 ítems), más reserva y venta duplicadas con mocks y servicios con mocks/stubs | Cobertura: `npm run test:cobertura`, objetivo ≥ 90 % en `dominio/` y `aplicacion/` |
| **Raul** | Integración del backend, parte 1 | §13: crear un proyecto y persistirlo; crear/importar lotes y recuperar su geometría; filtrar lotes por estado o proyecto; registrar un cliente; reservar y verificar el estado; reservar de nuevo y verificar el rechazo (también dos a la vez); una reserva vencida libera el lote | Coordinación; base de pruebas (`apoyo/`); integra los pull requests y, mientras el CI no esté disponible, los verifica en su PC |
| **Luciana** | Integración del backend, parte 2 | §13: venta → lote VENDIDO (más venta duplicada, precio pactado y atomicidad); plan de pagos y cuotas persistidas; pago → cuota, total pagado y saldo (más anulación con trazabilidad); permisos de admin, asesor y cliente; un cliente no accede a operaciones de otro | Trazabilidad con el checklist §15 (`docs/GUIA_TESTING.md` §7) y guion de la defensa |
| **Mario** | E2E y mejoras de la interfaz | §14: E2E 01 a 08 | Dueño de la interfaz y del catálogo de `data-testid` (`docs/GUIA_TESTING.md` §6) |

**Archivos de cada uno:**

| Integrante | Archivos |
|---|---|
| Laura | `backend/tests/unitarias/dominio/<modulo>.test.ts` (`lote`, `reserva`, `planPagos`, `venta`, `dinero`, `fechas`, `geometria`, `permisos`) y `backend/tests/unitarias/servicios/<Servicio>.test.ts` (`ReservaServicio`, `VentaServicio`, `PagoServicio`) |
| Raul | `backend/tests/integracion/proyectos.test.ts`, `lotes.test.ts`, `clientes.test.ts`, `reservas.test.ts`; los ayudantes `backend/tests/apoyo/` y `e2e/apoyo/` |
| Luciana | `backend/tests/integracion/ventas.test.ts`, `planPagos.test.ts`, `pagos.test.ts`, `permisos.test.ts` |
| Mario | `e2e/tests/e2e-0N-nombre.spec.ts` (los 8 flujos) y `frontend/src/` |

**Revisión cruzada.** Para que todos puedan explicar los tres niveles en la defensa, cada pull
request lo revisa alguien de otro nivel: Laura revisa los de Luciana y los de Raul, Luciana los de
Mario y Mario los de Laura. Raul integra todos.

**Mario: primero la interfaz, después los E2E.**

1. Antes de tocar la interfaz, abre un issue con la lista de cambios y capturas; Raul lo aprueba.
2. Solo cambia `frontend/src/`: no toca el backend, no quita pasos de los flujos de la consigna y
   no renombra `data-testid` (los nuevos van al catálogo de `docs/GUIA_TESTING.md` §6).
3. Verifica con `npm run typecheck`, `npm run build` y recorriendo a mano los 8 flujos del
   `README.md` §2.
4. Al empezar los E2E, la interfaz se congela: desde ahí, todo cambio en `frontend/src/` lo
   aprueba Mario.
5. Orden de los E2E, de menor a mayor dificultad: 02, 04, 06, 08 → 03, 05, 07 → 01 (dibujar en
   Google Maps). Si en la revisión de mitad de la etapa 2 no hay 6 de 8 en verde, Raul toma el
   E2E 01.

**Unitarias del frontend (opcional, Laura).** Solo si §12 ya está completo y en verde: funciones
puras de `frontend/src/` (el color de cada estado del lote, la geometría del dibujo, el formato
de montos) en `frontend/tests/unitarias/`. La consigna no las exige; Raul las configura si se
piden.

**Antes de escribir pruebas (etapa 1, sin código):** cada uno instala Node 22, clona el repo,
corre `npm ci` y `npm run dev:pruebas`, recorre la app en <http://localhost:5173> con los usuarios
demo y lee la skill de su nivel. Luego arma la tabla de casos de sus ítems (positivo, negativo,
límite): Laura a partir de `backend/src/dominio/` y `docs/GUIA_TESTING.md` §2; Luciana a partir
de `docs/API.md` y §3 de la guía; Mario recorriendo a mano los 8 flujos del `README.md` §2.

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
   - `backend/src/infraestructura/bd/datosDemo.ts` (las pruebas dependen de esos datos);
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
9. **La interfaz es de Mario.** Solo él cambia `frontend/src/`, con el issue aprobado (§6). Una vez
   empezados los E2E, cualquier otro cambio ahí, incluso de una rama `fix/`, necesita su visto
   bueno: un cambio en la vista puede romper los E2E.

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
