# Convenciones de código, testing y trabajo en equipo

**Proyecto:** Sistema de Gestión de Urbanizaciones y Lotes
**Materia:** Taller de Actualización V · Testing de Software · NUR · 2026
**Equipo:** 4 integrantes · **Aplica a:** personas y agentes de IA por igual

## 1. Para qué tenemos convenciones

- Para que cualquier integrante pueda leer, modificar y probar cualquier parte del sistema.
- Para que cada regla de negocio exista **una sola vez**, en un lugar previsible y fácil de probar.
- Para que las pruebas sean uniformes: mismo estilo, mismos nombres, mismos comandos.
- Para que la revisión de código sea objetiva: se revisa contra esta lista, no contra gustos.

Las convenciones viven aquí y en las skills de `.claude/skills/` (`test-unitario`,
`test-integracion`, `test-e2e`, `nueva-funcionalidad`, `revisar-codigo`), que son los
procedimientos paso a paso para personas y agentes.

## 2. Idioma

- **Todo en español**: identificadores, archivos, tablas y columnas, rutas de la API, comentarios,
  mensajes de error, textos de interfaz, commits, documentación y nombres de pruebas.
- **Identificadores sin tildes ni eñes**: `codigo`, `anio`, `numeroCuotas`. Los comentarios y los
  textos de interfaz sí llevan tildes.
- Excepciones: vocabulario técnico universal (`router`, `token`, `mock`, `commit`), las APIs de
  las librerías (`describe`, `expect`, `useState`, `getByTestId`), los comentarios
  `// Arrange`, `// Act`, `// Assert`, y los campos `email` y `password` del login.
- Estados, roles y modalidades en mayúsculas e iguales en código, base de datos, API e interfaz:
  `'DISPONIBLE'`, `'RESERVADO'`, `'ASESOR'`, `'FINANCIADO'`.

## 3. Herramienta de calidad

- **TypeScript estricto** (`strict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`).
  `npm run typecheck` revisa backend, frontend y e2e.
- Regla: **nada se integra a `main` con `typecheck` o pruebas en rojo.** Se corren localmente antes
  de abrir un pull request.

## 4. Arquitectura y regla de dependencia

```
dominio  ◄──  aplicacion  ◄──  infraestructura / http  ◄──  frontend (por HTTP)
```

| Capa | Qué contiene | Qué tiene prohibido |
|---|---|---|
| `backend/src/dominio/` | Reglas puras (`validarLoteReservable`, `generarPlanDePagos`, `resumirPlan`), dinero, fechas, geometría, permisos, errores con código, tipos | Importar Express, `pg`, zod, JWT o `new Date()` |
| `backend/src/aplicacion/` | Puertos (`puertos.ts`, `repositorios.ts`) y servicios que orquestan reglas y repositorios dentro de una transacción | Conocer SQL, HTTP o detalles de librerías |
| `backend/src/infraestructura/` | Implementaciones: conexión a PostgreSQL, migraciones, repositorios SQL, datos demo, bcrypt, JWT, lector KML, relojes | Contener reglas de negocio |
| `backend/src/http/` | Rutas, esquemas zod, autenticación, traducción de errores a HTTP | Tocar la base de datos o decidir reglas |
| `frontend/src/` | Páginas, componentes, mapa, cliente de la API | Duplicar reglas de negocio (solo validaciones de formulario) |

Principios: una responsabilidad por archivo; las dependencias entran por el constructor y se
conectan en `contenedor.ts`; todo lo externo tiene una interfaz en `aplicacion/` para poder
sustituirlo en pruebas.

## 5. Nomenclatura

