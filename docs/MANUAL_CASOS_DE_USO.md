# Manual de casos de uso

Para aprender qué hace el sistema usándolo, sin saber nada del proyecto. Son 16 casos cortos: en
cada uno haces unos pasos en el navegador y comparas lo que ves con el resultado esperado.

- **Hazlos en orden y sin reiniciar entre uno y otro.** Cada caso usa lo que dejó el anterior, y
  los resultados esperados están calculados así.
- Todos los pasos y resultados se ensayaron el 2026-11-25 sobre `main`, en este mismo orden.
- Las fechas que verás dependen del día en que arranques la aplicación; por eso aquí se dicen como
  «en 7 días» y no con día y mes.
- Al final de cada caso dice qué regla demuestra y qué prueba automática la cubre. Eso se usa en
  la etapa siguiente, cuando se estudie el código.

## 1. Antes de empezar

### Arrancar la aplicación

1. Abre una terminal en la carpeta del proyecto (en VS Code: menú *Terminal → Nuevo terminal*).
2. Escribe `npm run dev:pruebas` y pulsa Enter.
3. Espera a que aparezca la línea
   `[api] API lista en http://localhost:3000/api  ·  base: PostgreSQL en memoria  ·  modo: pruebas`.
4. Abre <http://localhost:5173> en Chrome o Edge.

Para detenerla: clic en la terminal y `Ctrl + C`.

`dev:pruebas` arranca todo con una base de datos **en memoria**: no necesita Neon ni
configuración, y carga sola los datos de demostración. Nada de lo que hagas queda guardado al
detenerla.

### Volver a empezar

Si te equivocas o los datos ya no coinciden con el manual: detén la aplicación con `Ctrl + C`,
vuelve a ejecutar `npm run dev:pruebas`, recarga la página (F5) e inicia sesión otra vez. Los datos
vuelven a ser los del inicio y hay que repetir los casos desde el CU-03.

### El mapa se ve oscuro y con un aviso de Google

Es normal: el proyecto no tiene configurada una clave de Google Maps. El mapa necesita internet.

- Sobre el mapa aparece el cuadro «Esta página no puede cargar Google Maps correctamente». Pulsa
  **Aceptar** y desaparece. Vuelve a salir cada vez que se carga un mapa.
- El texto «For development purposes only» se queda; no molesta.
- Un lote se puede elegir de dos formas: clic sobre él en el mapa o clic en su fila de la lista
  de la izquierda. Las dos hacen lo mismo.

### Usuarios de demostración

En la pantalla de inicio de sesión hay cuatro botones que completan el correo y la contraseña.

| Botón | Persona | Correo | Contraseña | Rol |
|---|---|---|---|---|
| Administrador | Rodrigo Aguilera | `admin@lotes.bo` | `admin123` | Administrador |
| Asesor | Laura Vargas | `asesor@lotes.bo` | `asesor123` | Asesor comercial |
| Asesor 2 | Carlos Méndez | `asesor2@lotes.bo` | `asesor123` | Asesor comercial |
| Cliente | María René Banzer | `cliente@lotes.bo` | `cliente123` | Cliente |
| (se escribe a mano) | Juan Pablo Justiniano | `cliente2@lotes.bo` | `cliente123` | Cliente |

Para cambiar de usuario: **Salir** (arriba a la derecha) y entra con otro. Cada pestaña del
navegador tiene su propia sesión, así que dos pestañas pueden tener dos usuarios distintos.

## 2. Ideas básicas

| Palabra | Qué es |
|---|---|
| Proyecto | Una urbanización. Nace en **Borrador** (solo lo ve el administrador) y pasa a **Publicado** (lo ven los asesores y se puede vender) |
| Lote | Un terreno dentro de un proyecto, dibujado como polígono. Tiene código (A-05), manzano, etapa, superficie, dimensiones y precio de lista |
| Cliente | La persona que reserva o compra. Se identifica por su documento (CI o NIT), que no se puede repetir |
| Reserva | Aparta un lote para un cliente, que paga un anticipo de al menos el 10 % del precio. Estados: Activa, Vencida, Cancelada, Convertida (terminó en venta) |
| Venta | La compra del lote. Puede ser **Al contado** o con **Crédito financiado**. Estados: Vigente o Anulada |
| Precio pactado | El precio acordado en esa venta. Queda guardado en la venta y no cambia aunque cambie el precio del lote |
| Plan de pagos | Las cuotas de una venta: la cuota inicial (número 0) y las cuotas mensuales |
| Cuota | Una parte del plan. Estados: Pendiente, Pagada o Vencida |
| Pago | Dinero que se registra contra una cuota. No se borra: el administrador lo anula con un motivo |
| Saldo | Precio pactado menos los pagos válidos. Se calcula, nunca es negativo |

Estados de un lote y sus colores en el mapa:

