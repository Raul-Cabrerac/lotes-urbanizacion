---
name: revisar-codigo
description: Revisa un archivo, un conjunto de cambios o un pull request contra las convenciones del equipo (español, capas, errores con código, dinero y fechas, data-testid, tamaño, sin any) y contra los criterios de testing de la consigna (AAA, casos positivos y negativos, mocks solo donde corresponde, asserts correctos), y entrega hallazgos clasificados con archivo y línea. Usar cuando se pida revisar código o pruebas, hacer code review, o antes de integrar un pull request.
argument-hint: "[archivo, carpeta o rama a revisar]"
---

# Skill: revisión de código y de pruebas

## 1. Cómo se revisa

1. Leer el pull request (qué cambia, ítem de la consigna, cómo probarlo). Si falta alguno de los
   tres, es el primer hallazgo.
2. Ejecutar `npm run typecheck` y las pruebas del nivel afectado. Lo que esté en rojo es
   bloqueante y se reporta con la salida.
3. Leer los archivos cambiados **completos**, no solo el diff.
4. Recorrer las listas de §2 y §3. Por cada hallazgo anotar archivo, línea, gravedad, qué y cómo.
5. Entregar el reporte con el formato de §4. Sin hallazgos también se dice, con lo que se verificó.

Gravedad:
- **Bloqueante:** rompe una convención obligatoria, una regla de la consigna o deja sin probar algo
  que la consigna exige. No se integra hasta resolverlo.
- **Importante:** funciona, pero costará mantenerlo o esconde un riesgo.
- **Sugerencia:** mejora opcional, a criterio del autor.

## 2. Lista para código de producción

**Idioma y nombres** (`docs/CONVENCIONES.md` §2 y §5)
- [ ] Identificadores, archivos, tablas, rutas y comentarios en español; sin tildes en identificadores.
- [ ] Servicios `XServicio`, repositorios SQL `RepositorioXSql`, implementaciones `NombreTecnología`, códigos de error en `MAYUSCULAS`.
- [ ] Funciones empiezan con verbo; booleanos con `es/esta/tiene/puede`.

**Arquitectura** (§4)
- [ ] `dominio/` no importa infraestructura, Express, zod ni usa `new Date()`.
- [ ] Reglas de negocio solo en el dominio; ni en rutas, ni en repositorios, ni en React.
- [ ] Servicios reciben puertos por constructor; escrituras múltiples dentro de `uow.transaccion`.
- [ ] Cambios de estado de lote con `cambiarEstadoSi(id, esperado, nuevo)` y verificación del resultado.
- [ ] SQL solo en repositorios, parametrizado (`$1, $2`).

**Errores** (§6)
- [ ] Toda excepción es subclase de `ErrorAplicacion` con un `codigo`.
- [ ] Código nuevo registrado en `docs/API.md`.
- [ ] Ningún `try/catch` que trague errores.

**Dinero y fechas** (§6)
- [ ] Ninguna operación aritmética directa con montos; todo por `dinero.ts`.
- [ ] Fechas como `'AAAA-MM-DD'`, solo por `fechas.ts` y el `Reloj`.

**Estilo** (§6)
- [ ] Sin `any`, `@ts-ignore`, `!`, `as` (salvo el mapeo de filas), `console.log` ni código comentado.
- [ ] Archivo ≤ 250 líneas, función ≤ 40.
- [ ] `async/await`, sin `.then()` encadenados.
- [ ] Sin abstracciones usadas una sola vez; sin librerías nuevas no discutidas.

**API y seguridad**
- [ ] Ruta con `autorizar('permiso')`; el cliente solo accede a lo propio.
- [ ] Validación zod del cuerpo o la query; códigos HTTP correctos.

**Frontend** (§7)
- [ ] Todo control y dato verificable con `data-testid` según la convención; anotado en `docs/GUIA_TESTING.md`.
- [ ] Tras una operación se vuelve a pedir los datos; errores visibles.
- [ ] Sin reglas de negocio duplicadas; solo validaciones de formulario.

## 3. Lista para pruebas (criterios del checklist de la consigna)

- [ ] **Prueban reglas reales**, no CRUD ni getters (consigna §12).
- [ ] Comentario inicial con el ítem de la consigna; tabla de `docs/GUIA_TESTING.md` §7 actualizada.
- [ ] Nombre "<resultado> cuando <condición>"; AAA visible; un comportamiento por `it`.
- [ ] **Casos positivos y negativos**; límites donde la regla tiene borde (saldo exacto, vence hoy).
- [ ] **Asserts correctos**: `toBe` para primitivos, `toEqual` para objetos, `toThrow` con función flecha, errores por `codigo`, sin `toBeCloseTo` en dinero.
- [ ] **Mocks solo cuando corresponde**: las unitarias simulan puertos, no reglas; integración y E2E no simulan.
- [ ] Sin `new Date()` sin argumentos, aleatoriedad, `if/for/try` dentro de las pruebas, ni dependencia del orden.
- [ ] Integración: base propia por prueba y verificación de persistencia con un `GET`.
- [ ] E2E: reinicio de datos en `beforeEach`, solo `getByTestId`, esperas automáticas, verificación tras recargar.
- [ ] Las pruebas pasan **dos veces seguidas**.

## 4. Formato del reporte

```
## Revisión de <rama o archivos>

Verificado: typecheck ✔ · test:unit ✔ (42) · test:integracion ✔ (11) · e2e no aplica

### Bloqueantes
1. backend/src/http/rutas.ts:130 · Regla de negocio en la ruta: valida `monto > saldo` aquí en vez de en `validarPago`.
   Cómo: quitar la validación de la ruta; el dominio ya lanza MONTO_EXCEDE_SALDO.

### Importantes
1. backend/src/dominio/planPagos.test.ts:70 · Verifica el texto del mensaje; usar `expect.objectContaining({ codigo })`.

### Sugerencias
1. frontend/src/paginas/ModalPago.tsx:31 · Reutilizar `bs()` de `utilidades/formato.ts`.

### Qué está bien
- Transacción y UPDATE condicional en la venta; casos límite de saldo exacto cubiertos.
```

Cada hallazgo dice **qué** está mal, **por qué** importa (cita la sección de las convenciones o de
la consigna) y **cómo** resolverlo. Sin opiniones de gusto: si no está en las convenciones, es
sugerencia o no es hallazgo.
