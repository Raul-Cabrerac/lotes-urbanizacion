---
name: test-unitario
description: Escribe, completa o corrige pruebas unitarias con Vitest para las reglas del dominio (backend/src/dominio) y para servicios con puertos simulados, siguiendo AAA, casos positivo/negativo/límite y las convenciones del equipo. Usar cuando se pida una prueba unitaria, cubrir una regla de negocio de la consigna (§12) o revisar un archivo *.test.ts del backend.
argument-hint: "[archivo, función o regla a probar]"
---

# Skill: prueba unitaria

## 1. Qué es "unitario" en este proyecto

- Se prueba **una unidad aislada**: una función de `backend/src/dominio/` (`lote.ts`,
  `planPagos.ts`, `reserva.ts`, `dinero.ts`, `fechas.ts`, `geometria.ts`, `permisos.ts`...) o un
  servicio de `aplicacion/servicios/` con **todos sus puertos simulados**.
- Sin base de datos, sin HTTP, sin red, sin `new Date()`. Si hace falta la base de datos, no es
  unitario: usar la skill `test-integracion`.

## 2. Antes de escribir

1. Leer completo el archivo a probar. Anotar: funciones exportadas, errores que lanza (sus
   `codigo`), condiciones de borde (igualdades, ceros, fechas iguales a hoy, última cuota).
2. Ubicar la regla en la tabla de `docs/GUIA_TESTING.md` §2.
3. Listar los casos **antes** de programar: por cada regla, al menos un positivo, un negativo y un
   límite (§5 de esta skill).
4. Confirmar nombres y firmas abriendo el archivo; no suponerlos.

## 3. Dónde va y cómo se llama

- En `backend/tests/unitarias/`, con la misma estructura que `src/` (nunca dentro de `src/`):
  `src/dominio/lote.ts` → `tests/unitarias/dominio/lote.test.ts`;
  `src/aplicacion/servicios/ReservaServicio.ts` → `tests/unitarias/servicios/ReservaServicio.test.ts`.
  Por qué: `docs/DECISIONES.md` §12. Dueña de la carpeta: Laura (`AGENTS.md` §6).
- Desde `tests/unitarias/dominio/` o `tests/unitarias/servicios/`, el código se importa con
  `../../../src/...`.
- Primera línea: `// Consigna §12: <ítem que cubre>`.
- Datos repetidos en `backend/tests/apoyo/constructores.ts` (`crearLote`, `crearCuota`...).
  Crearlos si no existen; devuelven objetos válidos por defecto y aceptan sobrescribir campos.

## 4. Estructura obligatoria

```ts
// Consigna §12: Impedir reservar un lote que no esté DISPONIBLE.
import { describe, expect, it } from 'vitest';
import { validarLoteReservable } from '../../../src/dominio/lote';

const lote = (estado: 'DISPONIBLE' | 'RESERVADO' | 'VENDIDO' | 'BLOQUEADO') => ({
  codigo: 'A-01',
  estado,
  precio: 45000,
});

describe('lote', () => {
  describe('validarLoteReservable', () => {
    it('no lanza error cuando el lote está DISPONIBLE', () => {
      // Arrange
      const disponible = lote('DISPONIBLE');
      // Act
      const reservar = () => validarLoteReservable(disponible, 'PUBLICADO');
      // Assert
      expect(reservar).not.toThrow();
    });

    it.each(['RESERVADO', 'VENDIDO', 'BLOQUEADO'] as const)(
      'lanza LOTE_NO_DISPONIBLE cuando el lote está %s',
      (estado) => {
        // Arrange
        const ocupado = lote(estado);
        // Act + Assert
        expect(() => validarLoteReservable(ocupado, 'PUBLICADO')).toThrow(
          expect.objectContaining({ codigo: 'LOTE_NO_DISPONIBLE' }),
        );
      },
    );
  });
});
```

Reglas: `describe` por módulo y por función; `it` con la forma *"<resultado> cuando <condición>"*;
los tres comentarios AAA siempre visibles (en una prueba de error, `// Act + Assert` es válido);
un comportamiento por `it`; sin `if`, `for` ni `try` dentro de un `it` (tablas con `it.each`).

