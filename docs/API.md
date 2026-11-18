# API REST

Base: `http://localhost:3000/api`. El frontend la llama a través del proxy de Vite (`/api/...`).

## 1. Reglas generales

- Todas las rutas, salvo `/api/salud` y `/api/auth/login`, requieren
  `Authorization: Bearer <token>`. Sin token la respuesta es **401**, incluso en rutas que no existen.
- Los permisos por rol están en `backend/src/dominio/permisos.ts`. La misma matriz se envía al
  frontend para mostrar u ocultar botones.
- Las reservas vencidas se procesan antes de cada petición autenticada: el mapa siempre muestra el
  estado real de los lotes.
- Formato de error, igual en todas las rutas:

  ```json
  { "error": { "codigo": "LOTE_NO_DISPONIBLE", "mensaje": "El lote A-05 no está disponible...", "detalles": null } }
  ```

- Las pruebas verifican el `codigo`, nunca el texto del `mensaje`.

## 2. Rutas

| Método | Ruta | Permiso (roles) | Descripción |
|---|---|---|---|
| GET | `/salud` | público | Comprobar que la API está corriendo |
| POST | `/auth/login` | público | `{ email, password }` → `{ token, usuario }` |
| GET | `/auth/yo` | con sesión | Usuario actual y sus permisos |
| GET | `/proyectos` | admin, asesor | Proyectos con conteo por estado (el asesor solo ve los publicados) |
| POST | `/proyectos` | admin | Crear proyecto `{ nombre, descripcion, ubicacion }` |
| GET | `/proyectos/:id` | admin, asesor | Detalle con resumen por estado, etapa y manzano |
| PUT | `/proyectos/:id` | admin | Editar datos del proyecto |
| PUT | `/proyectos/:id/limite` | admin | Guardar el perímetro dibujado `{ geometria: Polygon }` |
| POST | `/proyectos/:id/publicar` | admin | Publicar (necesita al menos un lote) |
| GET | `/proyectos/:id/lotes?estado=&etapa=&manzano=&q=` | admin, asesor | Lotes filtrados, con su geometría |
| POST | `/proyectos/:id/lotes` | admin | Crear un lote dibujado `{ codigo, geometria, precio?, manzano?, etapa?, ... }` |
| POST | `/proyectos/:id/lotes/importar-kml` | admin | Importar `{ kml, precioPorDefecto?, manzanoPorDefecto?, etapaPorDefecto? }` (todo o nada) |
| POST | `/lotes/analizar-geometria` | admin | Valida un polígono y devuelve superficie y dimensiones sugeridas |
| GET | `/lotes/:id` | admin, asesor | Detalle bajo demanda, con la reserva activa o la venta vigente |
| PUT | `/lotes/:id` | admin | Editar datos, precio o geometría |
| PATCH | `/lotes/:id/estado` | admin | Bloquear o desbloquear `{ estado }` |
| DELETE | `/lotes/:id` | admin | Eliminar (solo si nunca tuvo reservas ni ventas) |
| GET | `/clientes?q=` | admin, asesor | Listar o buscar clientes |
| POST | `/clientes` | admin, asesor | Registrar cliente |
| GET | `/clientes/:id` | admin, asesor | Detalle con sus reservas y ventas |
| PUT | `/clientes/:id` | admin, asesor | Editar cliente |
| GET | `/reservas?estado=&clienteId=&loteId=&proyectoId=` | admin, asesor | Listar reservas |
| POST | `/reservas` | admin, asesor | Reservar `{ loteId, clienteId, fechaVencimiento?, observacion? }` |
| GET | `/reservas/:id` | admin, asesor | Detalle de una reserva |
| POST | `/reservas/:id/cancelar` | admin, asesor | Cancelar `{ motivo? }`: el lote vuelve a DISPONIBLE |
| GET | `/ventas?clienteId=&proyectoId=&estado=` | admin, asesor, cliente* | Listar ventas |
| POST | `/ventas/simular-plan` | admin, asesor | Vista previa del cronograma, sin guardar |
| POST | `/ventas` | admin, asesor | Registrar venta `{ loteId, clienteId, modalidad, precioPactado?, cuotaInicial?, numeroCuotas?, fechaPrimeraCuota?, metodoPago? }` |
| GET | `/ventas/:id` | admin, asesor, cliente* | Plan de pagos, pagos y saldo |
| POST | `/ventas/:id/pagos` | admin, asesor | Registrar pago `{ cuotaId, monto, metodo?, referencia? }` |
| POST | `/ventas/:id/anular` | admin | Anular venta `{ motivo }`: el lote vuelve a DISPONIBLE |
| POST | `/pagos/:id/anular` | admin | Anular pago `{ motivo }` (queda en el historial) |
| GET | `/portal/mis-operaciones` | cliente | Mis compras y reservas |
| GET | `/usuarios` | admin | Listar usuarios |
| POST | `/usuarios` | admin | Crear usuario `{ nombre, email, password, rol, clienteId? }` |
| PATCH | `/usuarios/:id` | admin | Activar o desactivar `{ activo }` |
| GET | `/reportes/resumen` | admin | Reporte por proyecto: vendido, cobrado, por cobrar, vencido |
| POST | `/pruebas/reiniciar` | público, **solo con `ENTORNO=pruebas`** | Vuelve a los datos demo (lo usan los E2E) |

