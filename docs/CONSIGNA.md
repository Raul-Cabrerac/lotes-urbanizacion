# Consigna: Sistema de Gestión de Urbanizaciones y Lotes

> Transcripción literal del PDF del proyecto final de **Taller de Actualización V** (NUR), para que
> personas y agentes puedan leer los requisitos en texto. No se edita salvo para corregir la
> transcripción; si hubiera una diferencia, manda el PDF original. Las secciones se citan así:
> `Consigna §9`.

*Taller de Actualización V · Proyectos inmobiliarios, mapa de lotes, reservas, ventas y planes de pago*

**Alcance del proyecto.** La solución permitirá administrar proyectos de urbanización y visualizar
sus lotes georreferenciados sobre un mapa. Los lotes podrán importarse desde archivos KML o
dibujarse como polígonos, y mostrar visualmente si están disponibles, reservados o vendidos.
También se gestionarán clientes, reservas, ventas y planes de pago.

## 1. Solicitud del cliente

Somos una empresa dedicada al desarrollo y comercialización de urbanizaciones. Actualmente
administramos información de proyectos, lotes, clientes, reservas, ventas y cuotas utilizando
planos, hojas de cálculo y registros separados.

Necesitamos una plataforma donde nuestro equipo comercial pueda abrir un proyecto y visualizar
directamente sobre un mapa todos los lotes disponibles. Cada lote debe estar delimitado
gráficamente y mostrar información como código, manzano, superficie, dimensiones, precio y estado.

Queremos diferenciar visualmente los lotes disponibles, reservados y vendidos. Al seleccionar un
lote en el mapa necesitamos consultar su información y, cuando corresponda, registrar una reserva o
venta para un cliente.

También necesitamos administrar ventas financiadas. Para cada venta se deberá poder definir una
cuota inicial, número de cuotas o cronograma, registrar pagos y conocer en todo momento cuánto pagó
el cliente y cuánto saldo mantiene.

Además de que el sistema funcione correctamente, necesitamos que las reglas críticas estén
respaldadas por pruebas unitarias, de integración y End-to-End.

## 2. Tipos de usuario

| Rol | Responsabilidades |
|---|---|
| Administrador | Crear proyectos; cargar/dibujar lotes; administrar usuarios, precios, estados, clientes y ventas; consultar reportes. |
| Asesor comercial | Consultar proyectos y mapa; registrar clientes; reservar lotes; registrar ventas; consultar planes de pago y pagos. |
| Cliente | Consultar sus lotes, información de compra, cronograma, pagos realizados y saldo pendiente. |

## 3. Gestión de proyectos inmobiliarios

El sistema deberá permitir crear múltiples proyectos de urbanización. Cada proyecto deberá contener
como mínimo nombre, descripción, ubicación, estado, fecha de creación y datos generales.

Un proyecto podrá organizarse adicionalmente por etapas, sectores o manzanos. Los lotes siempre
deberán pertenecer a un proyecto.

## 4. Mapa y geometría de lotes

El administrador deberá poder representar los lotes sobre un mapa. La geometría podrá obtenerse
mediante la carga de un archivo KML o mediante herramientas para dibujar y editar polígonos
directamente en el mapa. Cada lote deberá conservar su geometría y datos comerciales. El sistema
deberá permitir hacer clic sobre el polígono para consultar el detalle.

- Código o número de lote.
- Manzano, etapa o sector.
- Superficie en m².
- Dimensiones o medidas referenciales.
- Precio.
- Geometría/polígono.
- Estado comercial.
- Proyecto al que pertenece.

El mapa deberá utilizar una representación visual clara para distinguir los diferentes estados de
los lotes.

## 5. Estados del lote

Como mínimo se manejarán los estados DISPONIBLE, RESERVADO y VENDIDO. Opcionalmente podrá existir
BLOQUEADO para lotes que temporalmente no puedan comercializarse.

- Solo un lote DISPONIBLE podrá reservarse o venderse.
- Un lote RESERVADO no podrá ser reservado simultáneamente por otro cliente.
- Al confirmar una venta, el lote deberá pasar a VENDIDO.
- Cancelar o vencer una reserva deberá devolver el lote a DISPONIBLE si no existe una venta.
- Un lote VENDIDO no podrá volver a venderse mientras la venta continúe vigente.

