---
name: test-integracion
description: Escribe, completa o corrige pruebas de integración con Vitest, Supertest y PostgreSQL en memoria (PGlite) sobre la API y los servicios con repositorios reales, cubriendo los ítems de la consigna (§13) como reserva duplicada, venta y estado, pago y saldo, permisos por rol. Usar cuando se pida una prueba de integración, probar un endpoint o verificar persistencia.
argument-hint: "[endpoint, servicio o ítem de la consigna]"
---

# Skill: prueba de integración

## 1. Qué es "integración" en este proyecto

- Se prueban **varias capas juntas con componentes reales**: ruta HTTP → servicio → repositorios
  SQL → PostgreSQL en memoria (PGlite: el mismo SQL que en Neon). Nada se simula, salvo el reloj,
  que se fija para que las fechas sean deterministas.
- Cada prueba abre su **propia base en memoria**, con el esquema y los datos demo, y la cierra al
  final. Ninguna prueba contamina a otra.
- La app se usa sin abrir un puerto: `crearApp(servicios)` devuelve la aplicación Express y
  Supertest la llama directamente.
- Nunca se usa la base de Neon.

## 2. Antes de escribir

1. Leer `docs/GUIA_TESTING.md` §3 (puntos de entrada) y §5 (datos demo).
2. Leer `docs/API.md`: ruta, permiso, cuerpo y códigos de respuesta.
3. Decidir qué se verifica **después** de la operación: un `GET` que demuestre que el cambio quedó
   guardado.

## 3. Dónde va y el apoyo común

- `backend/tests/integracion/<recurso>.test.ts`: `reservas.test.ts`, `ventas.test.ts`,
  `pagos.test.ts`, `lotes.test.ts`, `proyectos.test.ts`, `clientes.test.ts`, `permisos.test.ts`.
- Apoyo en `backend/tests/apoyo/app.ts` (crear una vez y reutilizar):

```ts
import request from 'supertest';
import { crearApp } from '../../src/app';
import { crearContenedor } from '../../src/contenedor';
import { abrirBaseDeDatos } from '../../src/infraestructura/bd/baseDeDatos';
import { cargarDatosDemo } from '../../src/infraestructura/bd/datosDemo';
import { RelojFijo } from '../../src/infraestructura/reloj';

export const HOY = new Date('2026-03-15T12:00:00');

/** Base en memoria + datos demo + app Express lista para Supertest. */
export async function crearAppDePrueba(opciones: { hoy?: Date; conDatosDemo?: boolean } = {}) {
  const hoy = opciones.hoy ?? HOY;
  const bd = await abrirBaseDeDatos(); // sin url: PostgreSQL en memoria, vacío y con el esquema
  if (opciones.conDatosDemo !== false) await cargarDatosDemo(bd, hoy);
  const reloj = new RelojFijo(hoy);
  const servicios = crearContenedor({ bd, jwtSecreto: 'pruebas', jwtExpiraEn: '1h', reloj, bcryptRondas: 4 });
  return { express: crearApp(servicios), servicios, bd, reloj, cerrar: () => bd.cerrar() };
}
export type AppDePrueba = Awaited<ReturnType<typeof crearAppDePrueba>>;

/** Inicia sesión por la API y devuelve el token. */
export async function iniciarSesion(app: AppDePrueba, email: string, password: string): Promise<string> {
  const respuesta = await request(app.express).post('/api/auth/login').send({ email, password }).expect(200);
  return respuesta.body.token;
}
```

Agregar en `apoyo/` buscadores por clave natural (`buscarLote(app, token, 'A-01')`,
`buscarCliente(app, token, '4839201')`) usando la API, para no depender de `id` numéricos.

## 4. Estructura obligatoria

```ts
// Consigna §13: Intentar reservar nuevamente el mismo lote y verificar el rechazo.
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { crearAppDePrueba, iniciarSesion, type AppDePrueba } from '../apoyo/app';
import { buscarCliente, buscarLote } from '../apoyo/buscadores';

describe('POST /api/reservas', () => {
  let app: AppDePrueba;
  let token: string;

  beforeEach(async () => {
    app = await crearAppDePrueba();
    token = await iniciarSesion(app, 'asesor@lotes.bo', 'asesor123');
  });

  afterEach(async () => {
    await app.cerrar();
  });

  it('responde 409 LOTE_NO_DISPONIBLE cuando el lote ya está reservado', async () => {
    // Arrange
    const lote = await buscarLote(app, token, 'A-01');
    const maria = await buscarCliente(app, token, '4839201');
    const juanPablo = await buscarCliente(app, token, '6201457');
    const reservar = (clienteId: number) =>
      request(app.express).post('/api/reservas').set('Authorization', `Bearer ${token}`).send({ loteId: lote.id, clienteId });
    await reservar(maria.id).expect(201);
    // Act
    const respuesta = await reservar(juanPablo.id);
    // Assert
    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error.codigo).toBe('LOTE_NO_DISPONIBLE');
    const detalle = await request(app.express).get(`/api/lotes/${lote.id}`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(detalle.body.estado).toBe('RESERVADO');
    expect(detalle.body.reservaActiva.cliente.id).toBe(maria.id); // la primera reserva sigue intacta
  });
});
```

