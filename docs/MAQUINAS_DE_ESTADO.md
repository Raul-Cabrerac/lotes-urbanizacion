# Máquinas de estado de la aplicación

Documento maestro de análisis, invariantes, tablas de transiciones, hallazgos resueltos e incidencias de las máquinas de estado **explícitas** e **implícitas** del *Sistema de Gestión de Urbanizaciones y Lotes*.

> **Estado del documento:** Auditoría completada, incidencias agrupadas en GitHub (`#3` a `#7`), correcciones implementadas en ramas `fix/` e integradas en `fix/maquinas-de-estado` (con `main` sin modificar), junto con pruebas unitarias, de integración y E2E de regresión.

---

## 1. Inventario de máquinas de estado

| # | Máquina | Tipo | Fuente de verdad | Capa(s) |
|---|---|---|---|---|
| 1 | **Proyecto** (`EstadoProyecto`) | Explícita | `proyectos.estado` (`BORRADOR`, `PUBLICADO`) | Dominio (`proyecto.ts`), `ProyectoServicio`, SQL, UI |
| 2 | **Lote** (`EstadoLote` + ciclo de vida) | Explícita + implícita (`NO_EXISTE`/`ELIMINADO`) | `lotes.estado` (`DISPONIBLE`, `RESERVADO`, `VENDIDO`, `BLOQUEADO`) | Dominio (`lote.ts`), `LoteServicio`, `ReservaServicio`, `VentaServicio`, SQL, UI |
| 3 | **Reserva** (`EstadoReserva` + vencimiento temporal) | Explícita + implícita temporal (`estaVencida`) | `reservas.estado` (`ACTIVA`, `CANCELADA`, `VENCIDA`, `CONVERTIDA`) + `fecha_vencimiento` | Dominio (`reserva.ts`), `ReservaServicio`, `expirarReserva.ts`, `VentaServicio`, `app.ts`, SQL |
| 4 | **Venta** (`EstadoVenta`) | Explícita | `ventas.estado` (`VIGENTE`, `ANULADA`) | Dominio (`venta.ts`), `VentaServicio`, `PagoServicio`, SQL |
| 5 | **Estado financiero de la venta** (`saldada` / saldo) | Implícita (derivada) | `resumirPlan(precioPactado, cuotas, pagos, hoy)` | Dominio (`planPagos.ts`), `VentaServicio`, `PagoServicio` |
| 6 | **Cuota** (`EstadoCuota`) | Explícita en tipo, implícita en almacenamiento (derivada) | `calcularEstadoCuota(monto, montoPagado, fechaVencimiento, hoy)` | Dominio (`planPagos.ts`), `VentaServicio`, `PagoServicio`, UI |
| 7 | **Pago** (`EstadoPago`) | Explícita | `pagos.estado` (`VALIDO`, `ANULADO`) | Dominio (`planPagos.ts`), `PagoServicio`, `VentaServicio`, SQL |
| 8 | **Usuario / Cuenta** (`activo`) | Explícita booleana | `usuarios.activo` (`true` = ACTIVO, `false` = INACTIVO) | Dominio (`usuario.ts`), `UsuarioServicio`, `AuthServicio`, SQL |
| 9 | **Sesión de autenticación** (JWT + `ProveedorSesion`) | Implícita | Token JWT + verificación contra `usuarios.activo` + `sessionStorage` | `AuthServicio`, `middlewares/seguridad.ts`, `Sesion.tsx`, `http.ts` |
| 10 | **Modos de mapa y flujo de modales/formularios** | Implícita (UI) | Estados React (`modo`, `dialogoLote`, `dialogo`, `poligonoNuevo`, `enviando`, `plan`) | `ProyectoMapa.tsx`, `HerramientaDibujo.tsx`, `PanelLote.tsx`, `BarraMapa.tsx`, `ModalVenta.tsx`, `ModalPago.tsx`, `VentaDetalle.tsx`, `Reservas.tsx`, `ModalConfirmar.tsx`, `useDatos.ts` |

### Orden acíclico de bloqueos y unicidad concurrente (transversal)

- **Orden global de bloqueo entre transacciones (`docs/DECISIONES.md` §3):** `proyectos -> lotes -> reservas -> ventas`. Ninguna transacción bloquea una tabla superior después de bloquear una inferior; los bloqueos múltiples dentro de la misma tabla siguen orden determinista (`ORDER BY id`).
- **Mapeo contractual de colisiones `23505`:** `ejecutarConUnicidad` (`backend/src/infraestructura/bd/repositorios/consultas.ts`) envuelve las escrituras con índices únicos en `RepositorioClientesSql`, `RepositorioUsuariosSql`, `RepositorioLotesSql`, `RepositorioReservasSql` y `RepositorioVentasSql` para devolver el código `409` específico de dominio bajo concurrencia.

---

## 2. Detalle de máquinas de estado: estados, invariantes y transiciones

### 2.1 Proyecto (`EstadoProyecto`)

- **Estados:**
  - `BORRADOR` *(inicial)*: recién creado; solo visible para `ADMIN`. Sus lotes no pueden comercializarse.
  - `PUBLICADO` *(terminal)*: visible para `ADMIN` y `ASESOR`; habilita reservas y ventas de lotes con precio.
- **Invariantes:**
  - **INV-PRY-1 (Unicidad de publicación):** Un proyecto pasa de `BORRADOR` a `PUBLICADO` una sola vez mediante `publicarSiBorrador` (`WHERE id = $1 AND estado = 'BORRADOR'`) dentro de `uow.transaccion` con `bloquearPorId`.
  - **INV-PRY-2 (Invariante continuo de lotes):** Un proyecto `PUBLICADO` tiene `>= 1` lote en todo momento: no puede publicarse con `0` lotes (`422 PROYECTO_SIN_LOTES`) ni eliminarse su último lote mientras esté `PUBLICADO` (`409 PROYECTO_PUBLICADO_SIN_LOTES`).
  - **INV-PRY-3 (Visibilidad por rol):** `ASESOR` solo ve proyectos en `PUBLICADO` (`ProyectoServicio.listar` y `buscarVisible`).
- **Tabla de transiciones:**

