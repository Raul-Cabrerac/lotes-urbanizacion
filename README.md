# Sistema de Gestión de Urbanizaciones y Lotes

Proyecto final de **Taller de Actualización V (Testing de Software)** · NUR · 2026.

Proyectos inmobiliarios con un **mapa de lotes sobre Google Maps**: cada lote es un polígono
dibujado sobre la imagen satelital (o importado de un KML), coloreado según su estado. Desde el
mapa se reserva, se vende, se arma el plan de pagos y se registran los pagos.

El código está listo para que el grupo escriba las pruebas unitarias, de integración y E2E de la
consigna: ver [docs/GUIA_TESTING.md](docs/GUIA_TESTING.md).

---

## 1. Cómo ejecutarlo

**Requisitos:** Node.js 22.12 o superior (`node --version`).

```bash
git clone https://github.com/Raul-Cabrerac/lotes-urbanizacion.git
cd lotes-urbanizacion
npm install
copy .env.example .env.local     # Windows (en macOS o Linux: cp). Completa las variables.
npm run dev
```

Abre **<http://localhost:5173>**. `npm run dev` levanta la API (`http://localhost:3000/api`) y la
web a la vez; `Ctrl + C` detiene todo.

| Variable en `.env.local` | Para qué | Guía |
|---|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | Tu rama de PostgreSQL en Neon | [docs/BASE_DE_DATOS.md](docs/BASE_DE_DATOS.md) |
| `VITE_GOOGLE_MAPS_API_KEY` | Clave de Google Maps (opcional en desarrollo) | [docs/GOOGLE_MAPS.md](docs/GOOGLE_MAPS.md) |

Sin `DATABASE_URL` la API usa PostgreSQL en memoria y avisa que los datos se pierden al cerrar.
Sin clave de Google el mapa funciona, oscurecido y con la marca "For development purposes only".

### Usuarios de demostración

| Rol | Correo | Contraseña | Qué puede hacer |
|---|---|---|---|
| Administrador | `admin@lotes.bo` | `admin123` | Todo: proyectos, dibujar e importar lotes, precios, usuarios, reportes, anular |
| Asesor comercial | `asesor@lotes.bo` | `asesor123` | Mapa, clientes, reservar, vender, registrar pagos |
| Asesor comercial 2 | `asesor2@lotes.bo` | `asesor123` | Igual; sirve para probar la reserva simultánea |
| Cliente | `cliente@lotes.bo` | `cliente123` | Solo sus lotes, su plan de pagos y su saldo |
| Cliente 2 | `cliente2@lotes.bo` | `cliente123` | Igual; tiene una cuota vencida |

Cada pestaña del navegador tiene su propia sesión: abre una con `asesor` y otra con `asesor2` para
probar la reserva duplicada.

### Comandos

| Comando | Para qué |
|---|---|
| `npm run dev` | API + web sobre tu rama de Neon, con recarga automática |
| `npm run dev:pruebas` | API + web con PostgreSQL en memoria (lo usan los E2E) |
| `npm run db:reset` | Deja tu rama de Neon como recién creada, con los datos demo |
| `npm run typecheck` | Revisa los tipos de backend, frontend y e2e |
| `npm run build` | Genera la versión de producción del frontend |
| `npm test` · `npm run test:unit` · `npm run test:integracion` · `npm run test:e2e` | Pruebas (las escribe el grupo) |

> **Antes de presentar:** `npm run db:reset`. Los datos demo usan fechas relativas al día en que se
> cargan (reservas que vencen en 3 y 7 días, una cuota vencida...).

---

## 2. Qué incluye (checklist de la consigna §15)

| Requisito | Dónde se ve |
|---|---|
| Creación de proyectos y gestión de etapas o manzanos | *Proyectos → + Nuevo proyecto*; cada lote tiene etapa y manzano, con filtros y resumen por manzano |
| Carga de archivo KML | Mapa → *📁 Importar KML* (botón "Usar KML de ejemplo") |
| Dibujo y edición de polígonos | Mapa → *✏️ Dibujar lote*: clic en cada esquina sobre Google Maps; detalle del lote → *Editar forma* |
| Visualización de lotes y detalle desde el mapa | Polígonos de colores; clic en un lote abre su detalle (cargado bajo demanda) |
| Superficie, dimensiones y precio | Se calculan del polígono y se pueden ajustar |
| Estados y filtro por estado | DISPONIBLE verde, RESERVADO ámbar, VENDIDO rojo, BLOQUEADO gris; contadores y filtros |
| Clientes, reserva y prevención de reserva duplicada | *Reservar* desde el lote, con "+ Nuevo cliente"; la segunda reserva simultánea se rechaza |
| Cancelación, vencimiento y liberación | *Cancelar reserva*; las vencidas se liberan solas |
| Venta, precio pactado y cambio a VENDIDO | *Vender* al contado o financiado; el precio pactado queda congelado |
| Plan de pagos, cuotas, pagos, total pagado, saldo e historial | *Ventas y pagos → plan de pagos*; anular pago con motivo (admin) |
| Consulta de operaciones del cliente | Portal *Mis lotes*, con su lote en el mapa |
| Control de acceso por roles | Menú y botones según el rol; la API responde 401 o 403 |
| Persistencia | PostgreSQL en Neon, con migraciones SQL |

### Guion de demostración (los 8 E2E de la consigna)

1. **E2E 01** · `admin`: *+ Nuevo proyecto* → *Dibujar perímetro* → *Dibujar lote* (clic en cada
   esquina y en el primer punto para cerrar) → código y precio → o *Importar KML* → *Publicar*.
2. **E2E 02** · `asesor`: abrir el proyecto → clic en un lote verde → *Reservar* →
   *+ Nuevo cliente* → *Confirmar reserva* → el lote se pinta ámbar.