## 5. Ítems de la consigna (§13) y cómo se verifican

| Ítem | Endpoints | Verificación |
|---|---|---|
| Crear un proyecto y persistir sus datos | `POST /api/proyectos` → `GET /api/proyectos/:id` | 201; el `GET` devuelve los mismos datos y estado BORRADOR |
| Crear o importar lotes y recuperar su geometría | `POST /api/proyectos/:id/lotes`, `POST .../lotes/importar-kml` → `GET .../lotes` | la geometría es la enviada; KML con errores → 422 `KML_CON_ERRORES` y **cero** lotes creados; polígono inválido → 422 `GEOMETRIA_INVALIDA` |
| Registrar un cliente | `POST /api/clientes` → `GET /api/clientes/:id` | 201; documento repetido → 409 `DOCUMENTO_DUPLICADO` |
| Reservar y verificar el cambio de estado | `POST /api/reservas` → `GET /api/lotes/:id` | 201; `estado === 'RESERVADO'`; la reserva aparece ACTIVA |
| Reservar de nuevo el mismo lote | `POST /api/reservas` dos veces | la segunda → 409; con `Promise.all` de dos peticiones simultáneas: exactamente una 201 y una 409 |
| Registrar venta y comprobar VENDIDO | `POST /api/ventas` → `GET /api/lotes/:id` | 201; `VENDIDO`; segunda venta → 409; RESERVADO por otro cliente → 409 `LOTE_RESERVADO_POR_OTRO_CLIENTE` |
| Plan de pagos persistido | `POST /api/ventas` (FINANCIADO) → `GET /api/ventas/:id` | cuota inicial + N cuotas; la suma de montos es el precio pactado; fechas mensuales |
| Pago actualiza cuota, total y saldo | `POST /api/ventas/:id/pagos` → `GET /api/ventas/:id` | cuota `PAGADA`; `resumen.totalPagado` y `resumen.saldoPendiente` correctos; monto mayor al saldo → 422 `MONTO_EXCEDE_SALDO` y nada cambia |
| Lotes filtrados por estado o proyecto | `GET /api/proyectos/:id/lotes?estado=DISPONIBLE` | todos los devueltos tienen ese estado; la cantidad coincide con los datos demo |
| Permisos de administrador, asesor y cliente | cada ruta con cada rol | sin token → 401; rol sin permiso → 403 `SIN_PERMISO`; rol con permiso → 2xx |
| Un cliente no accede a operaciones de otro | `GET /api/ventas/:id` con el token de `cliente2@lotes.bo` sobre la venta de A-05 | 403; `GET /api/portal/mis-operaciones` solo devuelve lo propio |
| El precio pactado se conserva | `POST /api/ventas` → `PUT /api/lotes/:id` con otro precio → `GET /api/ventas/:id` | `precioPactado` sin cambios |
| Cancelar reserva libera el lote | `POST /api/reservas/:id/cancelar` → `GET /api/lotes/:id` | `DISPONIBLE`; cancelar de nuevo → 409 `RESERVA_NO_ACTIVA` |
| Reservas vencidas | reservar con vencimiento; luego `app.reloj.avanzarDias(n)` y cualquier `GET` | la API procesa las vencidas antes de cada petición: reserva `VENCIDA`, lote `DISPONIBLE` |

## 6. Reglas específicas de integración

- **Siempre verificar persistencia** con un `GET` posterior. La respuesta del `POST` sola no
  demuestra que se guardó.
- **Sin mocks**: si hace falta simular algo, la prueba pertenece al nivel unitario.
- Fechas: `crearAppDePrueba({ hoy: new Date('2026-04-30T12:00:00') })` o `app.reloj.avanzarDias(n)`.
- Datos: usar los datos demo (`A-01`, `4839201`...) buscando por clave natural. Si una prueba
  necesita otro estado, lo crea por la API dentro del `Arrange`.
- Código HTTP y `error.codigo` se verifican siempre juntos.

## 7. Comandos

```
npm run test:integracion                              # todas
npx vitest run tests/integracion/reservas.test.ts     # un archivo (desde backend/)
npx vitest run tests/integracion -t "409"             # por nombre
```

## 8. Lista de verificación

- [ ] Comentario inicial con el ítem de §13 que cubre.
- [ ] `beforeEach` abre una base propia; `afterEach` la cierra.
- [ ] AAA visible; nombre "<resultado> cuando <condición>"; un comportamiento por `it`.
- [ ] Verifica código HTTP, `error.codigo` y persistencia.
- [ ] Incluye el camino negativo del endpoint (401/403/409/422 según corresponda).
- [ ] `npm run test:integracion` en verde dos veces seguidas y `npm run typecheck` sin errores.

## 9. Errores frecuentes

- Reutilizar una base entre pruebas → pruebas que fallan según el orden.
- Verificar solo la respuesta del `POST` → no se detectan transacciones que no se confirman.
- Usar `id` fijos de los datos demo → se rompe al cambiar el orden de inserción.
- Olvidar `await` en Supertest → la prueba pasa sin verificar nada.
