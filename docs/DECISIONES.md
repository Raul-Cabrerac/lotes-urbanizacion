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
CANCELADA. Además, toda operación que cambia una reserva y su lote lo hace en el mismo orden
(primero la reserva, después el lote), para que dos transacciones no se esperen mutuamente
(deadlock).

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
