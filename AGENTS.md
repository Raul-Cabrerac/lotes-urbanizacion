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
| **0 · Producto y repo** | Correcciones del producto, CI, documentación. Los demás instalan, recorren la app a mano (prueba exploratoria de su módulo, ver §6) y diseñan sus casos de prueba en papel | Solo Raul |
| **1 · Base de pruebas** | Ayudantes compartidos (`backend/tests/apoyo/`, `e2e/apoyo/`) y una prueba de ejemplo por nivel, en verde en el CI | Solo Raul |
| **2 · Pruebas por módulo** | Cada dueño escribe unitarias → integración → E2E de su módulo (§6) | Cada uno, solo en sus archivos |
| **3 · Cierre** | Regresión completa dos veces, trazabilidad con la consigna, ensayo de la defensa | Todos |

**Etapa actual: 0.** Si la etapa no te permite tocar código, no lo toques: describe el cambio en
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
| `npm run test:unit` | Unitarias (`backend/src/**/*.test.ts`) |
| `npm run test:integracion` | Integración (`backend/tests/**/*.test.ts`, PostgreSQL en memoria) |
| `npm run test:e2e` | E2E con Playwright (levanta `dev:pruebas` solo). Antes, detén cualquier `npm run dev` |
| `npm run test:cobertura` | Cobertura de `dominio/` y `aplicacion/` |

Para escribir y correr pruebas **no hace falta Neon**: integración y E2E usan PostgreSQL en
memoria. Neon es para la demostración y para quien necesite datos que persistan.

## 4. Mapa del código

```
backend/src/dominio/        reglas puras (lote, reserva, planPagos, venta, dinero, fechas, geometria, permisos, errores)
backend/src/aplicacion/     puertos (puertos.ts, repositorios.ts) y servicios que orquestan reglas + repositorios
backend/src/infraestructura/ PostgreSQL (Neon o en memoria), migraciones, repositorios SQL, datos demo, JWT, KML, reloj
backend/src/http/           rutas, validación zod, autenticación, traducción de errores a HTTP
frontend/src/               React + Google Maps; cada control tiene data-testid
e2e/                        Playwright
docs/                       consigna, convenciones, decisiones, API, guía de testing
```

Detalle en `README.md` §4 y la regla de dependencia en `docs/CONVENCIONES.md` §4.

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
   - mocks solo en unitarias; integración con la base en memoria (nunca Neon); E2E sin simular nada.

## 6. Equipo: quién es dueño de qué

Reparto **por módulo de negocio**: cada integrante escribe los tres niveles de prueba de su módulo
y puede explicarlos en la defensa.

| Integrante | Módulo | Unitarias (§12) | Integración (§13) | E2E (§14) | Rol transversal |
|---|---|---|---|---|---|
| **Raul** | Proyectos, lotes, mapa y KML | Cambios de estado del lote; geometría | Crear proyecto; crear/importar lotes y geometría; filtrar lotes | 01 | Coordinación, CI, base de pruebas, merges |
| **Mario** | Reservas | No reservar si no está DISPONIBLE; vencimiento; cancelar y liberar; reserva duplicada (mock) | Registrar cliente; reservar + estado; reserva duplicada (incluye concurrencia) | 02, 03, 06 | Estabilidad de los E2E |
| **Laura** | Ventas y plan de pagos | No vender un VENDIDO; generar cuotas; precio pactado; venta duplicada (mock) | Venta → VENDIDO (precio pactado y atomicidad); plan de pagos y cuotas | 04, 05 | Unitarias, mocks y cobertura |
| **Luciana** | Pagos, saldo, seguridad y portal | Total pagado y saldo; montos inválidos; saldo nunca negativo; permisos | Pago → cuota, total y saldo; permisos por rol; un cliente no ve operaciones de otro | 07, 08 | Trazabilidad con el checklist §15 y guion de la defensa |

**Archivos de cada uno.** Cada archivo de prueba tiene un solo dueño. Cuando varios prueban el
mismo módulo, el archivo se nombra `modulo.tema.test.ts`:

| Integrante | Archivos (unitarias junto al módulo, en `backend/src/`; integración en `backend/tests/integracion/`; E2E en `e2e/tests/`) |
|---|---|
| Raul | `dominio/lote.transiciones.test.ts`, `dominio/geometria.test.ts` · `proyectos.test.ts`, `lotes.test.ts` · `e2e-01-*.spec.ts` |
| Mario | `dominio/lote.reservable.test.ts`, `dominio/reserva.test.ts`, `aplicacion/servicios/ReservaServicio.test.ts` · `clientes.test.ts`, `reservas.test.ts` · `e2e-02-*`, `e2e-03-*`, `e2e-06-*` |
| Laura | `dominio/lote.vendible.test.ts`, `dominio/planPagos.generacion.test.ts`, `dominio/fechas.test.ts`, `aplicacion/servicios/VentaServicio.test.ts` · `ventas.test.ts` · `e2e-04-*`, `e2e-05-*` |
| Luciana | `dominio/planPagos.resumen.test.ts`, `dominio/planPagos.pagos.test.ts`, `dominio/dinero.test.ts`, `dominio/permisos.test.ts`, `aplicacion/servicios/PagoServicio.test.ts` · `pagos.test.ts`, `permisos.test.ts` · `e2e-07-*`, `e2e-08-*` |

**En la etapa 0** (sin código): cada uno recorre su módulo en la app (`npm run dev:pruebas`)
contra la consigna y el checklist §15, reporta lo que no cumpla como issue (pasos, resultado
esperado, resultado obtenido) y diseña la tabla de casos de sus pruebas (positivo, negativo,
límite).

## 7. Reglas para no pisarse (evitar regresiones)

1. **Toca solo tus archivos** (§6). Si necesitas algo fuera de ellos, abre un issue o habla con su
   dueño; no lo cambies "de paso".
2. **Una rama `test/` solo crea o edita pruebas.** Nunca código de producción.
3. **Si una prueba descubre un bug**, no ajustes la prueba para que pase ni corrijas el producto en
   tu rama. Abre un issue `bug`; la corrección va en una rama `fix/` aparte, con la prueba que lo
   demuestra (rojo → verde), y la revisa el dueño del módulo afectado.
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

## 8. Flujo de trabajo con git

1. `git switch main` y `git pull`. Rama nueva: `tipo/descripcion-corta`, con tipo `test`, `fix`,
   `docs`, `feat`, `refactor` o `chore`.
2. Commits pequeños: `tipo: descripción en imperativo` (`test: cubre el vencimiento de reservas`).
3. Antes del pull request: `npm run typecheck` y las pruebas de tu nivel en verde **dos veces
   seguidas**. Trae lo último de `main` con `git pull origin main`.
4. Pull request hacia `main` completando la plantilla. El CI (`.github/workflows/ci.yml`: tipos,
   unitarias, integración y E2E) tiene que pasar.
5. Lo revisa y aprueba **otro** integrante (skill `revisar-codigo`). Nadie aprueba ni integra su
   propio pull request.

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