| Elemento | Convención | Ejemplo |
|---|---|---|
| Clase o servicio | `PascalCase.ts` | `ReservaServicio.ts`, `RepositorioLotesSql.ts` |
| Módulo de funciones | `camelCase.ts` | `planPagos.ts`, `dinero.ts` |
| Componente o página React | `PascalCase.tsx` | `MapaLotes.tsx`, `PanelLote.tsx` |
| Clase, tipo, interfaz | `PascalCase`, sin prefijo `I` | `Reserva`, `UnidadDeTrabajo` |
| Función, variable | `camelCase`; las funciones empiezan con verbo | `calcularAreaM2`, `validarPago` |
| Booleano | `es`, `esta`, `tiene`, `puede` | `estaVencida`, `tienePermiso` |
| Constante | `MAYUSCULAS_CON_GUION_BAJO` | `TRANSICIONES_LOTE`, `MAX_CUOTAS` |
| Implementación de un puerto | `Nombre + Tecnología` | `HasherBcrypt`, `RelojSistema`, `LectorKmlXml` |
| Código de error | `MAYUSCULAS_CON_GUION_BAJO` | `LOTE_NO_DISPONIBLE`, `MONTO_EXCEDE_SALDO` |
| Tabla y columna SQL | `snake_case`; tablas en plural | `lotes`, `precio_pactado` |
| Ruta de la API | `/api/recurso-en-plural/:id/accion` | `/api/reservas/:id/cancelar` |
| Campo JSON | `camelCase` | `precioPactado`, `saldoPendiente` |
| `data-testid` | `kebab-case` (ver §7) | `accion-reservar`, `item-lote-A-01` |
| Prueba unitaria o de integración | `modulo.test.ts`; `modulo.tema.test.ts` si varios integrantes prueban el mismo módulo | `reservas.test.ts`, `planPagos.generacion.test.ts` |
| Prueba E2E | `e2e-0N-nombre.spec.ts` | `e2e-03-reserva-duplicada.spec.ts` |
| Rama git y commit | `tipo/descripcion-corta` · `tipo: descripción en imperativo` | `test/unitarios-lote` · `test: cubre vencimiento de reservas` |

## 6. Estilo de código

- **Tamaño:** archivos de hasta 250 líneas, funciones de hasta 40. Si se excede, se divide.
- **Exports con nombre**, sin `export default`.
- **Retornos tempranos** en vez de `else` encadenados.
- **Tipos explícitos en firmas públicas.** Sin `any` (se usa `unknown` y se comprueba), sin
  `@ts-ignore`, sin `!`. `as` solo en el mapeo fila → entidad de los repositorios.
- **Comentarios** que explican el *por qué*, citando la consigna cuando aplica
  (`Consigna §9: el saldo nunca es negativo`). Sin código comentado.
- **Asincronía:** `async/await`; nunca `.then()` encadenados ni `catch` vacíos.
- **Validación:** zod valida la forma (400); el dominio valida las reglas (409/422).
- **Logs:** solo al arrancar el servidor y en el manejador de errores 500.
- **Sencillez primero:** sin patrones que el equipo no pueda explicar en la defensa.

### Errores

- Jerarquía única en `dominio/errores.ts`: `ErrorValidacion` (400), `ErrorNoAutenticado` (401),
  `ErrorSinPermiso` (403), `ErrorNoEncontrado` (404), `ErrorConflicto` (409) y
  `ErrorReglaNegocio` (422). Todos llevan `codigo`, `mensaje` y `detalles` opcionales.
- El dominio y los servicios **lanzan**; solo `http/middlewares/manejadorErrores.ts` traduce a HTTP.
- El catálogo completo está en `docs/API.md`.

### Dinero, fechas y geometría

- **Dinero:** bolivianos con 2 decimales. Sumas, restas y divisiones con `dominio/dinero.ts`
  (`sumar`, `restar`, `dividirEnPartes`, `esMontoValido`), nunca `a + b` con montos. En
  PostgreSQL, `NUMERIC(14,2)`.
- **Fechas de negocio:** texto `'AAAA-MM-DD'` (`FechaISO`), manipuladas solo en
  `dominio/fechas.ts`. La fecha actual sale del puerto `Reloj`.
- **Geometría:** GeoJSON `Polygon` en `[lng, lat]`, guardado como `JSONB`, validado en
  `dominio/geometria.ts`.

## 7. Frontend y `data-testid`

- **Todo control interactivo y todo dato que una prueba pueda verificar lleva `data-testid`.**
- Prefijos: `login-*`, `menu-*`, `aviso-exito`/`aviso-error`, `accion-*` (operaciones sobre el
  lote), `item-<entidad>-<clave>` y `fila-<entidad>-<clave>` (listas), `<entidad>-<campo>`
  (formularios y datos), `<entidad>-confirmar`/`-guardar`/`-cancelar` (modales),
  `filtro-*`, `contador-<ESTADO>`, `poligono-<código>`, `cuota-<n>`, `pagar-cuota-<n>`.
- **Clave estable:** código del lote, documento del cliente, correo del usuario, número de cuota.
- Los estados se exponen también como atributo `data-estado="RESERVADO"`.
- Tras una operación, la vista **vuelve a pedir los datos al servidor**.
- El catálogo completo está en `docs/GUIA_TESTING.md`. Un control nuevo sin `data-testid` es un
  hallazgo bloqueante en revisión.

## 8. Convenciones de testing

### La pirámide en este proyecto