```
DISPONIBLE (verde) ──reservar──► RESERVADO (ámbar) ──vender──► VENDIDO (rojo)
    │  ▲                              │                           │
    │  └──── cancelar / vencer ───────┘                           │
    │  ▲                                                          │
    │  └───────────────────── anular venta ───────────────────────┘
    └── bloquear ──► BLOQUEADO (gris) ── desbloquear ──► DISPONIBLE
```

Un lote disponible también se puede vender directamente, sin reserva.

Qué puede hacer cada rol:

| Acción | Administrador | Asesor | Cliente |
|---|---|---|---|
| Ver proyectos publicados y su mapa | Sí | Sí | No |
| Ver proyectos en borrador, crear proyectos, dibujar e importar lotes, cambiar precios, bloquear | Sí | No | No |
| Registrar clientes, reservar, cancelar reservas, vender, registrar pagos | Sí | Sí | No |
| Anular pagos y ventas, usuarios, reportes | Sí | No | No |
| Ver sus propias compras, su plan de pagos y su saldo | No tiene | No tiene | Sí |

## 3. La pantalla del mapa

Es la pantalla principal. Tiene tres zonas:

- **Izquierda, el proyecto:** nombre, estado, cuatro contadores (Disponible, Reservado, Vendido,
  Bloqueado), los filtros, la lista de lotes y el «Resumen por etapa y manzano».
- **Centro, el mapa:** los lotes pintados según su estado y, abajo, la leyenda de colores. Arriba
  hay una barra: el administrador ve **Dibujar lote**, **Importar KML** y **Dibujar perímetro**.
- **Derecha, el lote:** aparece al elegir un lote. Muestra sus datos y los botones de lo que se
  puede hacer con él. Se cierra con la X.

Después de cada operación aparece un aviso corto con el resultado (por ejemplo, «Lote C-02
reservado para...»).

## 4. Casos de uso

### CU-01 · Iniciar sesión y conocer el menú

Usuario: Administrador.

1. Abre <http://localhost:5173>. Aparece «Urbanizaciones y Lotes» con el formulario.
2. Escribe `admin@lotes.bo` y la contraseña `mala`. Pulsa **Ingresar**.
3. Ahora pulsa el botón **Administrador** de abajo y luego **Ingresar**.

Resultado esperado:

- En el paso 2: «Correo o contraseña incorrectos.»
- En el paso 3 entras a la página «Proyectos». Arriba a la derecha: Rodrigo Aguilera,
  Administrador.
- Menú: Proyectos y mapa, Clientes, Reservas, Ventas y pagos, Reportes, Usuarios.
- Dos proyectos: «Condominio Las Palmeras» (Borrador, 4 lotes) y «Urbanización Los Jardines del
  Urubó» (Publicado, 22 lotes, 16 disponibles).

Qué demuestra: las funciones privadas piden autenticación (consigna §11).

### CU-02 · Recorrer el mapa de un proyecto

Usuario: Administrador. No cambia ningún dato.

1. Clic en «Urbanización Los Jardines del Urubó». Cierra el aviso de Google con **Aceptar**.
2. Mira los contadores: Disponible 16, Reservado 2, Vendido 3, Bloqueado 1.
3. En el filtro **Estado: todos** elige *Reservado*. Luego vuelve a *Estado: todos*.
4. En **Etapa: todas** elige *Etapa 2*. Luego vuelve a *Etapa: todas*.
5. En la casilla **Código** escribe `B-0`. Luego bórralo.
6. Haz clic en el contador **Vendido**. Luego vuelve a *Estado: todos*.
7. Abre **Resumen por etapa y manzano**, debajo de la lista.
8. Elige uno por uno los lotes C-02, A-03, A-05 y C-06 y lee el panel de la derecha.

Resultado esperado:

- Paso 3: en la lista y en el mapa quedan solo A-03 y B-05.
- Paso 4: quedan C-01 a C-06. Paso 5: quedan B-01 a B-08. Paso 6: quedan A-05, A-08 y B-02.
- Paso 7: una tabla por etapa y manzano (A: 8 lotes, B: 8, C: 6) y la línea «Superficie total
  8.010 m² · disponible a la venta Bs 1.086.000».
- Paso 8:

| Lote | Estado | Qué muestra el panel |
|---|---|---|
| C-02 | Disponible | Manzano C, Etapa 2, 375 m², 15 x 25 m, Bs 60.000. Botones **Reservar** y **Vender** |
| A-03 | Reservado | «Reservado para María René Banzer», vence en 7 días, «Anticipo: Bs 7.200 · TRANSFERENCIA». Botones **Vender a María** y **Cancelar reserva** |
| A-05 | Vendido | «Vendido a María René Banzer», Crédito financiado, precio pactado Bs 75.000, pagado Bs 20.000, saldo Bs 55.000. Botón **Ver plan de pagos**. No ofrece reservar ni vender |
| C-06 | Bloqueado | Ningún botón comercial (ni **Reservar** ni **Vender**). En «Administración del lote»: **Desbloquear** y **Eliminar**, además de los dos de edición |