## 6. Gestión de clientes

El asesor podrá registrar clientes con información básica como nombre completo, documento de
identidad, teléfono, correo y dirección. Un cliente podrá tener una o más operaciones asociadas a
diferentes lotes.

## 7. Reserva de lotes

El asesor podrá seleccionar un lote disponible desde el mapa y crear una reserva para un cliente.
La reserva deberá registrar cliente, lote, fecha, fecha de vencimiento opcional, observación y
estado.

**Regla crítica:** el sistema deberá evitar que dos usuarios reserven o vendan simultáneamente el
mismo lote.

## 8. Venta del lote

Para registrar una venta se deberá seleccionar un cliente y un lote disponible o reservado por ese
mismo cliente. La venta deberá almacenar el precio pactado, fecha, asesor y modalidad de pago.

El precio pactado deberá conservarse históricamente. Si posteriormente cambia el precio comercial
del lote, la venta existente no deberá modificarse.

## 9. Plan de pagos

Una venta podrá ser al contado o financiada. Para una venta financiada se deberá definir un plan de
pagos.

- Precio pactado del lote.
- Cuota inicial, cuando corresponda.
- Número de cuotas.
- Monto de cada cuota o cronograma personalizado.
- Fecha de vencimiento.
- Estado de cada cuota: PENDIENTE, PAGADA o VENCIDA.
- Total pagado.
- Saldo pendiente.

Al registrar un pago válido, el sistema deberá actualizar el monto pagado y el saldo. El saldo
nunca deberá ser negativo.

Una cuota pagada no deberá volver a PENDIENTE mediante una operación ordinaria. Si se requiere
anular un pago, deberá conservarse trazabilidad de la operación.

## 10. Historial y consultas

- Consultar lotes por proyecto, etapa, manzano y estado.
- Consultar reservas activas y vencidas.
- Consultar ventas por cliente y proyecto.
- Consultar plan de pagos de una venta.
- Consultar pagos realizados y saldo pendiente.
- Consultar el lote del cliente directamente en el mapa.

## 11. Requisitos no funcionales

**Seguridad.** Las funcionalidades privadas requerirán autenticación y autorización por rol. Un
cliente solamente podrá consultar información relacionada con sus propias operaciones.

**Validaciones.** Campos obligatorios, precios y montos válidos, lotes existentes, geometrías
válidas, prevención de reservas/ventas duplicadas y control del saldo.

**Persistencia.** Proyectos, lotes, geometrías, clientes, reservas, ventas, planes de pago, cuotas
y pagos deberán persistirse en base de datos.

**Consistencia.** Las operaciones críticas deberán ser atómicas. Registrar una venta y cambiar el
lote a VENDIDO no deberá dejar estados parciales si ocurre un error.

**Rendimiento.** La consulta del mapa deberá mantenerse utilizable al visualizar múltiples lotes.
La información comercial podrá cargarse bajo demanda al seleccionar un polígono.

**API.** Si existe frontend/backend separado, deberá utilizarse una API REST coherente para
proyectos, lotes, clientes, reservas, ventas y pagos.

## 12. Testing

El testing será uno de los principales criterios de evaluación. Las pruebas deberán comprobar las
reglas comerciales y financieras del sistema, no limitarse a CRUD o métodos triviales.

### Test unitarios

- Validar cambios permitidos de estado de un lote.
- Impedir reservar un lote que no esté DISPONIBLE.
- Impedir vender un lote ya VENDIDO.
- Calcular correctamente total pagado y saldo pendiente.
- Generar correctamente cuotas de un plan de pagos.
- Impedir pagos con montos inválidos.
- Impedir que el saldo resulte negativo.
- Validar vencimiento de reservas.
- Validar que una venta conserve el precio pactado.
- Validar reglas para cancelar una reserva y liberar el lote.

## 13. Test de integración