| Nivel | Qué prueba | Dónde | Qué NO hace |
|---|---|---|---|
| Unitario | Reglas de `dominio/`; servicios con puertos simulados | `backend/src/**/modulo.test.ts` | Tocar base de datos, HTTP o la fecha real |
| Integración | Servicios y API con repositorios reales sobre PostgreSQL en memoria | `backend/tests/integracion/` | Usar mocks o la base de Neon |
| E2E | Los 8 flujos de la consigna en el navegador | `e2e/tests/` | Simular nada |

### Nombres y estructura

- Primera línea: comentario con el ítem de la consigna
  (`// Consigna §12: Impedir reservar un lote que no esté DISPONIBLE`).
- `describe('<módulo>')` → `describe('<función>')` → `it('<resultado> cuando <condición>')`.
- Cada prueba sigue **AAA** con los tres comentarios visibles:

```ts
it('lanza LOTE_NO_DISPONIBLE cuando el lote está RESERVADO', () => {
  // Arrange
  const lote = { codigo: 'A-01', estado: 'RESERVADO' as const, precio: 45000 };
  // Act
  const reservar = () => validarLoteReservable(lote, 'PUBLICADO');
  // Assert
  expect(reservar).toThrow(expect.objectContaining({ codigo: 'LOTE_NO_DISPONIBLE' }));
});
```

### Por cada regla, tres tipos de caso

| Tipo | Ejemplo |
|---|---|
| Positivo | Pagar 5 000 de una cuota de 5 000 → cuota PAGADA y el saldo baja 5 000 |
| Negativo | Pagar −10 → `MONTO_INVALIDO`; reservar un lote VENDIDO → `LOTE_NO_DISPONIBLE` |
| Límite | Pagar exactamente el saldo → saldo 0; saldo + 0,01 → `MONTO_EXCEDE_SALDO`; reserva que vence **hoy** → todavía válida |

### Reglas de oro

1. Un comportamiento por prueba.
2. Independiente: cada prueba crea sus datos y no depende del orden.
3. Determinista: fechas con `RelojFijo`, sin `sleep` ni aleatoriedad.
4. Verifica resultados, no implementación: estado final, valor devuelto, error con `codigo`.
5. Errores por `codigo`, nunca por el texto del mensaje.
6. Sin `if`, `for` ni `try` dentro de un `it` (para tablas de casos, `it.each`).
7. Mocks solo en unitarias. Integración usa la base real en memoria; E2E no simula nada.
8. Integración verifica persistencia: después de un `POST`, un `GET` confirma el cambio.
9. E2E verifica lo observable y lo persistido: el `data-estado` nuevo, el aviso y que sigue igual
   tras recargar.
10. Repetible: las pruebas pasan dos veces seguidas. Los E2E reinician los datos con
    `POST /api/pruebas/reiniciar` en `beforeEach`.

Qué no se prueba: getters triviales, CRUD sin reglas, código de librerías, estilos.
Cobertura objetivo: ≥ 90 % de líneas en `dominio/` y `aplicacion/` (`npm run test:cobertura`).

## 9. Git y revisión

- `main` protegida: todo entra por pull request, con el CI en verde
  (`.github/workflows/ci.yml`) y revisado por otro integrante con la skill `revisar-codigo`.
  Nadie aprueba ni integra su propio pull request.
- Ramas `feat/`, `fix/`, `test/`, `docs/`, `refactor/`, `chore/` (CI, configuración,
  dependencias). Commits pequeños en imperativo.
- Antes del pull request: `npm run typecheck` y las pruebas del nivel afectado en verde.

## 10. Trabajo con agentes de IA

- **La persona es responsable de lo que entrega.** Nada generado se integra sin haberlo leído,
  entendido y ejecutado. En la defensa cada uno explica su código y sus pruebas.
- Pedidos concretos, con el archivo y la regla. El agente no decide reglas de negocio: ante una
  duda sobre la consigna, se consulta al equipo.
- Nunca se pegan secretos (`.env.local`, claves) en un prompt.

## 11. Definition of Done

- [ ] Cumple la consigna (ítem identificado) y estas convenciones.
- [ ] `npm run typecheck` y las pruebas del nivel afectado en verde, dos veces seguidas.
- [ ] Errores nuevos en el catálogo de `docs/API.md`; controles nuevos con `data-testid` en
      `docs/GUIA_TESTING.md`.
- [ ] Pull request revisado y aprobado por otro integrante.

## 12. Organización del equipo

Cada integrante **escribe los tres tipos de prueba** de un módulo de negocio fijo (sin rotación),
así nadie edita los archivos de otro y cada uno puede explicar sus pruebas en la defensa. El
reparto con nombres, los archivos de cada uno, las etapas del proyecto y las reglas para no
pisarse están en `AGENTS.md` §1, §6 y §7.