- Como administrador, además ves el bloque «Administración del lote». Siempre tiene **Editar datos
  y precio** y **Editar forma**; **Bloquear** aparece solo en lotes disponibles, **Desbloquear** solo
  en bloqueados y **Eliminar** solo en disponibles o bloqueados. Por eso C-02 muestra **Bloquear** y
  **Eliminar**, A-03 y A-05 solo los dos de edición, y C-06 **Desbloquear** y **Eliminar**.
- Aunque C-02 ofrece **Eliminar**, el servidor lo rechaza porque ese lote tuvo una reserva: solo se
  elimina un lote que nunca tuvo reservas ni ventas (ver CU-04).

Qué demuestra: mapa con estados por color, detalle del lote desde el mapa, filtros por estado,
etapa y manzano (consigna §4, §5 y §10).

### CU-03 · Crear un proyecto, importar sus lotes y publicarlo

Usuario: Administrador.

1. Menú **Proyectos y mapa** → **Nuevo proyecto**.
2. Nombre: `Urbanización El Mirador`. Ubicación: `Warnes - Santa Cruz`. Descripción: `Proyecto de
   práctica.` Pulsa **Guardar**.
3. Entras al mapa del proyecto nuevo, vacío y en Borrador. Pulsa **Importar KML**.
4. Pulsa **Usar KML de ejemplo**. Debe decir «Seleccionado: urbanizacion_el_mirador.kml (ejemplo)».
5. En **Precio por defecto (Bs)** escribe `50000`. Pulsa **Importar**.
6. Pulsa **Publicar** (panel izquierdo) y, en la confirmación, otra vez **Publicar**.

Resultado esperado:

- Paso 3: «Este proyecto todavía no tiene lotes. Use «Dibujar lote» para marcarlos sobre el mapa o
  importe un archivo KML.»
- Paso 5: aviso «Se importaron 8 lotes y el perímetro del proyecto...». Aparecen M1-01 a M1-08,
  los ocho disponibles.
- M1-06 y M1-07 valen Bs 50.000: el archivo no traía su precio y tomaron el precio por defecto.
  Los demás conservan el suyo (M1-01, Bs 55.000).
- Paso 6: aviso «Proyecto publicado.», el estado pasa a Publicado y el botón **Publicar**
  desaparece.

Qué demuestra: creación de proyectos y carga de lotes desde KML (consigna §3 y §4). Un KML es un
archivo con los polígonos de los lotes; si alguno tiene errores, no se importa ninguno.

### CU-04 · Dibujar un lote y administrarlo

Usuario: Administrador.

1. **Proyectos y mapa** → «Condominio Las Palmeras» (Borrador). Cierra el aviso de Google.
2. Mira la lista: P-04 dice «Sin precio».
3. Pulsa **Dibujar lote**. Sale el contador «0 vértices».
4. Haz clic en cuatro puntos de una zona libre del mapa (por ejemplo, debajo de los lotes), uno
   por cada esquina de un rectángulo. Hazlo con calma: un clic, mira que el contador suba, y el
   siguiente. Si un punto sale mal, **Deshacer punto**.
5. Con «4 vértices», pulsa **Terminar polígono**.
6. Código: `P-05`. Precio: `90000`. Pulsa **Guardar lote**.
7. En el panel del lote: **Editar datos y precio** → Manzano `1`, Precio `92000` → **Guardar lote**.
8. Pulsa **Bloquear**. Luego **Desbloquear**.
9. Pulsa **Editar forma**, lee el aviso y pulsa **Cancelar**.
10. Pulsa **Eliminar** y confirma con **Eliminar**.
11. Pulsa otra vez **Dibujar lote** y ahora haz los cuatro clics encima de los lotes que ya existen
    (P-01 a P-04). **Terminar polígono** → Código `P-09`, Precio `90000` → **Guardar lote**. Después
    pulsa **Cancelar**.

Resultado esperado:

- Paso 5: se abre «Datos del nuevo lote» con la línea «Polígono válido · superficie calculada ...
  m²»: la superficie y las dimensiones las calcula el sistema a partir de tu dibujo.
- Paso 6: aviso «Lote P-05 creado.» El panel avisa: «El proyecto está en BORRADOR: publíquelo
  para poder reservar o vender sus lotes.» No hay botones Reservar ni Vender.
- Paso 7: «Lote P-05 actualizado.» y precio de lista Bs 92.000.
- Paso 8: «Lote P-05: bloqueado.» (se pinta gris) y luego «Lote P-05: desbloqueado.»
- Paso 9: «Editando la forma de P-05: arrastre los vértices...». Guardar una forma nueva no se
  ensayó para este manual; cancelar sí.