| Origen | Evento / Operación | Guardia / Precondición | Destino | Mecanismo / Error si falla |
|---|---|---|---|---|
| `—` | `POST /api/proyectos` (`ProyectoServicio.crear`) | Datos válidos (zod) y rol `ADMIN` | `BORRADOR` | `INSERT` con `DEFAULT 'BORRADOR'` |
| `BORRADOR` | `POST /api/proyectos/:id/publicar` (`ProyectoServicio.publicar`) | Rol `ADMIN`; `uow.transaccion` + `bloquearPorId`; `cantidadLotes > 0` | `PUBLICADO` | `publicarSiBorrador` (`WHERE estado = 'BORRADOR'`); `422 PROYECTO_SIN_LOTES`, `409 PROYECTO_YA_PUBLICADO`, `404 NO_ENCONTRADO` |
| `PUBLICADO` | `POST /api/proyectos/:id/publicar` | — | *(rechazada)* | `409 PROYECTO_YA_PUBLICADO` (también bajo solicitudes simultáneas) |
| `BORRADOR` / `PUBLICADO` | `PUT /api/proyectos/:id`, `PUT /api/proyectos/:id/limite` | Rol `ADMIN`; geometría válida si aplica | Mismo estado | `422 GEOMETRIA_INVALIDA` |

---

### 2.2 Lote (`EstadoLote` + ciclo de vida)

- **Estados:**
  - `NO_EXISTE` *(implícito inicial / eliminado)*
  - `DISPONIBLE` *(inicial tras creación)*
  - `RESERVADO` *(comercialización apartada temporal o indefinidamente)*
  - `VENDIDO` *(comercializado con venta vigente)*
  - `BLOQUEADO` *(inhabilitado manualmente para comercialización)*
- **Invariantes:**
  - **INV-LOT-1 (Pertenencia y código único):** Todo lote pertenece a un proyecto (`NOT NULL REFERENCES proyectos`) con `(proyecto_id, codigo)` único (`409 CODIGO_LOTE_DUPLICADO` incluso en colisión concurrente vía `ejecutarConUnicidad`).
  - **INV-LOT-2 (Sincronía Lote–Reserva):** `lote.estado === 'RESERVADO'` ⇔ existe exactamente una fila en `reservas` con `lote_id = lote.id` y `estado = 'ACTIVA'` (`reservas_una_activa_por_lote`).
  - **INV-LOT-3 (Sincronía Lote–Venta):** `lote.estado === 'VENDIDO'` ⇔ existe exactamente una fila en `ventas` con `lote_id = lote.id` y `estado = 'VIGENTE'` (`ventas_una_vigente_por_lote`).
  - **INV-LOT-4 (Precio comercializable):** Un lote `RESERVADO` mantiene `precio > 0` mientras siga en proceso de venta: `validarLoteReservable`, `validarLoteVendible` y `validarPrecioLoteReservado` (en `LoteServicio.actualizar`) rechazan `precio <= 0` con `422 LOTE_SIN_PRECIO`.
  - **INV-LOT-5 (Integridad histórica y de proyecto al eliminar):** Un lote solo pasa a `NO_EXISTE` *(eliminado)* si está en `DISPONIBLE` o `BLOQUEADO`, nunca tuvo filas en `reservas` ni `ventas` (`validarLoteEliminable` -> `409 LOTE_CON_OPERACIONES`), y no es el último lote de un proyecto `PUBLICADO` (`409 PROYECTO_PUBLICADO_SIN_LOTES`), serializado en `uow.transaccion` con bloqueo `proyectos -> lotes`.
  - **INV-LOT-6 (Bloqueo estricto por máquina):** `TRANSICIONES_LOTE` define exactamente qué transiciones son legales; `BLOQUEADO` no pasa directo a `RESERVADO` ni `VENDIDO`, ni `VENDIDO` a `RESERVADO` o `BLOQUEADO`.
- **Tabla de transiciones:**