3. **E2E 03** · `asesor` y `asesor2` abren el mismo lote disponible. El primero reserva; el
   segundo recibe el rechazo.
4. **E2E 04** · Lote → *Vender* → *Al contado* → queda rojo (VENDIDO) con el detalle de la venta.
5. **E2E 05** · Vender *Financiado* (cuota inicial + 12 cuotas) → *Ver plan de pagos* →
   *Registrar pago* de la cuota 1 → PAGADA y baja el saldo.
6. **E2E 06** · Lote reservado → *Cancelar reserva* → vuelve a DISPONIBLE.
7. **E2E 07** · `cliente`: *Mis lotes*, su lote A-05 en el mapa, plan de pagos y saldo
   (el ejemplo del PDF: precio Bs 75.000, pagado Bs 20.000, saldo Bs 55.000).
8. **E2E 08** · `cliente` entra a <http://localhost:5173/usuarios> o a la venta de otro cliente →
   *Acceso denegado*.

---

## 3. Tecnologías

| Parte | Tecnología |
|---|---|
| Backend | Node.js, Express 5, TypeScript, zod, JWT, bcrypt |
| Base de datos | PostgreSQL en Neon (`pg`); PostgreSQL en memoria (PGlite) para las pruebas |
| Frontend | React 19, Vite 7, React Router 7 |
| Mapa | Google Maps (Maps JavaScript API) con `@googlemaps/js-api-loader` |
| Pruebas | Vitest, Supertest, Playwright |

---

## 4. Estructura

```
lotes-urbanizacion/
├── backend/src/
│   ├── dominio/          reglas de negocio puras: lote, reserva, planPagos, venta, dinero,
│   │                     fechas, geometria, permisos, errores  ← pruebas unitarias
│   ├── aplicacion/
│   │   ├── puertos.ts    interfaces (Reloj, Hasher, LectorKml, UnidadDeTrabajo...)
│   │   ├── repositorios.ts  interfaces de los repositorios y vistas de lectura
│   │   └── servicios/    ReservaServicio, VentaServicio, PagoServicio, ImportacionKmlServicio...
│   ├── infraestructura/
│   │   ├── bd/           conexión (Neon o en memoria), migraciones, repositorios SQL, datos demo
│   │   ├── kml/          lector de archivos KML
│   │   ├── seguridad.ts  bcrypt y JWT
│   │   └── reloj.ts      RelojSistema y RelojFijo
│   ├── http/             rutas, validación con zod, autenticación y errores
│   ├── contenedor.ts     arma los servicios con sus dependencias
│   ├── app.ts            app Express sin escuchar un puerto (para Supertest)
│   └── servidor.ts       punto de entrada
├── frontend/src/
│   ├── componentes/mapa/ Google Maps: MapaLotes, HerramientaDibujo, capas y colores
│   ├── paginas/          login, proyectos, mapa del proyecto, clientes, reservas, ventas, portal
│   ├── api/              cliente HTTP y tipos
│   └── auth/             sesión y rutas protegidas por rol
├── e2e/                  Playwright (configurado; las pruebas las escribe el grupo)
└── docs/                 guías del equipo
```

---

## 5. Reglas de negocio

```
DISPONIBLE ──reservar──► RESERVADO ──vender──► VENDIDO
    │  ▲                      │                    │
    │  └── cancelar / vencer ─┘                    │
    │  ▲                                           │
    │  └────────────── anular venta ───────────────┘
    └── bloquear ──► BLOQUEADO ── desbloquear ──► DISPONIBLE
```

- Solo se reserva un lote DISPONIBLE, con precio y de un proyecto PUBLICADO.
- Se vende un lote DISPONIBLE, o uno RESERVADO solo al cliente de la reserva.
- El precio pactado se guarda en la venta: si cambia el precio del lote, la venta no cambia.
- Financiado: cuota inicial + N cuotas mensuales; los centavos sobrantes van en la última cuota.
- **Saldo = precio pactado − pagos válidos.** Se calcula, no se guarda, y nunca es negativo.
- Un pago no se borra: el administrador lo anula con motivo y queda en el historial.
- **Concurrencia:** reservar y vender usan una transacción con
  `UPDATE lotes SET estado = ... WHERE id = $1 AND estado = <esperado>`, más índices únicos en la
  base. De dos operaciones simultáneas sobre el mismo lote, solo una gana; la otra recibe 409.
- Registrar una venta (lote VENDIDO, reserva convertida, venta, cuotas y pago inicial) ocurre en
  una sola transacción: si algo falla, no queda nada a medias.

---

## 6. Documentación

| Documento | Contenido |
|---|---|
| [AGENTS.md](AGENTS.md) | **Empieza aquí.** Etapas, quién es dueño de qué, reglas para no pisarse e instrucciones para los agentes de IA (Claude Code y Codex) |
| [docs/CONSIGNA.md](docs/CONSIGNA.md) | La consigna del proyecto en texto (secciones §1 a §15) |
| [docs/BASE_DE_DATOS.md](docs/BASE_DE_DATOS.md) | Neon: ramas, conexión, `db:reset`, reglas del grupo |
| [docs/GOOGLE_MAPS.md](docs/GOOGLE_MAPS.md) | Clave de Google Maps y cómo funciona el mapa |
| [docs/API.md](docs/API.md) | Rutas de la API y catálogo de códigos de error |
| [docs/GUIA_TESTING.md](docs/GUIA_TESTING.md) | Dónde va cada prueba, puntos de entrada, datos demo y `data-testid` |
| [docs/CONVENCIONES.md](docs/CONVENCIONES.md) | Convenciones de código, pruebas y trabajo en equipo |
| [docs/DECISIONES.md](docs/DECISIONES.md) | Decisiones técnicas y por qué |