- Paso 10: «Lote P-05 eliminado.» Solo se puede eliminar un lote que nunca tuvo reservas ni ventas.
- Paso 11: el sistema no lo guarda y avisa en la misma ventana: «El lote P-09 se superpone con el
  lote P-02. Dos lotes pueden compartir un lado, pero no ocupar el mismo terreno.» El lote que
  nombra depende de dónde dibujaste. Dos lotes vecinos, que solo comparten un lado, sí se aceptan.

Qué demuestra: dibujo y edición de polígonos, superficie calculada, que dos lotes no pueden ocupar
el mismo terreno, y que un lote sin precio o de un proyecto en borrador no se puede comercializar
(consigna §4, §5 y §11).

### CU-05 · Reservar un lote para un cliente nuevo

Usuario: Asesor (Laura Vargas). Pulsa **Salir** y entra con el botón **Asesor**.

1. Fíjate en el menú: no tiene Reportes ni Usuarios. En Proyectos no aparece Las Palmeras (está
   en borrador) y sí El Mirador, que publicaste.
2. Abre «Urbanización Los Jardines del Urubó» y elige el lote **C-02**.
3. Pulsa **Reservar** → **Nuevo cliente**.
4. Nombre completo: `Carla Rojas Méndez`. Documento: `9000001`. Teléfono: `70000001`. Pulsa
   **Guardar cliente**.
5. De vuelta en la reserva, el cliente elegido es «Carla Rojas Méndez (9000001)». La fecha de
   vencimiento viene puesta a 7 días; déjala.
6. El campo **Anticipo (Bs)** viene con 6000: es el mínimo, el 10 % del precio del lote. Cámbialo
   a `0` y pulsa **Confirmar reserva**. Lee el error.
7. Cámbialo a `2000` y pulsa **Confirmar reserva**. Lee el error.
8. Pon el anticipo en `6000` y pulsa **Confirmar reserva**.
9. Recarga la página (F5).

Resultado esperado:

- Paso 6: «El anticipo de la reserva debe ser mayor a 0 (mínimo Bs 0,01) y tener como máximo 2
  decimales.» El lote sigue disponible: no se puede reservar gratis.
- Paso 7: «El anticipo (Bs 2.000,00) debe ser al menos el 10 % del precio del lote
  (Bs 6.000,00).» Tampoco se reserva con un monto simbólico.
- Paso 8: aviso «Lote C-02 reservado para Carla Rojas Méndez.» El lote se pinta ámbar.
- Contadores: Reservado 3, Disponible 15.
- Panel: «Reservado para Carla Rojas Méndez», la línea «Anticipo: Bs 6.000 · EFECTIVO» y los
  botones **Vender a Carla** y **Cancelar reserva**. Ya no ofrece **Reservar**.
- Tras recargar sigue reservado: quedó guardado en la base de datos.
- El asesor no ve «Administración del lote».

Qué demuestra: solo un lote disponible se reserva, reservar exige un anticipo de al menos el
10 % del precio, y al reservar el lote cambia de estado (consigna §5 y §7). Es el flujo del E2E 02.

### CU-06 · Consultar y registrar clientes

Usuario: Asesor.

1. Menú **Clientes**. Están los cuatro clientes de demostración y Carla.
2. En el buscador escribe `pedro`. Luego bórralo.
3. **Registrar cliente** → Nombre `Cliente Repetido`, Documento `4839201`, Teléfono `70000002` →
   **Guardar cliente**. Después pulsa **Cancelar**.
4. Haz clic en el nombre «María René Banzer».

Resultado esperado:

- Paso 2: queda solo Pedro Suárez Antelo.
- Paso 3: «Ya existe un cliente con el documento 4839201.» No se guarda.
- Paso 4: la ficha de María: compras vigentes 1, saldo total pendiente Bs 55.000, su venta del lote
  A-05 y su reserva activa de A-03.

Qué demuestra: registro de clientes y que un cliente puede tener varias operaciones (consigna §6
y §10).

### CU-07 · Dos asesores quieren reservar el mismo lote

Usuarios: Asesor en una pestaña y Asesor 2 en otra. Es la regla más importante del sistema.

1. Pestaña 1 (Asesor): abre Los Jardines y elige el lote **C-01**. Está disponible.
2. Abre una pestaña nueva (`Ctrl + T`), entra a <http://localhost:5173> y pulsa **Asesor 2** →
   **Ingresar**. Abre Los Jardines y elige también **C-01**. No hagas nada más aquí todavía.
3. Pestaña 1: **Reservar** → cliente «Ana Lucía Rojas (5512893)» → **Confirmar reserva**.
4. Pestaña 2, sin recargar (ahí C-01 todavía se ve disponible): **Reservar** → cliente «Pedro
   Suárez Antelo (7340012)» → **Confirmar reserva**.