| Origen | Evento / Operación | Guardia / Precondición | Destino | Mecanismo / Error si falla |
|---|---|---|---|---|
| `NO_EXISTE` | `POST /api/proyectos/:id/lotes` / `importar-kml` | Rol `ADMIN`; `codigo` único en proyecto; `datosComerciales` y `geometria` válidos | `DISPONIBLE` | `409 CODIGO_LOTE_DUPLICADO` (vía `ejecutarConUnicidad`), `422` validación dominio |
| `DISPONIBLE` / `RESERVADO` / `VENDIDO` / `BLOQUEADO` | `PUT /api/lotes/:id` (`LoteServicio.actualizar`) | Rol `ADMIN`; `uow.transaccion` + `bloquearPorId`; `validarPrecioLoteReservado` | Mismo estado | `422 LOTE_SIN_PRECIO` (si `RESERVADO` y `precio <= 0`), `409 CODIGO_LOTE_DUPLICADO`, `404 NO_ENCONTRADO` si se eliminó en paralelo |
| `DISPONIBLE` | `POST /api/reservas` (`ReservaServicio.crear`) | Proyecto `PUBLICADO`; `precio > 0`; `fechaVencimiento >= hoy` *(o reserva previa vencida auto-expirada)* | `RESERVADO` | `expirarReservaSiVencida` + `bloquearPorId(loteId)` + `cambiarEstadoSi(id, 'DISPONIBLE', 'RESERVADO')`; `409 LOTE_NO_DISPONIBLE`, `404 NO_ENCONTRADO`, `422 PROYECTO_NO_PUBLICADO` / `LOTE_SIN_PRECIO` |
| `DISPONIBLE` | `POST /api/ventas` (`VentaServicio.registrar`) | Proyecto `PUBLICADO`; `precio > 0`; plan de pagos válido | `VENDIDO` | Transacción + `cambiarEstadoSi(id, 'DISPONIBLE', 'VENDIDO')`; `409 LOTE_NO_DISPONIBLE`, `404 NO_ENCONTRADO`, `422 LOTE_SIN_PRECIO` |
| `DISPONIBLE` | `PATCH /api/lotes/:id/estado` (`{ estado: 'BLOQUEADO' }`) | Rol `ADMIN`; `uow.transaccion` + `bloquearPorId`; estado actual `DISPONIBLE` | `BLOQUEADO` | `validarCambioEstadoManual` + `cambiarEstadoSi(id, 'DISPONIBLE', 'BLOQUEADO')`; `409 LOTE_MODIFICADO`, `404 NO_ENCONTRADO` |
| `DISPONIBLE` / `BLOQUEADO` | `DELETE /api/lotes/:id` (`LoteServicio.eliminar`) | Rol `ADMIN`; `uow.transaccion` (`proyectos -> lotes`); `!tieneOperaciones`; proyecto `BORRADOR` o `cantidadLotes > 1` | `NO_EXISTE` *(eliminado)* | `409 LOTE_CON_OPERACIONES`, `409 PROYECTO_PUBLICADO_SIN_LOTES`, `404 NO_ENCONTRADO` |
| `RESERVADO` | `POST /api/reservas/:id/cancelar` (`ReservaServicio.cancelar`) | Reserva `ACTIVA` y `!estaVencida(reserva, hoy)` | `DISPONIBLE` | Transacción: reserva -> `CANCELADA`, `cambiarEstadoSi(loteId, 'RESERVADO', 'DISPONIBLE')` verificado; si vencida, expira a `VENCIDA`, libera lote y responde `409 RESERVA_NO_ACTIVA` |
| `RESERVADO` | `ReservaServicio.procesarVencidas` | Reserva `ACTIVA` y `fechaVencimiento < hoy` | `DISPONIBLE` | `ORDER BY id`; una transacción independiente por candidata: reserva -> `VENCIDA`, `cambiarEstadoSi` verificado |
| `RESERVADO` | `POST /api/ventas` (`VentaServicio.registrar`) | Proyecto `PUBLICADO`; `precio > 0`; si reserva vigente: `reservaActiva.clienteId === clienteId`; si vencida: `expirarReservaSiVencida` libera lote a `DISPONIBLE` | `VENDIDO` | Si vigente: reserva -> `CONVERTIDA`, lote -> `VENDIDO` (`409 LOTE_RESERVADO_POR_OTRO_CLIENTE` si otro cliente). Si vencida: vende como `DISPONIBLE` con `reservaId: null` |
| `RESERVADO` | `POST /api/reservas` o `PATCH .../estado` | — | *(rechazada)* | `409 LOTE_NO_DISPONIBLE` / `422 CAMBIO_ESTADO_NO_PERMITIDO` |
| `VENDIDO` | `POST /api/ventas/:id/anular` (`VentaServicio.anular`) | Rol `ADMIN`; venta `VIGENTE`; `motivo.trim().length >= 5` | `DISPONIBLE` | Transacción: venta -> `ANULADA`, `cambiarEstadoSi(loteId, 'VENDIDO', 'DISPONIBLE')` verificado |
| `VENDIDO` | `POST /api/reservas` / `POST /api/ventas` / `PATCH .../estado` / `DELETE` | — | *(rechazada)* | `409 LOTE_NO_DISPONIBLE` / `409 LOTE_YA_VENDIDO` / `422 CAMBIO_ESTADO_NO_PERMITIDO` / `409 LOTE_CON_OPERACIONES` |
| `BLOQUEADO` | `PATCH /api/lotes/:id/estado` (`{ estado: 'DISPONIBLE' }`) | Rol `ADMIN`; `uow.transaccion` + `bloquearPorId`; estado actual `BLOQUEADO` | `DISPONIBLE` | `validarCambioEstadoManual` + `cambiarEstadoSi(id, 'BLOQUEADO', 'DISPONIBLE')`; `409 LOTE_MODIFICADO`, `404 NO_ENCONTRADO` |
| `BLOQUEADO` | `POST /api/reservas` / `POST /api/ventas` | — | *(rechazada)* | `409 LOTE_NO_DISPONIBLE` / `409 LOTE_BLOQUEADO` |

---

### 2.3 Reserva (`EstadoReserva` + estado implícito de vencimiento temporal)

- **Estados explícitos:** `ACTIVA` *(inicial)*, `CANCELADA` *(terminal)*, `VENCIDA` *(terminal)*, `CONVERTIDA` *(terminal)*.
- **Sub-estado implícito temporal de `ACTIVA`:**
  - `ACTIVA_VIGENTE`: `estado === 'ACTIVA' && (fechaVencimiento === null || fechaVencimiento >= hoy)`.
  - `ACTIVA_EXPIRADA_PENDIENTE`: `estado === 'ACTIVA' && fechaVencimiento !== null && fechaVencimiento < hoy` (transiciona únicamente a `VENCIDA`).
- **Invariantes:**
  - **INV-RES-1 (Máximo una activa por lote):** Índice único parcial `reservas_una_activa_por_lote ON reservas (lote_id) WHERE estado = 'ACTIVA'`.
  - **INV-RES-2 (Estados finales inmutables):** `CANCELADA`, `VENCIDA` y `CONVERTIDA` son terminales (`WHERE id = $4 AND estado = 'ACTIVA'`).
  - **INV-RES-3 (Vigencia en límite de día):** Una reserva con `fechaVencimiento === hoy` sigue siendo válida todo el día (`fechaVencimiento < hoy` es falso).
  - **INV-RES-4 (Expiración automática antes de cancelar, reservar o vender):** Una reserva en `ACTIVA_EXPIRADA_PENDIENTE` solo pasa a `VENCIDA` (nunca a `CANCELADA` ni `CONVERTIDA`) mediante `expirarReservaSiVencida` al ejecutar `ReservaServicio.cancelar`, `ReservaServicio.crear` o `VentaServicio.registrar`, además de `procesarVencidas`. En `cancelar`, la expiración se persiste antes de responder `409 RESERVA_NO_ACTIVA`.
- **Tabla de transiciones:**