\* El cliente solo recibe sus propias ventas; si pide la de otro cliente recibe **403**.

## 3. Códigos HTTP

| HTTP | Clase de error (`dominio/errores.ts`) | Cuándo |
|---|---|---|
| 400 | `ErrorValidacion` | Datos con formato inválido (zod en `http/validacion.ts`) |
| 401 | `ErrorNoAutenticado` | Sin sesión, token inválido o credenciales incorrectas |
| 403 | `ErrorSinPermiso` | El rol no tiene permiso, o un cliente pide datos de otro |
| 404 | `ErrorNoEncontrado` | El recurso no existe |
| 409 | `ErrorConflicto` | El estado actual impide la operación (lote ya reservado, pago ya anulado...) |
| 422 | `ErrorReglaNegocio` | Datos bien formados que violan una regla comercial o financiera |
| 500 | — | Error inesperado (`ERROR_INTERNO`), sin exponer detalles |

## 4. Catálogo de códigos de error

| Código | HTTP | Dónde se lanza | Significado |
|---|---|---|---|
| `VALIDACION` | 400 | `http/validacion.ts` | Campos obligatorios vacíos o con formato inválido |
| `JSON_INVALIDO` | 400 | `manejadorErrores.ts` | El cuerpo no es un JSON válido |
| `NO_AUTENTICADO` | 401 | `middlewares/seguridad.ts` | Falta el token |
| `TOKEN_INVALIDO` | 401 | `infraestructura/seguridad.ts` | Token vencido o alterado |
| `CREDENCIALES_INVALIDAS` | 401 | `AuthServicio` | Correo o contraseña incorrectos |
| `USUARIO_INACTIVO` | 401 | `AuthServicio` | El usuario fue desactivado |
| `SIN_PERMISO` | 403 | `seguridad.ts`, servicios | El rol no puede hacer la operación |
| `NO_ENCONTRADO` | 404 | servicios | Proyecto, lote, cliente, reserva, venta o pago inexistente |
| `RUTA_NO_ENCONTRADA` | 404 | `app.ts` | La ruta no existe |
| `ARCHIVO_DEMASIADO_GRANDE` | 413 | `manejadorErrores.ts` | El cuerpo supera 5 MB |
| `LOTE_NO_DISPONIBLE` | 409 | `dominio/lote.ts`, `ReservaServicio`, `VentaServicio` | El lote no está DISPONIBLE, o lo tomó otro usuario al mismo tiempo |
| `LOTE_YA_VENDIDO` | 409 | `dominio/lote.ts` | Vender un lote VENDIDO |
| `LOTE_BLOQUEADO` | 409 | `dominio/lote.ts` | Vender un lote BLOQUEADO |
| `LOTE_RESERVADO_POR_OTRO_CLIENTE` | 409 | `dominio/lote.ts` | Vender un lote RESERVADO a un cliente distinto del de la reserva |
| `LOTE_CON_OPERACIONES` | 409 | `dominio/lote.ts` | Eliminar un lote que tuvo reservas o ventas |
| `LOTE_MODIFICADO` | 409 | `LoteServicio` | Otro usuario cambió el estado mientras se bloqueaba |
| `CODIGO_LOTE_DUPLICADO` | 409 / 422 | `LoteServicio` / `ImportacionKmlServicio` | El código ya existe en el proyecto o se repite en el KML |
| `TRANSICION_INVALIDA` | 422 | `dominio/lote.ts` | Cambio de estado no permitido por la máquina de estados |
| `CAMBIO_ESTADO_NO_PERMITIDO` | 422 | `dominio/lote.ts` | A mano solo se bloquea o desbloquea |
| `PROYECTO_NO_PUBLICADO` | 422 | `dominio/lote.ts` | Reservar o vender en un proyecto en BORRADOR |
| `LOTE_SIN_PRECIO` | 422 | `dominio/lote.ts` | Reservar o vender un lote sin precio |
| `CODIGO_LOTE_REQUERIDO` · `PRECIO_INVALIDO` · `SUPERFICIE_INVALIDA` · `TEXTO_DEMASIADO_LARGO` | 422 | `dominio/lote.ts` | Datos comerciales inválidos |
| `GEOMETRIA_INVALIDA` | 422 | `dominio/geometria.ts` | Polígono con menos de 3 vértices, coordenadas fuera de rango, etc. |
| `KML_INVALIDO` · `KML_DATO_INVALIDO` · `KML_CON_ERRORES` | 422 | lector y `ImportacionKmlServicio` | Archivo ilegible, dato inválido, o lista de errores (en `detalles`) |
| `PROYECTO_YA_PUBLICADO` | 409 | `dominio/proyecto.ts` | Publicar dos veces |
| `PROYECTO_SIN_LOTES` | 422 | `dominio/proyecto.ts` | Publicar sin lotes |
| `FECHA_VENCIMIENTO_INVALIDA` | 422 | `dominio/reserva.ts` | Vencimiento anterior a hoy |
| `RESERVA_NO_ACTIVA` | 409 | `dominio/reserva.ts`, `ReservaServicio` | Cancelar una reserva que ya no está ACTIVA, o que otro usuario cerró al mismo tiempo |
| `PRECIO_PACTADO_INVALIDO` · `CUOTA_INICIAL_INVALIDA` · `NUMERO_CUOTAS_INVALIDO` · `FECHA_PRIMERA_CUOTA_INVALIDA` | 422 | `dominio/planPagos.ts` | Plan de pagos imposible |
| `MONTO_INVALIDO` | 422 | `dominio/planPagos.ts` | Pago ≤ 0 o con más de 2 decimales |
| `MONTO_EXCEDE_SALDO` | 422 | `dominio/planPagos.ts` | El pago dejaría el saldo negativo |
| `MONTO_EXCEDE_CUOTA` | 422 | `dominio/planPagos.ts` | El pago supera lo pendiente de la cuota |
| `CUOTA_YA_PAGADA` | 409 | `dominio/planPagos.ts` | Pagar una cuota PAGADA |
| `VENTA_NO_VIGENTE` | 409 | `dominio/planPagos.ts`, `dominio/venta.ts`, `VentaServicio` | Pagar o anular una venta ANULADA (también si dos anulaciones llegan a la vez) |
| `PAGO_YA_ANULADO` | 409 | `dominio/planPagos.ts`, `PagoServicio` | Anular dos veces el mismo pago (también a la vez) |
| `MOTIVO_REQUERIDO` | 422 | `dominio/venta.ts` | Anular sin motivo (mínimo 5 caracteres) |
| `DOCUMENTO_DUPLICADO` | 409 | `ClienteServicio` | Ya existe un cliente con ese CI/NIT |
| `EMAIL_DUPLICADO` · `CLIENTE_YA_TIENE_USUARIO` | 409 | `UsuarioServicio` | Usuario repetido |
| `PASSWORD_DEBIL` · `CLIENTE_REQUERIDO` · `CLIENTE_NO_PERMITIDO` · `NO_PUEDE_DESACTIVARSE` | 422 | `dominio/usuario.ts`, `UsuarioServicio` | Reglas de usuarios |
| `REGISTRO_DUPLICADO` · `REGISTRO_RELACIONADO` | 409 | `manejadorErrores.ts` | Segunda barrera: un índice único o una clave foránea de PostgreSQL rechazó la operación |
| `DATO_FUERA_DE_RANGO` | 422 | `manejadorErrores.ts` | Segunda barrera: un CHECK o un tamaño de PostgreSQL rechazó un valor |
| `ERROR_INTERNO` | 500 | `manejadorErrores.ts` | Error inesperado |