- Crear un proyecto y persistir sus datos.
- Crear/importar lotes y recuperar su geometría.
- Registrar un cliente.
- Reservar un lote y verificar el cambio de estado.
- Intentar reservar nuevamente el mismo lote y verificar el rechazo.
- Registrar una venta y comprobar que el lote pase a VENDIDO.
- Crear un plan de pagos y persistir sus cuotas.
- Registrar un pago y verificar actualización de cuota, total pagado y saldo.
- Consultar lotes filtrados por estado/proyecto.
- Comprobar permisos de administrador, asesor y cliente.
- Comprobar que un cliente no acceda a operaciones de otro cliente.

## 14. Test End-to-End (E2E)

- **E2E 01 - Crear proyecto:** administrador inicia sesión → crea proyecto → carga/dibuja lotes →
  asigna información → visualiza polígonos en el mapa.
- **E2E 02 - Reservar lote:** asesor abre mapa → selecciona lote DISPONIBLE → registra cliente →
  crea reserva → verifica que el lote cambie a RESERVADO.
- **E2E 03 - Evitar reserva duplicada:** un lote ya está reservado → otro usuario intenta
  reservarlo → sistema rechaza la operación.
- **E2E 04 - Venta:** asesor selecciona lote → cliente → registra venta → verifica estado VENDIDO
  y detalle de operación.
- **E2E 05 - Plan de pagos:** se registra venta financiada → se genera cronograma → se registra un
  pago → se verifica cuota PAGADA y nuevo saldo.
- **E2E 06 - Liberar reserva:** se cancela una reserva sin venta → el lote vuelve a DISPONIBLE y
  puede seleccionarse nuevamente.
- **E2E 07 - Portal/consulta cliente:** cliente inicia sesión → consulta su lote → visualiza
  ubicación en mapa → plan de pagos → pagos y saldo.
- **E2E 08 - Control de acceso:** usuario intenta acceder a una operación sin permisos → sistema
  bloquea correctamente el acceso.

## 15. Checklist de evaluación

Durante la presentación se verificará el cumplimiento de los siguientes puntos.

### Funcionalidad

- [ ] Gestión de etapas/manzanos
- [ ] Creación de proyectos
- [ ] Carga de archivo KML
- [ ] Dibujo/edición de polígonos
- [ ] Visualización de lotes en mapa
- [ ] Detalle de lote desde el mapa
- [ ] Superficie/dimensiones del lote
- [ ] Precio del lote
- [ ] Estados DISPONIBLE/RESERVADO/VENDIDO
- [ ] Filtro de lotes por estado
- [ ] Registro de clientes
- [ ] Reserva de lote
- [ ] Prevención de reserva duplicada
- [ ] Cancelación/vencimiento de reserva
- [ ] Liberación del lote
- [ ] Registro de venta
- [ ] Conservación del precio pactado
- [ ] Cambio automático a VENDIDO
- [ ] Venta financiada
- [ ] Creación de plan de pagos
- [ ] Generación de cuotas
- [ ] Registro de pagos
- [ ] Total pagado
- [ ] Saldo pendiente
- [ ] Historial de pagos
- [ ] Consulta de operaciones del cliente
- [ ] Control de acceso por roles
- [ ] Persistencia en base de datos

### Testing

- [ ] Existen test unitarios
- [ ] Unitarios prueban reglas reales
- [ ] Mocks/stubs cuando corresponde
- [ ] Asserts utilizados correctamente
- [ ] Casos positivos y negativos
- [ ] Test de estados del lote
- [ ] Test de reserva duplicada
- [ ] Test de venta duplicada
- [ ] Test de plan de pagos
- [ ] Test de cálculo de saldo
- [ ] Test de liberación de reserva
- [ ] Existen test de integración
- [ ] Integración con base de datos
- [ ] Se prueban endpoints/API
- [ ] Se prueba autenticación/autorización
- [ ] Test de reserva + estado
- [ ] Test de venta + estado
- [ ] Test de pago + saldo
- [ ] Existen E2E automatizados
- [ ] E2E de proyecto/mapa
- [ ] E2E de reserva
- [ ] E2E de reserva duplicada
- [ ] E2E de venta
- [ ] E2E de plan de pagos
- [ ] E2E de liberación
- [ ] E2E de consulta cliente
- [ ] E2E de control de acceso
- [ ] Todos los tests pueden ejecutarse nuevamente