| Origen | Evento / Operación | Guardia / Precondición | Destino | Mecanismo / Error si falla |
|---|---|---|---|---|
| `—` | `POST /api/reservas` (`ReservaServicio.crear`) | Lote `DISPONIBLE` (o con reserva previa vencida auto-expirada) con precio en proyecto `PUBLICADO`; `fechaVencimiento == null \|\| >= hoy` | `ACTIVA` | `expirarReservaSiVencida` + `bloquearPorId(loteId)` + lote `DISPONIBLE->RESERVADO` + `INSERT`; `422 FECHA_VENCIMIENTO_INVALIDA`, `409 LOTE_NO_DISPONIBLE`, `404 NO_ENCONTRADO` |
| `ACTIVA` *(vigente)* | `POST /api/reservas/:id/cancelar` (`ReservaServicio.cancelar`) | `reserva.estado === 'ACTIVA' && !estaVencida(reserva, hoy)` | `CANCELADA` | `finalizar(..., 'CANCELADA')` (`WHERE estado='ACTIVA'`) + `cambiarEstadoSi` verificado; `409 RESERVA_NO_ACTIVA` |
| `ACTIVA` *(expirada: `fechaVencimiento < hoy`)* | `ReservaServicio.procesarVencidas` | `estaVencida(reserva, hoy)` | `VENCIDA` | `ORDER BY id`, transacción independiente por reserva: `finalizar(..., 'VENCIDA')` + `cambiarEstadoSi` verificado |
| `ACTIVA` *(expirada: `fechaVencimiento < hoy`)* | `ReservaServicio.cancelar` | `estaVencida(reserva, hoy)` | `VENCIDA` *(y rechaza cancelación)* | `expirarReservaSiVencida` confirma `VENCIDA` + lote `DISPONIBLE`, luego lanza `409 RESERVA_NO_ACTIVA` |
| `ACTIVA` *(expirada: `fechaVencimiento < hoy`)* | `ReservaServicio.crear` / `VentaServicio.registrar` | `estaVencida(reserva, hoy)` | `VENCIDA` *(y libera lote)* | `expirarReservaSiVencida` persiste `VENCIDA` + lote `DISPONIBLE`, permitiendo crear la nueva reserva o registrar venta para cualquier comprador |
| `ACTIVA` *(vigente)* | `POST /api/ventas` (`VentaServicio.registrar`) | `clienteId === reserva.clienteId`, lote `RESERVADO` con precio, proyecto `PUBLICADO`, plan válido | `CONVERTIDA` | Transacción: `finalizar(..., 'CONVERTIDA')` + lote `VENDIDO` + `INSERT venta`; `409 LOTE_NO_DISPONIBLE` / `LOTE_RESERVADO_POR_OTRO_CLIENTE` |
| `CANCELADA` / `VENCIDA` / `CONVERTIDA` | `cancelar` / `procesarVencidas` / `registrar` | — | *(rechazada)* | `409 RESERVA_NO_ACTIVA` / `409 LOTE_NO_DISPONIBLE` |

---

### 2.4 Venta (`EstadoVenta`) y Estado Financiero Implícito (`resumirPlan`)

- **Estados explícitos de `Venta`:**
  - `VIGENTE` *(inicial)*: operación comercial activa, habilita pagos y anulaciones de pago.
  - `ANULADA` *(terminal)*: operación revertida por `ADMIN` con motivo obligatorio; el lote vuelve a `DISPONIBLE` y los pagos quedan como historial inmutable.
- **Estados implícitos financieros (`resumirPlan`):**
  - `CON_SALDO`: `saldoPendiente > 0` (`saldada === false`).
  - `SALDADA`: `saldoPendiente === 0` (`saldada === true`, todas las cuotas cubiertas).
  - `CORRUPTO` *(inalcanzable si se cumplen invariantes)*: `saldoPendiente < 0` -> lanza `Error('Inconsistencia...')` (`HTTP 500`).
- **Invariantes:**
  - **INV-VNT-1 (Una vigente por lote):** Índice único parcial `ventas_una_vigente_por_lote ON ventas (lote_id) WHERE estado = 'VIGENTE'`.
  - **INV-VNT-2 (Conservación de precio pactado):** `precio_pactado > 0` congelado al crear la venta; cambios posteriores a `lote.precio` no la alteran.
  - **INV-VNT-3 (Equivalencia del cronograma):** `sum(cuotas.monto) === precioPactado`; `CONTADO` genera 1 cuota (`numero = 0`) y 1 pago inmediato por el total; `FINANCIADO` genera cuota inicial opcional (`numero = 0`, pagada al crear) + `1..N` cuotas mensuales (`1 <= N <= 240`).
  - **INV-VNT-4 (Saldo no negativo):** `saldoPendiente = precioPactado - sum(pagos con estado === 'VALIDO') >= 0`.
  - **INV-VNT-5 (Inmutabilidad tras anulación):** Una venta `ANULADA` no puede volver a anularse, no admite nuevos pagos ni admite anulación de sus pagos (`409 VENTA_NO_VIGENTE`), serializado bloqueando la fila de `ventas` con `bloquearPorId`.
- **Tabla de transiciones de `Venta`:**

| Origen | Evento / Operación | Guardia / Precondición | Destino | Mecanismo / Error si falla |
|---|---|---|---|---|
| `—` | `POST /api/ventas` (`VentaServicio.registrar`) | Lote `DISPONIBLE` (o `RESERVADO` del mismo cliente, o con reserva vencida auto-expirada); proyecto `PUBLICADO`; `lote.precio > 0`; `generarPlanDePagos` válido | `VIGENTE` | Transacción única: expira vencida si aplica o convierte reserva vigente -> lote `VENDIDO` -> `INSERT venta + cuotas + pago inicial/contado` (`404 NO_ENCONTRADO` si el lote no existe) |
| `VIGENTE` | `POST /api/ventas/:id/anular` (`VentaServicio.anular`) | Rol `ADMIN`; `venta.estado === 'VIGENTE'`; `motivo.trim().length >= 5` | `ANULADA` | Transacción: `UPDATE ventas ... WHERE id=$4 AND estado='VIGENTE'`, `cambiarEstadoSi(loteId, 'VENDIDO', 'DISPONIBLE')` verificado; `409 VENTA_NO_VIGENTE`, `422 MOTIVO_REQUERIDO` |
| `ANULADA` | `POST /api/ventas/:id/anular` | — | *(rechazada)* | `409 VENTA_NO_VIGENTE` |
| `ANULADA` | `POST /api/ventas/:id/pagos` | — | *(rechazada)* | `409 VENTA_NO_VIGENTE` |
| `ANULADA` | `POST /api/pagos/:id/anular` | — | *(rechazada)* | `409 VENTA_NO_VIGENTE` (`PagoServicio.anular` bloquea `ventas` con `bloquearPorId` y `validarPagoAnulable` verifica `venta.estado === 'VIGENTE'`) |