## 5. Casos: positivo, negativo y límite

| Consigna §12 | Dónde | Casos mínimos |
|---|---|---|
| Cambios permitidos de estado | `lote.ts`: `TRANSICIONES_LOTE`, `puedeCambiarEstado`, `validarCambioEstadoManual` | `it.each` con transiciones válidas e inválidas · a mano solo bloquear y desbloquear |
| Impedir reservar un lote no DISPONIBLE | `validarLoteReservable` | DISPONIBLE → ok · RESERVADO/VENDIDO/BLOQUEADO → `LOTE_NO_DISPONIBLE` · precio 0 → `LOTE_SIN_PRECIO` · proyecto BORRADOR → `PROYECTO_NO_PUBLICADO` |
| Impedir vender un lote ya VENDIDO | `validarLoteVendible` | VENDIDO → `LOTE_YA_VENDIDO` · RESERVADO por otro cliente → `LOTE_RESERVADO_POR_OTRO_CLIENTE` · RESERVADO por el mismo cliente → ok |
| Total pagado y saldo | `planPagos.ts`: `resumirPlan` | sin pagos · con pagos · con un pago ANULADO (no cuenta) · ejemplo A-05: 75 000 − 20 000 = 55 000 |
| Generar cuotas | `generarPlanDePagos`, `dinero.ts`: `dividirEnPartes` | contado = 1 cuota · inicial + N · 100 / 3 → 33.33, 33.33, 33.34 · la suma es el precio · N = 0 → `NUMERO_CUOTAS_INVALIDO` |
| Impedir pagos inválidos | `validarPago` | 0, negativo, 3 decimales → `MONTO_INVALIDO` · cuota PAGADA → `CUOTA_YA_PAGADA` · venta ANULADA → `VENTA_NO_VIGENTE` |
| Impedir saldo negativo | `validarPago` | monto = saldo exacto → ok (límite) · saldo + 0.01 → `MONTO_EXCEDE_SALDO` |
| Vencimiento de reservas | `reserva.ts`: `estaVencida`, `validarFechaVencimiento` | venció ayer → sí · vence mañana → no · vence **hoy** → no (límite) · fecha anterior a hoy → `FECHA_VENCIMIENTO_INVALIDA` |
| La venta conserva el precio pactado | `VentaServicio.registrar` con dobles | el `precioPactado` guardado es el de la venta; cambiar después el precio del lote no lo altera |
| Cancelar reserva y liberar lote | `validarReservaCancelable`; `ReservaServicio.cancelar` con dobles | ACTIVA → ok y el lote pasa a DISPONIBLE · reserva no ACTIVA → `RESERVA_NO_ACTIVA` |

Extras valiosos: `sumar(0.1, 0.2) === 0.3`, `sumarMeses('2026-01-31', 1) === '2026-02-28'`,
`tienePermiso('CLIENTE', 'ventas:registrar') === false`, `calcularEstadoCuota` (PENDIENTE,
PAGADA, VENCIDA), `normalizarPoligono` con menos de 3 vértices → `GEOMETRIA_INVALIDA`.

## 6. Verificar errores

```ts
// Síncrono (dominio)
expect(() => validarPago(10.001, 'VIGENTE', cuota, 5000)).toThrow(
  expect.objectContaining({ codigo: 'MONTO_INVALIDO' }),
);

// Asíncrono (servicios)
await expect(servicio.crear(entrada, asesor)).rejects.toMatchObject({ codigo: 'LOTE_NO_DISPONIBLE' });
```

- Siempre envolver la llamada en una función flecha: `expect(() => ...)`.
- Verificar el `codigo`, no el texto del mensaje.
- Verificar también que **no hubo efectos**: el repositorio no se llamó.

## 7. Servicios con puertos simulados