5. Pulsa **Cancelar** en esa ventana y cierra la pestaña 2.

Resultado esperado:

- Paso 3: C-01 queda reservado para Ana.
- Paso 4: el sistema rechaza la segunda reserva con «El lote C-01 no está disponible para reservar
  (estado actual: RESERVADO).» y el mapa de la pestaña 2 se actualiza solo a ámbar.
- Existe una sola reserva de C-01.

Qué demuestra: el sistema impide que dos usuarios reserven a la vez el mismo lote (consigna §7,
la «regla crítica»). La decisión la toma el servidor, no la pantalla. Es el flujo del E2E 03.

### CU-08 · Cancelar una reserva y ver las vencidas

Usuario: Asesor (pestaña 1).

1. Con el lote **C-01** elegido, pulsa **Cancelar reserva**.
2. Motivo: `La clienta desistió de la compra.` Pulsa **Cancelar reserva**.
3. Elige el lote **C-03** y mira su estado.
4. Menú **Reservas**. Recorre las pestañas Activas, Vencidas, Canceladas y Convertidas en venta.

Resultado esperado:

- Paso 2: aviso «Reserva cancelada: el lote C-01 está disponible.» C-01 vuelve a verde y ofrece
  otra vez **Reservar**.
- Paso 3: C-03 está disponible. Tuvo una reserva que venció hace 3 días y el sistema lo liberó
  solo.

| Pestaña | Qué hay |
|---|---|
| Activas | 3: C-02 (Carla), B-05 (Pedro) y A-03 (María) |
| Vencidas | C-03, con el texto «Venció el plazo de la reserva» |
| Canceladas | 2: C-01, con tu motivo, y una antigua de C-02 |
| Convertidas en venta | A-08: una reserva que terminó en venta |

- Cada fila tiene **Ver en mapa**, que abre el mapa con ese lote elegido.

Qué demuestra: cancelar o vencer una reserva devuelve el lote a disponible (consigna §5 y §7). Es
el flujo del E2E 06.

### CU-09 · Vender un lote al contado

Usuario: Asesor.

1. **Proyectos y mapa** → Los Jardines → lote **A-01** (Bs 78.000) → **Vender**.
2. Cliente comprador: «Ana Lucía Rojas (5512893)».
3. El precio pactado viene con el precio de lista, 78000. Déjalo.
4. En Modalidad de pago viene marcado Crédito financiado: marca **Al contado**.
5. Pulsa **Confirmar venta**.
6. En el panel del lote pulsa **Ver plan de pagos**.

Resultado esperado:

- Paso 5: aviso «Venta registrada: lote A-01 vendido a Ana Lucía Rojas.» El lote se pinta rojo.
  El panel dice «Vendido a Ana Lucía Rojas», precio pactado Bs 78.000, pagado Bs 78.000, saldo
  Bs 0, y ya no ofrece reservar ni vender.
- Paso 6: la página «Plan de pagos · Lote A-01», venta N° 4, estado Vigente, con el texto «Venta
  pagada en su totalidad». El cronograma tiene una sola fila, «Pago al contado», Pagada. El
  historial tiene un pago de Bs 78.000.

Qué demuestra: al confirmar la venta el lote pasa a vendido, y un lote vendido no se vuelve a
vender (consigna §5 y §8). Es el flujo del E2E 04.

### CU-10 · Vender con crédito financiado y registrar pagos

Usuario: Asesor. Es el caso más largo: reúne las reglas del dinero.

1. **Proyectos y mapa** → Los Jardines → lote **A-02** (Bs 72.000) → **Vender**.
2. Cliente: «Ana Lucía Rojas (5512893)». Modalidad: **Crédito financiado** (ya viene marcado).
3. El sistema sugiere cuota inicial 14400 y 12 cuotas. Cambia la cuota inicial a `80000` y lee el
   error. Luego déjala en `12000`.
4. Mira el recuadro «Plan de pagos» y pulsa **Confirmar venta**.
5. **Ver plan de pagos**.
6. En la fila de la Cuota 1, **Registrar pago**. El monto viene con 5000. Pulsa **Registrar pago**.
7. En la fila de la Cuota 2, **Registrar pago**, y prueba estos montos uno tras otro, pulsando
   **Registrar pago** cada vez: `0`, luego `55000.01`, luego `6000`, y al final `2000`.

Resultado esperado:

- Paso 3: «La cuota inicial debe ser menor al precio pactado.»
- Paso 4: «Cuota inicial: Bs 12.000 — se registra como pagada al confirmar la venta», las cuotas de
  Bs 5.000 y «12 cuotas mensuales · saldo a financiar Bs 60.000». Con más de 8 cuotas, la vista
  previa abrevia la tabla: muestra las cuotas 1 a 5, una fila «…» y las cuotas 11 y 12.