---

### 2.5 Cuota (`EstadoCuota`, derivada) y Pago (`EstadoPago`)

- **Estados de `Cuota` (calculados en `calcularEstadoCuota`, no persistidos):**
  - `PENDIENTE`: `montoPagado < cuota.monto` y `fechaVencimiento >= hoy`.
  - `VENCIDA`: `montoPagado < cuota.monto` y `fechaVencimiento < hoy`.
  - `PAGADA`: `montoPagado >= cuota.monto` (`montoPendiente === 0`).
- **Estados explícitos de `Pago`:**
  - `VALIDO` *(inicial)*: computa en `montoPagado` de su cuota y en `totalPagado` de la venta.
  - `ANULADO` *(terminal)*: excluido de `resumirPlan`, conservado con `motivo_anulacion`, `anulado_en`, `anulado_por_id`.
- **Invariantes:**
  - **INV-PAG-1 (No borrado):** Un pago nunca se elimina (`DELETE`); solo pasa `VALIDO -> ANULADO` por `ADMIN` con motivo ≥ 5 caracteres.
  - **INV-PAG-2 (No sobrepago):** `0 < monto <= cuota.montoPendiente <= saldoPendiente`; máximo 2 decimales (`esMontoValido`). Serializado mediante `SELECT ... FROM ventas WHERE id = $1 FOR UPDATE` en `PagoServicio.registrar`.
  - **INV-PAG-3 (Reversión condicionada a venta vigente):** Una cuota `PAGADA` no recibe nuevos pagos (`409 CUOTA_YA_PAGADA`) y solo vuelve a `PENDIENTE`/`VENCIDA` cuando un `ADMIN` anula uno de sus pagos mientras la venta siga en `VIGENTE` (Consigna §9).
- **Tabla de transiciones (`Pago` y efecto sobre `Cuota`):**

| Origen (`Pago`) | Evento / Operación | Guardia / Precondición | Destino (`Pago`) | Efecto en `Cuota` | Error si falla |
|---|---|---|---|---|---|
| `—` | `POST /api/ventas/:id/pagos` (`PagoServicio.registrar`) | Venta `VIGENTE` (bloqueada `FOR UPDATE`); `esMontoValido(monto)`; `cuota` pertenece a la venta y `!== 'PAGADA'`; `monto <= saldoPendiente`; `monto <= cuota.montoPendiente` | `VALIDO` | `montoPagado += monto`; pasa a `PAGADA` si cubre el total | `409 VENTA_NO_VIGENTE`, `409 CUOTA_YA_PAGADA`, `422 MONTO_INVALIDO` / `MONTO_EXCEDE_SALDO` / `MONTO_EXCEDE_CUOTA` |
| `VALIDO` | `POST /api/pagos/:id/anular` (`PagoServicio.anular`) | Rol `ADMIN`; `ventas.bloquearPorId(pago.ventaId)`; `venta.estado === 'VIGENTE'`; `pago.estado === 'VALIDO'`; `motivo.trim().length >= 5` | `ANULADO` | `montoPagado -= monto`; `PAGADA` vuelve a `PENDIENTE` o `VENCIDA` | `409 VENTA_NO_VIGENTE`, `409 PAGO_YA_ANULADO`, `422 MOTIVO_REQUERIDO` |
| `ANULADO` | `POST /api/pagos/:id/anular` | — | *(rechazada)* | Sin cambio | `409 PAGO_YA_ANULADO` |
| `PENDIENTE` (cuota) | Paso del tiempo (`hoy > fechaVencimiento`) | `montoPagado < cuota.monto` | *(N/A)* | `PENDIENTE -> VENCIDA` | *(cálculo puro)* |

---

### 2.6 Usuario (`activo`) y Sesión (`AuthServicio` + `ProveedorSesion`)

- **Estados de `Usuario`:**
  - `ACTIVO` (`activo = true`, inicial) ↔ `INACTIVO` (`activo = false`).
- **Estados implícitos de `Sesión` (Frontend + Backend):**
  - `NO_AUTENTICADO`: sin token en `sessionStorage` / `Authorization`.
  - `AUTENTICADO`: token JWT válido en firma y expiración, y usuario existente con `activo === true` en BD.
  - `INVALIDADA_O_EXPIRADA`: token expirado/alterado (`401 TOKEN_INVALIDO`) o usuario desactivado (`401 NO_AUTENTICADO` en `usuarioDesdeToken`, `401 USUARIO_INACTIVO` en login).
- **Invariantes:**
  - **INV-USR-1 (Vínculo cliente exclusivo):** `(rol === 'CLIENTE') ⇔ (clienteId !== null)` (protegido también por `CHECK` en SQL y `UNIQUE(cliente_id)`).
  - **INV-USR-2 (No auto-desactivación):** Un `ADMIN` no puede desactivar su propia cuenta (`id === usuarioActual.id && !activo` -> `422 NO_PUEDE_DESACTIVARSE`).
  - **INV-USR-3 (Revocación inmediata al desactivar):** Cada petición autenticada consulta `usuarios.buscarPorId(usuarioId)` y rechaza con `401` si `!usuario.activo`.
- **Tabla de transiciones (`Usuario`):**

| Origen | Evento / Operación | Guardia / Precondición | Destino | Mecanismo / Error si falla |
|---|---|---|---|---|
| `—` | `POST /api/usuarios` | Rol `ADMIN`; password ≥ 6; vínculo `CLIENTE` válido; `email` y `clienteId` libres | `ACTIVO (true)` | `422 PASSWORD_DEBIL` / `CLIENTE_REQUERIDO` / `CLIENTE_NO_PERMITIDO`, `409 EMAIL_DUPLICADO` / `CLIENTE_YA_TIENE_USUARIO` (también bajo `23505` concurrente vía `ejecutarConUnicidad`) |
| `ACTIVO` | `PATCH /api/usuarios/:id { activo: false }` | Rol `ADMIN`; `id !== usuarioActual.id` | `INACTIVO (false)` | `422 NO_PUEDE_DESACTIVARSE`, `404 NO_ENCONTRADO` |
| `INACTIVO` | `PATCH /api/usuarios/:id { activo: true }` | Rol `ADMIN` | `ACTIVO (true)` | `404 NO_ENCONTRADO` |