```ts
// Consigna §7: no se crea la reserva si otro usuario tomó el lote un instante antes.
import { describe, expect, it, vi } from 'vitest';
import { RelojFijo } from '../../../src/infraestructura/reloj';
import type { UnidadDeTrabajo, UsuarioActual } from '../../../src/aplicacion/puertos';
import { ReservaServicio } from '../../../src/aplicacion/servicios/ReservaServicio';

const asesor = { id: 2, rol: 'ASESOR' } as UsuarioActual;

describe('ReservaServicio', () => {
  describe('crear', () => {
    it('lanza LOTE_NO_DISPONIBLE y no guarda la reserva cuando el UPDATE condicional falla', async () => {
      // Arrange
      const repos = {
        lotes: {
          buscarPorId: vi.fn().mockResolvedValue({ id: 1, proyectoId: 1, codigo: 'A-01', estado: 'DISPONIBLE', precio: 45000 }),
          cambiarEstadoSi: vi.fn().mockResolvedValue(false), // otro usuario ganó
        },
        clientes: { buscarPorId: vi.fn().mockResolvedValue({ id: 7 }) },
        proyectos: { buscarPorId: vi.fn().mockResolvedValue({ id: 1, estado: 'PUBLICADO' }) },
        reservas: { crear: vi.fn() },
      };
      const uow = { repos, transaccion: (trabajo: (r: typeof repos) => unknown) => trabajo(repos) };
      const servicio = new ReservaServicio(uow as unknown as UnidadDeTrabajo, new RelojFijo(new Date('2026-03-15T12:00:00')));
      // Act + Assert
      await expect(servicio.crear({ loteId: 1, clienteId: 7 }, asesor)).rejects.toMatchObject({
        codigo: 'LOTE_NO_DISPONIBLE',
      });
      expect(repos.reservas.crear).not.toHaveBeenCalled();
    });
  });
});
```

- Solo se simulan los puertos (`UnidadDeTrabajo` y sus repositorios, `Reloj`, `Hasher`,
  `ServicioTokens`, `LectorKml`). Las reglas del dominio se usan reales: así la prueba del
  servicio también ejercita la regla.
- `as unknown as UnidadDeTrabajo` es la única conversión de tipo permitida en pruebas, solo para
  dobles parciales. Si se repite, mover a `tests/apoyo/dobles.ts`.
- `reservas.finalizar`, `ventas.anular` y `pagos.anular` devuelven `true` si cambiaron la fila:
  en el doble, `mockResolvedValue(true)` para el caso normal y `false` para simular que otro
  usuario la cerró antes (el servicio responde 409). `PagoServicio.registrar` llama primero a
  `ventas.bloquearPorId`, así que el doble necesita ese método. Detalle en
  `docs/GUIA_TESTING.md` §2.

## 8. Fechas

Nunca `new Date()` sin argumentos. Las reglas reciben `hoy` como parámetro (`'2026-03-15'`) y los
servicios un `RelojFijo(new Date('2026-03-15T12:00:00'))`. Los casos límite de fechas llevan la
fecha en el nombre de la prueba.

## 9. Matchers

`toBe` (primitivos), `toEqual` (objetos y arreglos), `toHaveLength`, `toThrow`, `rejects.toMatchObject`,
`toHaveBeenCalledWith`, `toHaveBeenCalledTimes`, `not.toHaveBeenCalled`. `toBeCloseTo` solo para
superficies en m², nunca para dinero (el dinero tiene 2 decimales exactos).

## 10. Comandos

```
npm run test:unit                                  # todas las unitarias
npx vitest run tests/unitarias/dominio/lote.test.ts   # un archivo (desde backend/)
npx vitest -t "LOTE_NO_DISPONIBLE"                 # por nombre
npm run test:cobertura                             # objetivo ≥ 90 % en dominio y aplicación
```

## 11. Lista de verificación

- [ ] Comentario inicial con el ítem de la consigna.
- [ ] Por cada regla: positivo, negativo y límite.
- [ ] AAA visible; un comportamiento por `it`; nombre "<resultado> cuando <condición>".
- [ ] Errores verificados por `codigo` y con función flecha.
- [ ] Sin base de datos, sin HTTP, sin `new Date()`, sin lógica en las pruebas.
- [ ] `npm run test:unit` en verde dos veces seguidas y `npm run typecheck` sin errores.