- Paso 5: precio pactado Bs 72.000, pagado Bs 12.000, saldo pendiente Bs 60.000, «1 de 13 cuotas
  pagadas». El cronograma tiene la cuota inicial (Pagada) y las cuotas 1 a 12 (Pendiente), una por
  mes.
- Paso 6: aviso «Pago registrado. Nuevo saldo: Bs 55.000.» La cuota 1 queda Pagada y pierde su
  botón. Pagado Bs 17.000, saldo Bs 55.000.
- Paso 7:

| Monto | Qué responde |
|---|---|
| 0 | «El monto del pago debe ser mayor a 0 (mínimo Bs 0,01) y tener como máximo 2 decimales.» |
| 55000.01 | «El pago (Bs 55000.01) supera el saldo pendiente de la venta (Bs 55000).» |
| 6000 | «El pago (Bs 6000) supera lo pendiente de la cuota 2 (Bs 5000).» |
| 2000 | Se acepta: es un pago parcial. La cuota 2 sigue Pendiente, con Bs 2.000 pagados y Bs 3.000 pendientes |

- Al final: pagado Bs 19.000, saldo Bs 53.000, y tres pagos en el historial.
- El asesor no ve ningún botón **Anular**.

Qué demuestra: generación de cuotas, pagos con montos inválidos rechazados, saldo que nunca queda
negativo, y saldo = precio pactado − pagos (consigna §9). Es el flujo del E2E 05.

### CU-11 · Vender un lote que ya estaba reservado

Usuario: Asesor.

1. **Proyectos y mapa** → Los Jardines → lote **B-05**. Está reservado para Pedro Suárez Antelo.
2. Pulsa **Vender a Pedro**.
3. Mira el campo Cliente comprador. Marca **Al contado** y pulsa **Confirmar venta**.
4. Pulsa **Ver plan de pagos** y mira el «Historial de pagos».
5. Menú **Reservas** → pestaña **Convertidas en venta**.
6. Menú **Ventas y pagos**.

Resultado esperado:

- Paso 3: el comprador viene fijo, «Pedro Suárez Antelo (7340012) — tiene la reserva del lote», y
  no se puede elegir a otra persona. Debajo dice «Anticipo ya cobrado: Bs 7.000. Se descuenta de
  lo que se cobra al firmar.» Tras confirmar, B-05 queda vendido a Pedro.
- Paso 4: pagado Bs 70.000 y saldo Bs 0, pero con dos pagos: «Anticipo de la reserva» por
  Bs 7.000 y «Cobrado al registrar la venta» por Bs 63.000. El anticipo no se cobra dos veces.
- Paso 5: aparecen B-05 y A-08.
- Paso 6: seis ventas vigentes: A-05, B-02, A-08, A-01, A-02 y B-05. La de B-02 avisa «1 cuota
  vencida». Los filtros son Proyecto, Cliente y Estado (Vigentes, Anuladas, Todas).

Qué demuestra: un lote reservado solo se vende al cliente de la reserva, la reserva queda
convertida y su anticipo se descuenta de lo que se cobra al firmar (consigna §8).

### CU-12 · El precio pactado no cambia

Usuario: Administrador. Pulsa **Salir** y entra con **Administrador**.

1. **Proyectos y mapa** → Los Jardines → lote **A-02** (el que vendiste a crédito por Bs 72.000).
2. **Editar datos y precio** → Precio `99000` → **Guardar lote**.
3. Lee el panel del lote.

Resultado esperado:

- Aviso «Lote A-02 actualizado.»
- Precio de lista: Bs 99.000. Pero en la venta: precio pactado Bs 72.000 y saldo Bs 53.000, igual
  que antes.

Qué demuestra: la venta conserva su precio pactado aunque después cambie el precio del lote
(consigna §8).

### CU-13 · Anular un pago y anular una venta

Usuario: Administrador. Solo este rol puede anular.

1. Menú **Ventas y pagos** → fila A-02 → **Plan de pagos**.
2. En «Historial de pagos», fila de la Cuota 2 por Bs 2.000, pulsa **Anular**.
3. Pulsa **Anular pago** sin escribir motivo. Luego escribe `Depósito rechazado por el banco.` y
   pulsa **Anular pago**.
4. Vuelve con **Ventas** (arriba a la izquierda) → fila A-01 → **Plan de pagos**.
5. Pulsa **Anular venta**. Motivo: `El cliente desistió de la compra.` Pulsa **Anular venta**.
6. Vuelve a **Ventas** y cambia el filtro Estado a *Anuladas*.
7. **Proyectos y mapa** → Los Jardines y mira el lote A-01.

Resultado esperado:

- Paso 3: sin motivo no deja continuar. Con motivo: aviso «Pago anulado.», pagado Bs 17.000,
  saldo Bs 55.000. El pago no desaparece: sigue en el historial con estado Anulado, la fecha,
  quién lo anuló y el motivo.
- Paso 5: la venta queda Anulada, con el texto «Venta anulada el ... por Rodrigo Aguilera. Motivo:
  El cliente desistió de la compra.» Sus pagos se conservan.
- Paso 6: A-01 ya no está entre las vigentes y sí entre las anuladas.
- Paso 7: A-01 volvió a verde, Disponible.

Qué demuestra: un pago no se borra, se anula dejando rastro, y el saldo se recalcula; al anular
una venta el lote se libera (consigna §5 y §9).

### CU-14 · El portal del cliente

Usuario: Cliente (María René Banzer). Pulsa **Salir** y entra con **Cliente**.

1. Entras directo a «Mis lotes». El menú solo tiene esa opción.
2. Lee «Mis compras» y «Mis reservas».
3. Haz clic en la tarjeta del lote A-05 y mira el mapa.
4. Pulsa **Ver plan de pagos y pagos**.
5. **Salir**. Entra escribiendo `cliente2@lotes.bo` y `cliente123`.

Resultado esperado:

- Paso 2: compra del lote A-05: precio Bs 75.000, pagado Bs 20.000, saldo Bs 55.000 y la próxima
  cuota de Bs 5.000. Reserva activa del lote A-03, con «Anticipo pagado: Bs 7.200». No aparece ninguna operación de
  otro cliente.
- Paso 3: el mapa muestra solo sus lotes y ubica A-05.
- Paso 4: su cronograma: cuota inicial y cuota 1 Pagadas, cuotas 2 a 12 Pendientes, y su
  historial con dos pagos. No tiene botones para registrar pagos.
- Paso 5: Juan Pablo ve su lote B-02: pagado Bs 13.000, saldo Bs 55.000 y la próxima cuota de
  Bs 2.500 marcada «(vencida)».

Qué demuestra: el cliente consulta su lote en el mapa, su plan, sus pagos y su saldo (consigna
§10). Los números de María son el ejemplo del PDF de la consigna. Es el flujo del E2E 07.

### CU-15 · Control de acceso

Usuarios: Cliente, nadie y Asesor.

1. Entra con **Cliente**. En la barra de direcciones escribe `http://localhost:5173/usuarios`.
2. Pulsa **Volver al inicio**. Prueba igual con `http://localhost:5173/ventas/2` (la venta de
   otro cliente) y con `http://localhost:5173/proyectos`.
3. Pulsa **Salir**. Sin iniciar sesión, escribe `http://localhost:5173/proyectos`.
4. Entra con **Asesor** y escribe `http://localhost:5173/usuarios` y luego
   `http://localhost:5173/reportes`.

Resultado esperado:

- Pasos 1 y 2: las tres veces, «Acceso denegado. Su rol no tiene permiso para ver esta página.»
  **Volver al inicio** lo lleva a «Mis lotes».
- Paso 3: te devuelve a la pantalla de inicio de sesión.
- Paso 4: «Acceso denegado» en las dos.

Qué demuestra: autorización por rol, y que un cliente solo ve sus propias operaciones (consigna
§11). No basta con esconder el menú: el servidor también rechaza. Es el flujo del E2E 08.

### CU-16 · Usuarios y reportes

Usuario: Administrador.

1. Menú **Usuarios** → **Nuevo usuario**.
2. Nombre `Ana Lucía Rojas`, Correo `ana@lotes.bo`, Contraseña `ana12345`, Rol *Cliente*. Aparece
   «Cliente vinculado»: elige «Ana Lucía Rojas (5512893)». Pulsa **Crear usuario**.
3. En la fila de Carlos Méndez (`asesor2@lotes.bo`) pulsa **Desactivar**.
4. En una pestaña nueva intenta entrar con **Asesor 2**. Cierra esa pestaña.
5. De vuelta, pulsa **Activar** en la fila de Carlos.
6. Menú **Reportes**.

Resultado esperado:

- Paso 2: «Usuario creado.» Si entras con esa cuenta, Ana ve solo sus compras (A-02 y A-08).
- Paso 3: Carlos queda Inactivo. Tu propia fila no tiene botón para desactivarte.
- Paso 4: «Su usuario está desactivado. Contacte al administrador.»
- Paso 6, si hiciste todos los casos en orden:

| Indicador | Valor |
|---|---|
| Monto vendido (ventas vigentes) | Bs 367.000 |
| Total cobrado (ventas vigentes) | Bs 202.000 |
| Saldo por cobrar (ventas vigentes) | Bs 165.000 |
| Monto en cuotas vencidas | Bs 2.500 |