---

### 2.7 Modos del Editor de Mapa y Flujos UI (`ProyectoMapa` + Modales)

- **Máquina de modo de mapa (`ProyectoMapa.tsx`):** `'normal'` *(inicial)* | `'dibujar-lote'` | `'dibujar-limite'` | `'editar-forma'`.
- **Máquina de sub-estado de diálogo (`dialogoLote`, `dialogo`, `poligonoNuevo`):**
  - `dialogoLote`: `null | 'reservar' | 'vender' | 'cancelar-reserva' | 'editar-lote' | 'eliminar-lote'`.
  - `dialogo`: `null | 'importar-kml' | 'editar-proyecto' | 'publicar'`.
  - `poligonoNuevo`: `null | Poligono` (abre `ModalLote` de creación al terminar `'dibujar-lote'`).
- **Invariantes UI garantizados:**
  - **INV-UI-1 (Exclusión mutua de modos):** `ProyectoMapa.tsx` y `PanelLote.tsx` mantienen exclusión mutua entre modos de dibujo/edición (`'dibujar-lote'`, `'dibujar-limite'`, `'editar-forma'`) y la selección/acciones sobre lotes o apertura de modales incompatibles.
  - **INV-UI-2 (Salida garantizada de `'editar-forma'`):** `BarraMapa.tsx` conserva el aviso/control de edición para guardar o cancelar aunque falle la recarga de detalle mientras `modo === 'editar-forma'`.
  - **INV-UI-3 (Consistencia de vista previa y cliente en `ModalVenta`):** `ModalVenta.tsx` invalida respuestas obsoletas de `simularPlan` y resetea/sincroniza la selección de cliente y cierre cuando cambia el estado del lote tras un `409`.
  - **INV-UI-4 (Sincronización tras `409`):** `ModalPago.tsx`, `VentaDetalle.tsx`, `Reservas.tsx` y `ModalConfirmar.tsx` propagan la sincronización/recarga tras recibir conflicto `409` sin conservar saldos o acciones obsoletas visibles.

---

## 3. Errores confirmados y corregidos (evidencia histórica + resolución)

> Todos los hallazgos backend fueron reproducidos originalmente contra `crearApp` + `crearContenedor` + PGlite + SQL reales + Supertest (`reproducir_bugs.ts` y `reproducir_bugs_2.ts`) sobre el código previo al fix, y posteriormente cubiertos con pruebas de regresión unitarias, de integración y E2E.

### 3.1 `BUG-01` [CRÍTICO · Resuelto en `INC-01` / `#3`] — `PagoServicio.anular` permitía anular pagos de una venta ya `ANULADA`

- **Ubicación previa al fix:** `backend/src/aplicacion/servicios/PagoServicio.ts:54-64`, `backend/src/dominio/planPagos.ts:214-219`.
- **Estado/transición inválida observada:** `Pago: VALIDO -> ANULADO` cuando `Venta.estado === 'ANULADA'`, revirtiendo `Cuota: PAGADA -> PENDIENTE/VENCIDA` y alterando el `saldoPendiente` de una venta cerrada.
- **Evidencia dinámica previa al fix (`reproducir_bugs.ts`):**
  ```text
  BUG-01 anularVenta: 200 ANULADA saldoAlAnular: 55000
  BUG-01 anularPagoPostVentaAnulada: 200 ventaEstado: ANULADA pagoEstado: ANULADO nuevoSaldo: 70000
  ```
- **Resolución implementada:** `validarPagoAnulable` (`backend/src/dominio/planPagos.ts`) recibe la venta y valida `venta.estado === 'VIGENTE'` (lanzando `409 VENTA_NO_VIGENTE`), y `PagoServicio.anular` bloquea la fila en `ventas` mediante `bloquearPorId(pago.ventaId)` dentro de la transacción, serializando también carreras con `VentaServicio.anular`. Actualizados `docs/API.md` y `docs/DECISIONES.md`.

---

### 3.2 `BUG-02` [ALTO · Resuelto en `INC-02` / `#4`] — `ProyectoServicio.publicar` sin bloqueo/condición de estado y carrera con `LoteServicio.eliminar`

- **Ubicación previa al fix:** `backend/src/aplicacion/servicios/ProyectoServicio.ts:46-51`, `backend/src/infraestructura/bd/repositorios/RepositorioProyectosSql.ts:29-46`.
- **Estados/transiciones inválidas observadas:**
  - `BUG-02a`: Doble `BORRADOR -> PUBLICADO` simultánea respondía `200 OK` x2 en lugar de `200` + `409 PROYECTO_YA_PUBLICADO`.
  - `BUG-02b`: `BORRADOR -> PUBLICADO` con `0` lotes al intercalarse `DELETE /api/lotes/:id`, además de permitir borrar secuencialmente el último lote de un proyecto `PUBLICADO`.
- **Evidencia dinámica previa al fix (`reproducir_bugs.ts`):**
  ```text
  BUG-02a publicar concurrente (cuando otra ya publico): 200 PUBLICADO
  BUG-02b publicar concurrente con eliminar ultimo lote -> status: 200 estado: PUBLICADO totalLotes: 0
  ```
- **Resolución implementada:** `RepositorioProyectosSql` incorpora `bloquearPorId` y `publicarSiBorrador` (`WHERE id = $1 AND estado = 'BORRADOR'`); `ProyectoServicio.publicar` opera en `uow.transaccion` bloqueando el proyecto antes de contar sus lotes (`422 PROYECTO_SIN_LOTES` o `409 PROYECTO_YA_PUBLICADO`). `validarLoteEliminable` (`backend/src/dominio/lote.ts`) impide eliminar el último lote de un proyecto `PUBLICADO` (`409 PROYECTO_PUBLICADO_SIN_LOTES`) y `LoteServicio.eliminar` bloquea en orden `proyectos -> lotes`.

---

### 3.3 `BUG-03` [ALTO · Resuelto en `INC-03` / `#5`] — `ReservaServicio.cancelar` y `VentaServicio.registrar` aceptaban reservas ya vencidas

- **Ubicación previa al fix:** `backend/src/dominio/reserva.ts:32-39`, `backend/src/dominio/lote.ts:76-96`, `backend/src/aplicacion/servicios/ReservaServicio.ts:74-93`, `backend/src/aplicacion/servicios/VentaServicio.ts:66-92`.
- **Transiciones inválidas observadas:** `ACTIVA (expirada) -> CANCELADA` en `ReservaServicio.cancelar` y `ACTIVA (expirada) -> CONVERTIDA` en `VentaServicio.registrar` si el servicio corría sin haber pasado antes por `procesarVencidas()`.
- **Evidencia dinámica previa al fix (`reproducir_bugs.ts`):**
  ```text
  BUG-03a VentaServicio.registrar sobre reserva vencida -> venta: VIGENTE reserva.estado: CONVERTIDA
  BUG-03b ReservaServicio.cancelar sobre reserva vencida -> reserva.estado: CANCELADA
  ```
- **Resolución implementada:** Se extrajo `expirarReservaSiVencida` (`backend/src/aplicacion/servicios/expirarReserva.ts`). `ReservaServicio.cancelar` expira y confirma `VENCIDA` + lote `DISPONIBLE` antes de lanzar `409 RESERVA_NO_ACTIVA`; `ReservaServicio.crear` expira una reserva vencida previa y vuelve a bloquear el lote con `bloquearPorId(entrada.loteId)`; `VentaServicio.registrar` expira la reserva vencida y registra la venta sobre el lote como `DISPONIBLE` para cualquier comprador (`reservaId: null`).

---

### 3.4 `BUG-04` [ALTO · Resuelto en `INC-02` / `#4`] — `LoteServicio.actualizar` permitía `precio = 0` en lote `RESERVADO` y `500` en carrera con `eliminar`

- **Ubicación previa al fix:** `backend/src/aplicacion/servicios/LoteServicio.ts:72-95`, `backend/src/infraestructura/bd/repositorios/RepositorioLotesSql.ts:56-72`, `backend/src/infraestructura/bd/repositorios/consultas.ts:27-31`.
- **Estados/errores inválidos observados:**
  ```text
  BUG-04a PUT lote RESERVADO con precio 0 -> 200 precio: 0 estado: RESERVADO
  BUG-04a vender lote RESERVADO con precio=0 -> 422 LOTE_SIN_PRECIO
  BUG-04b PUT lote eliminado concurrentemente -> 500 { error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error inesperado en el servidor.' } }
  ```
- **Resolución implementada:** `validarPrecioLoteReservado` (`backend/src/dominio/lote.ts`) prohíbe establecer `precio = 0` sobre un lote `RESERVADO` (`422 LOTE_SIN_PRECIO`); `LoteServicio.actualizar` opera dentro de `uow.transaccion` usando `bloquearPorId` (protegiéndose contra concurrencia con `ReservaServicio.crear` y devolviendo `404 NO_ENCONTRADO` si el lote desapareció antes del bloqueo).

---

### 3.5 `BUG-05` [ALTO · Resuelto en `INC-02` / `#4` y `INC-03` / `#5`] — `LoteServicio.eliminar` sin transacción ni respuesta `404` consistente en carreras

- **Ubicación previa al fix:** `backend/src/aplicacion/servicios/LoteServicio.ts:111-115`, `backend/src/infraestructura/bd/repositorios/RepositorioLotesSql.ts:105-107`.
- **Comportamiento inválido observado:**
  ```text
  BUG-05a DELETE lote concurrente con reserva -> 409 REGISTRO_RELACIONADO
  ```
- **Resolución implementada:** `LoteServicio.eliminar` y `LoteServicio.cambiarEstado` operan dentro de `uow.transaccion` con `bloquearPorId` (orden `proyectos -> lotes` en `eliminar`). Así, si una reserva/venta ganó antes, `eliminar` responde `409 LOTE_CON_OPERACIONES` en vez de `REGISTRO_RELACIONADO`; y si el lote ya fue eliminado cuando intentan reservarlo (`ReservaServicio.crear`) o venderlo (`VentaServicio.registrar`), ambos devuelven `404 NO_ENCONTRADO`.

---

### 3.6 `BUG-06` [MEDIO-ALTO · Resuelto en `INC-03` / `#5`] — Riesgo de deadlock en `procesarVencidas` e ignorancia de `cambiarEstadoSi`

- **Ubicación previa al fix:** `RepositorioReservasSql.ts:46-52`, `ReservaServicio.ts:90, 100-117`, `VentaServicio.ts:137`.
- **Evidencia dinámica previa al fix (`reproducir_bugs_2.ts`):**
  ```text
  BUG-06b cancelar con cambiarEstadoSi=false -> reserva: CANCELADA lote: DISPONIBLE
  BUG-06b procesarVencidas con cambiarEstadoSi=false -> vencidas: 1 reservaEstado: VENCIDA lote: DISPONIBLE
  BUG-06b anular venta con cambiarEstadoSi=false -> venta: ANULADA lote: DISPONIBLE
  ```
- **Resolución implementada:** `RepositorioReservasSql.listarActivasVencidas` ordena determinísticamente (`ORDER BY id`); `ReservaServicio.procesarVencidas` ejecuta cada expiración en su propia transacción independiente para evitar bloqueos cruzados entre lotes/reservas distintos; y tanto `ReservaServicio.cancelar`, `ReservaServicio.procesarVencidas`, `expirarReservaSiVencida` como `VentaServicio.anular` verifican el retorno booleano de `lotes.cambiarEstadoSi(...)`.

---

### 3.7 `BUG-08` [MEDIO · Resuelto en `INC-04` / `#6`] — Modos incompatibles y desincronización de modales en React

- **Archivos previos al fix y modificados:** `ProyectoMapa.tsx`, `PanelLote.tsx`, `BarraMapa.tsx`, `ModalVenta.tsx`, `ModalPago.tsx`, `VentaDetalle.tsx`, `Reservas.tsx`, `ModalConfirmar.tsx`.
- **Problemas corregidos:**
  1. Selección/acciones durante `'dibujar-lote'`, `'dibujar-limite'` y `'editar-forma'` ahora respetan exclusión mutua en `ProyectoMapa.tsx` y `PanelLote.tsx`.
  2. `BarraMapa.tsx` mantiene el control para guardar o cancelar mientras `modo === 'editar-forma'`.
  3. `ModalVenta.tsx` evita mostrar o confirmar un `plan` obsoleto durante cambios rápidos de parámetros y resincroniza/cierra tras un `409`.
  4. `ModalPago.tsx`, `VentaDetalle.tsx`, `Reservas.tsx` y `ModalConfirmar.tsx` propagan recarga ante conflictos `409`.