- Fila de Los Jardines: 22 lotes, 14 disponibles, 2 reservados, 5 vendidos, 1 bloqueado.
- Con los datos recién cargados, sin hacer ningún caso, los valores son Bs 225.000, Bs 115.000,
  Bs 110.000 y Bs 2.500.

Compruébalo a mano: el monto vendido es la suma de los precios pactados de las cinco ventas
vigentes (75.000 + 68.000 + 82.000 + 72.000 + 70.000 = 367.000). La venta anulada de A-01 no
cuenta.

Qué demuestra: administración de usuarios y reportes del administrador (consigna §2).

## 5. Qué prueba automática cubre cada caso

Las E2E están en `e2e/tests/` y las unitarias en `backend/tests/unitarias/`.

| Caso | Consigna | Prueba E2E | Pruebas unitarias |
|---|---|---|---|
| CU-01 | §11 | (todas inician sesión) | `servicios/AuthServicio.test.ts` |
| CU-02 | §4, §5, §10 | — | `servicios/LoteServicio.test.ts`, `dominio/proyecto.test.ts` |
| CU-03 | §3, §4 | `e2e-01-crear-proyecto.spec.ts` | `servicios/ImportacionKmlServicio.test.ts`, `servicios/ProyectoServicio.test.ts` |
| CU-04 | §4, §5, §11 | `e2e-01-crear-proyecto.spec.ts` | `dominio/geometria.test.ts`, `dominio/superposicion.test.ts`, `dominio/lote.test.ts` |
| CU-05 | §5, §7 | `e2e-02-reservar-lote.spec.ts` | `dominio/lote.test.ts`, `dominio/reserva.test.ts`, `servicios/ReservaServicio.test.ts` |
| CU-06 | §6, §10 | — | `servicios/ClienteServicio.test.ts` |
| CU-07 | §7 | `e2e-03-reserva-duplicada.spec.ts` | `servicios/ReservaServicio.test.ts` |
| CU-08 | §5, §7 | `e2e-06-liberar-reserva.spec.ts` | `dominio/reserva.test.ts`, `servicios/ReservaServicio.test.ts` |
| CU-09 | §5, §8 | `e2e-04-venta.spec.ts` | `dominio/lote.test.ts`, `servicios/VentaServicio.test.ts` |
| CU-10 | §9 | `e2e-05-plan-de-pagos.spec.ts` | `dominio/planPagos.test.ts`, `servicios/PagoServicio.test.ts` |
| CU-11 | §8 | — | `dominio/lote.test.ts`, `dominio/venta.test.ts`, `servicios/VentaServicio.test.ts` |
| CU-12 | §8 | — (ver la nota debajo de la tabla) | `servicios/VentaServicio.test.ts` (en parte) |
| CU-13 | §5, §9 | — | `dominio/planPagos.test.ts`, `dominio/venta.test.ts`, `servicios/PagoServicio.test.ts`, `servicios/VentaServicio.test.ts` |
| CU-14 | §10 | `e2e-07-portal-cliente.spec.ts` | `servicios/PortalServicio.test.ts` |
| CU-15 | §11 | `e2e-08-control-de-acceso.spec.ts` | `dominio/permisos.test.ts` |
| CU-16 | §2 | — | `servicios/UsuarioServicio.test.ts`, `servicios/ReporteServicio.test.ts` |

**Pendiente (CU-12).** Ninguna prueba automática cambia el precio de lista de un lote después de
venderlo y verifica que la venta conserva su precio pactado, que es un ítem de la consigna §12
(«Validar que una venta conserve el precio pactado»). Lo más cercano: `VentaServicio.test.ts`
registra una venta con un precio pactado distinto del de lista, y el E2E 04 verifica que la venta
guarda el precio pactado al vender y lo conserva tras recargar la página.

## 6. Si algo no coincide

| Qué pasa | Qué hacer |
|---|---|
| Un número o un estado es distinto al del manual | Te saltaste un caso o repetiste uno. Reinicia los datos (sección 1) y empieza desde el CU-03 |
| `npm run dev:pruebas` dice que el puerto está en uso | Ya hay otra copia de la aplicación abierta. Ciérrala con `Ctrl + C` en su terminal |
| PowerShell dice que «la ejecución de scripts está deshabilitada en este sistema» | Escribe `npm.cmd` en lugar de `npm`: `npm.cmd run dev:pruebas` |
| El mapa queda en «Cargando Google Maps…» | No hay internet. El resto de la aplicación funciona, pero no se ven los lotes en el mapa |
| El aviso de Google tapa un lote | Pulsa **Aceptar** en el aviso, o elige el lote desde la lista de la izquierda |
| Al dibujar, un clic no suma un vértice | Dos clics muy seguidos cuentan como doble clic. Haz clic de nuevo, más despacio |
| El campo de monto no acepta `55000.01` | Escríbelo con coma: `55000,01` |