---

### 3.8 `BUG-07` [BAJO · Resuelto en `INC-05` / `#7`] — Códigos `409 REGISTRO_DUPLICADO` genéricos bajo concurrencia

- **Evidencia dinámica previa al fix (`reproducir_bugs_2.ts`):**
  ```text
  BUG-07 cliente duplicado concurrente -> 409 REGISTRO_DUPLICADO
  ```
- **Resolución implementada:** `ejecutarConUnicidad` en `backend/src/infraestructura/bd/repositorios/consultas.ts` traduce colisiones PostgreSQL `23505` en `RepositorioClientesSql`, `RepositorioUsuariosSql`, `RepositorioLotesSql`, `RepositorioReservasSql` y `RepositorioVentasSql` al código `409` específico documentado en `docs/API.md` (`DOCUMENTO_DUPLICADO`, `EMAIL_DUPLICADO`, `CLIENTE_YA_TIENE_USUARIO`, `CODIGO_LOTE_DUPLICADO`, etc.).

---

## 4. Priorización por impacto, incidencias y decisiones resueltas

| Prioridad | Incidencia (GitHub) | Bugs incluidos | Impacto principal | Rama `fix/` | Estado |
|---|---|---|---|---|---|
| **P1 · Crítico** | **#3 (`INC-01`)** — Impedir anular pagos de una venta ya `ANULADA` y serializar en `ventas` | `BUG-01` | Corrupción del historial contable/saldo de ventas cerradas | `fix/inc-01-pagos-venta-anulada` | **Resuelto** |
| **P2 · Alto** | **#4 (`INC-02`)** — Atomicidad y condiciones en publicar, actualizar y eliminar lotes | `BUG-02`, `BUG-04`, `BUG-05` | Publicación duplicada o con `0` lotes, lote `RESERVADO` con `precio=0`, `500` y `23503` en carreras con `DELETE` | `fix/inc-02-proyectos-lotes-concurrencia` | **Resuelto** |
| **P2 · Alto** | **#5 (`INC-03`)** — Vencer reservas expiradas al cancelar/vender, evitar deadlock en `procesarVencidas` y validar `cambiarEstadoSi` | `BUG-03`, `BUG-06` | Reservas expiradas canceladas/convertidas, riesgo de deadlock `40P01`, desincronía ante `cambiarEstadoSi = false` | `fix/inc-03-reservas-vencidas-concurrencia` | **Resuelto** |
| **P3 · Medio** | **#6 (`INC-04`)** — Exclusión mutua de modos en mapa y sincronización de modales ante conflictos | `BUG-08` | Modos incompatibles, salida bloqueada en `'editar-forma'`, modales desincronizados tras `409` o edición rápida | `fix/inc-04-frontend-modos-modales` | **Resuelto** |
| **P4 · Bajo** | **#7 (`INC-05`)** — Mapear colisiones `23505` concurrentes al código `409` específico de dominio | `BUG-07` | Respuesta genérica `REGISTRO_DUPLICADO` bajo concurrencia | `fix/inc-05-codigos-duplicados-concurrencia` | **Resuelto** |

*(Las cinco ramas `fix/inc-01..05` están integradas en `fix/maquinas-de-estado`; `main` permanece sin cambios.)*

### Decisiones de negocio resueltas (`AGENTS.md` §9)

1. **INC-02 (`BUG-02`):** Se aplica el invariante continuo `PUBLICADO => >= 1 lote`, rechazando también la eliminación secuencial del último lote de un proyecto `PUBLICADO` con `409 PROYECTO_PUBLICADO_SIN_LOTES`.
2. **INC-02 (`BUG-04a`):** Se prohíbe actualizar a `precio = 0` un lote `RESERVADO` mediante `PUT /api/lotes/:id` (`422 LOTE_SIN_PRECIO`), además de serializar la lectura/actualización frente a `ReservaServicio.crear`.
3. **INC-03 (`BUG-03`):** `ReservaServicio.cancelar`, `ReservaServicio.crear` y `VentaServicio.registrar` expiran automáticamente reservas con `fechaVencimiento < hoy`: `cancelar` confirma `VENCIDA` + `DISPONIBLE` y rechaza con `409 RESERVA_NO_ACTIVA`; `registrar` expira la reserva y trata el lote como `DISPONIBLE` para cualquier comprador (`reservaId: null`).

---

## 5. Cobertura de pruebas de regresión agregadas

- **Apoyo para concurrencia determinista en PGlite:** `crearAppInterceptable` en `backend/tests/apoyo/app.ts` inyecta ganchos SQL dentro de la transacción para reproducir intercalados concurrentes de forma determinista sobre PGlite.
- **Unitarias backend (`backend/tests/unitarias/` — Vitest):**
  - `dominio/lote.test.ts` (7 casos)
  - `dominio/planPagos.test.ts` (4 casos)
  - `servicios/ProyectoServicio.test.ts` (2 casos)
  - `servicios/LoteServicio.test.ts` (2 casos)
  - `servicios/PagoServicio.test.ts` (3 casos)
  - `servicios/ReservaServicio.test.ts` (4 casos)
  - `servicios/VentaServicio.test.ts` (2 casos)
- **Integración backend (`backend/tests/integracion/` — Supertest + PGlite):**
  - `pagos.test.ts` (2 casos)
  - `proyectos.test.ts` (2 casos)
  - `lotes.test.ts` (5 casos)
  - `reservas.test.ts` (3 casos)
  - `ventas.test.ts` (1 caso)
  - `clientes.test.ts` (1 caso)
  - `usuarios.test.ts` (3 casos)
- **E2E UI (`e2e/tests/` — Playwright Chromium):**
  - `regresion-modos-y-conflictos.spec.ts` (3 casos, con apoyo de `e2e/apoyo/sesion.ts`).
