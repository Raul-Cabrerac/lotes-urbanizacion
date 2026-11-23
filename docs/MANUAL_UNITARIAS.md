# Manual de pruebas unitarias

Para Laura y Luciana. Explica qué le toca a cada una, cómo escribir las pruebas unitarias del
backend y cómo llegar al 80 % de cobertura que exige el docente. Los datos son del 2026-11-21,
medidos sobre `main`.

Complementa, sin reemplazar, a `AGENTS.md` (§5 reglas, §7 cómo no pisarse, §8 git), a la skill
`.claude/skills/test-unitario/SKILL.md` (plantillas y casos por regla) y a `docs/GUIA_TESTING.md`
§2 (qué función cubre cada regla).

## 1. La meta

- **Los 10 ítems de la consigna §12**, cada uno con casos positivo, negativo y límite (reparto en
  §3).
- **Cobertura mínima de 80 %** en `backend/src/dominio/` y `backend/src/aplicacion/`, medida solo
  con unitarias. Hoy está en 48,5 % de líneas: faltan 202 líneas. Si alcanza el tiempo, apunten al
  90 %. Raul confirma con el docente qué abarca el 80 % y con qué
  pruebas se mide; mientras tanto, esta es la meta.
- **Que cada una pueda explicar sus pruebas en la defensa.** No se entrega nada que no se
  entienda, aunque lo haya escrito una IA.

## 2. Qué es la cobertura y cómo medirla

Mientras corren las pruebas, Vitest marca cada línea del código que se ejecutó al menos una vez.
La cobertura es el porcentaje de líneas que alguna prueba ejecutó. Una línea que ninguna prueba
ejecuta puede tener un error y nadie se entera.

Desde la raíz del repositorio:

```
npm run test:cobertura -w backend -- tests/unitarias
```

El comando muestra una tabla por archivo y genera `backend/coverage/index.html`. Ábranlo en el
navegador y entren a un archivo: las líneas en rojo nunca se ejecutaron, y una marca `I` o `E`
señala un `if` o un `else` que ninguna prueba recorrió. Ahí falta una prueba.

- No midan con `npm run test:cobertura` a secas: también corre las pruebas de integración y
  muestra un 77 % que no es el que se evalúa.
- Cobertura alta no significa pruebas buenas: una prueba sin `expect` también «cubre». Cada línea
  que suban tiene que quedar verificada con un `expect` sobre el resultado o sobre el `codigo` del
  error.

## 3. Reparto: cada archivo tiene una sola dueña

| | Luciana | Laura |
|---|---|---|
| Carpeta | `backend/tests/unitarias/dominio/` | `backend/tests/unitarias/servicios/` |
| Qué prueba | Reglas puras, sin dobles | Servicios con dobles (`vi.fn()`) |
| Hoy | 133 de 297 líneas sin cubrir (55 %) | 197 de 344 líneas sin cubrir (43 %) |
| Ítems de §12 | 1 a 8 y la regla de cancelar (`validarReservaCancelable`) | 9 (precio pactado) y 10 (`ReservaServicio.cancelar` libera el lote) |
| Checklist §15 | Estados del lote, plan de pagos, cálculo de saldo | Mocks/stubs, reserva y venta duplicadas, liberación de reserva |

Los ítems de §12 son: 1 cambios de estado del lote; 2 no reservar un lote que no esté DISPONIBLE;
3 no vender un lote VENDIDO; 4 total pagado y saldo; 5 generar cuotas; 6 pagos con montos
inválidos; 7 saldo nunca negativo; 8 vencimiento de reservas; 9 la venta conserva el precio
pactado; 10 cancelar una reserva y liberar el lote. Qué función cubre cada uno:
`docs/GUIA_TESTING.md` §2.

En `main` ya hay 8 archivos de unitarias, escritos por Mario, que pasan. No los borren: agreguen
sus casos en el mismo archivo. Si una termina antes, Raul le reasigna archivos completos.

### Luciana: primero rescata tus borradores

Tu rama `origin/respaldo/main-luciana` tiene 12 archivos de pruebas en `backend/src/`. Ahí **no
corren**, porque Vitest solo busca pruebas en `backend/tests/`. Los probé contra el `main` actual:
de 118 pruebas pasan 101 y fallan 17, porque el dominio cambió después de que las escribiste.
Rescatadas, `dominio/` sube del 55 % al 92 % y el total queda en 65,8 %.

1. Copia cada `backend/src/dominio/X.test.ts` a `backend/tests/unitarias/dominio/X.test.ts` y
   corrige los imports: `'./lote'` pasa a ser `'../../../src/dominio/lote'`.
2. `lote.test.ts`, `planPagos.test.ts` y `venta.test.ts` ya existen: suma tus casos sin repetir
   los que ya están.
3. Corrige lo que falla:
   - `fechas.test.ts`: `sumarDias` ya no existe. Prueba `sumarMeses`, `aFechaISO` y `esFechaISO`.
   - `lote.test.ts`: `TRANSICIONES_LOTE`, `puedeCambiarEstado` y `validarCambioEstado` ahora son
     `OPERACIONES_LOTE`, `admite` (de `transiciones.ts`) y `validarCambioEstadoManual`.
   - `planPagos.test.ts`: `validarPagoAnulable` recibe un tercer dato, el estado de la venta
     (`'VIGENTE'` o `'ANULADA'`).
4. A todos les falta la primera línea `// Consigna §12: ...` y los comentarios `// Arrange`,
   `// Act` y `// Assert`.
5. Tus borradores de `ReservaServicio` y `VentaServicio` pásaselos a Laura: son de su carpeta.
6. Después completa lo que siga en rojo: `errores.ts`, `permisos.ts`, `proyecto.ts` y
   `planPagos.ts`.

### Laura: los servicios, de mayor a menor impacto

Si Luciana rescata `dominio/`, para llegar al 80 % faltan al menos 91 líneas en los servicios.
Apunta a unas 120 para tener margen. Los servicios en 0 % son cortos: empezar por ellos rinde
rápido.

| Servicio | Hoy | Líneas sin cubrir | Qué probar |
|---|---|---|---|
| `ImportacionKmlServicio` | 0 % | 46 | `importar` con un `LectorKml` falso: crea los lotes; si un polígono tiene errores, no crea ninguno |
| `LoteServicio` | 42 % | 31 | `crear`, `actualizar`, `cambiarEstado` (bloquear y desbloquear) y `eliminar` |
| `ProyectoServicio` | 32 % | 21 | `crear`, `publicar` y `definirLimite` |
| `ReporteServicio` | 0 % | 19 | `resumenGeneral` con repositorios simulados y `relojEnHoy()` |
| `UsuarioServicio` | 0 % | 18 | `crear` (con un `Hasher` falso) y `cambiarActivo` |
| `AuthServicio` | 0 % | 17 | `iniciarSesion` con contraseña correcta e incorrecta (`Hasher` y `ServicioTokens` falsos) |
| `ClienteServicio` | 0 % | 17 | `crear` (documento nuevo y repetido), `actualizar` y `obtener` |
| `PagoServicio` | 62 % | 10 | `registrar` y `anular` |
| `VentaServicio` | 83 % | 8 | El precio pactado no cambia (§12) y la venta duplicada |
| `PortalServicio` | 0 % | 5 | `misOperaciones` |
| `ReservaServicio` | 88 % | 5 | `cancelar` libera el lote (§12) |

- Si un servicio recibe otro servicio (por ejemplo, `ClienteServicio` recibe `VentaServicio`),
  pásale un *stub*: un objeto con `vi.fn()` solo en los métodos que se usan.
- Los borradores de servicios de Luciana sirven como ideas, pero fallan: verifican llamadas
  internas con firmas viejas. Verifica el resultado o lo que queda guardado.

## 4. Cómo se escribe una prueba unitaria

### Reglas que revisan el docente y el equipo

- Primera línea: `// Consigna §12: <ítem>` (u otra sección de la consigna, si corresponde).
- `describe('<módulo>')` → `describe('<función>')` → `it('<resultado> cuando <condición>')`.
- AAA con los tres comentarios visibles; en una prueba de error vale `// Act + Assert`.
- Por cada regla: un caso positivo, uno negativo y uno límite.
- Errores siempre por su `codigo`, nunca por el texto:
  `expect(() => ...).toThrow(expect.objectContaining({ codigo: '...' }))` en el dominio y
  `await expect(...).rejects.toMatchObject({ codigo: '...' })` en los servicios.
- Un comportamiento por `it`. Sin `if`, `for` ni `try` dentro de un `it` (para tablas, `it.each`).
  Sin `.only` ni `.skip`.
- Nunca `new Date()`: usen `relojEnHoy()`, `AYER`, `MANIANA` y `fechaEnDias(n)` de
  `backend/tests/apoyo/dobles.ts` (ahí «hoy» es el 15/03/2026).
- Dinero con `toBe`, nunca con `toBeCloseTo`.
- Dobles con `vi.fn()` (Vitest, no Jest), solo para los puertos; las reglas del dominio se usan
  reales.
- Verifiquen el resultado o lo que queda guardado, no la lista de llamadas internas. La excepción
  es comprobar que algo **no** se guardó, con `not.toHaveBeenCalled()`.

### Ejemplo de dominio (Luciana)

```ts
// Consigna §12: Impedir que el saldo resulte negativo.
import { describe, expect, it } from 'vitest';
import { validarPago } from '../../../src/dominio/planPagos';

const cuota = { concepto: 'Cuota 2', estado: 'PENDIENTE' as const, montoPendiente: 5000 };

describe('planPagos', () => {
  describe('validarPago', () => {
    it('acepta el pago cuando el monto es igual al saldo pendiente', () => {
      // Arrange
      const saldo = 5000;
      // Act
      const pagar = () => validarPago(5000, 'VIGENTE', cuota, saldo);
      // Assert
      expect(pagar).not.toThrow();
    });

    it('lanza MONTO_EXCEDE_SALDO cuando el monto supera el saldo por 0,01', () => {
      // Arrange
      const saldo = 5000;
      // Act
      const pagar = () => validarPago(5000.01, 'VIGENTE', cuota, saldo);
      // Assert
      expect(pagar).toThrow(expect.objectContaining({ codigo: 'MONTO_EXCEDE_SALDO' }));
    });
  });
});
```

### Ejemplo de servicio con dobles (Laura)

```ts
// Consigna §6: un cliente se registra una sola vez por documento.
import { describe, expect, it, vi } from 'vitest';
import { ClienteServicio } from '../../../src/aplicacion/servicios/ClienteServicio';
import type { VentaServicio } from '../../../src/aplicacion/servicios/VentaServicio';
import { unidadDeTrabajoFalsa } from '../../apoyo/dobles';

const datos = { nombreCompleto: 'Carla Rojas', documento: '9000001', telefono: '70000000', email: '', direccion: '' };
const ventas = { listar: vi.fn() } as unknown as VentaServicio; // stub: crear no lo usa

describe('ClienteServicio', () => {
  describe('crear', () => {
    it('guarda el cliente cuando su documento es nuevo', async () => {
      // Arrange
      const repos = {
        clientes: {
          buscarPorDocumento: vi.fn().mockResolvedValue(null),
          crear: vi.fn().mockResolvedValue({ id: 5, ...datos }),
        },
      };
      const servicio = new ClienteServicio(unidadDeTrabajoFalsa(repos), ventas);
      // Act
      const creado = await servicio.crear(datos);
      // Assert
      expect(creado).toMatchObject({ id: 5, documento: '9000001' });
    });

    it('lanza DOCUMENTO_DUPLICADO y no guarda cuando el documento ya existe', async () => {
      // Arrange
      const repos = {
        clientes: { buscarPorDocumento: vi.fn().mockResolvedValue({ id: 1 }), crear: vi.fn() },
      };
      const servicio = new ClienteServicio(unidadDeTrabajoFalsa(repos), ventas);
      // Act + Assert
      await expect(servicio.crear(datos)).rejects.toMatchObject({ codigo: 'DOCUMENTO_DUPLICADO' });
      expect(repos.clientes.crear).not.toHaveBeenCalled();
    });
  });
});
```

Los dos ejemplos se comprobaron con Vitest y con `tsc` antes de escribir este manual.

`backend/tests/apoyo/dobles.ts` ya trae `unidadDeTrabajoFalsa(repos)`, `relojEnHoy()`,
`usuarioAdmin`, `usuarioAsesor`, `GEOMETRIA_LOTE` y `lotesYReservasEnMemoria(...)`. Esa carpeta es
de Raul: si necesitan un ayudante compartido nuevo, pídanselo. Mientras tanto, usen una función
dentro de su propio archivo.

## 5. Paso a paso

1. `git switch main` y `git pull`. Creen su rama: `test/unitarias-dominio` (Luciana) o
   `test/unitarias-servicios` (Laura).
2. Por cada archivo: escribir las pruebas, correr `npm run test:unit`, mirar la cobertura y hacer
   un commit (`test: cubre validarPago de planPagos`).
3. Antes del pull request: `git pull origin main`, y `npm run typecheck` y `npm run test:unit` en
   verde **dos veces seguidas**.
4. Pull request hacia `main` con la plantilla, pegando la tabla de cobertura. Lo revisa la otra
   (Laura revisa a Luciana y Luciana a Laura) con la skill `revisar-codigo`, y Raul lo integra.
5. En `docs/GUIA_TESTING.md` §7, cada una completa la columna «Prueba» de sus filas.

**No toquen** `backend/src/` (el producto), `backend/tests/apoyo/`, `vitest.config.ts`,
`package.json`, ni las pruebas de integración o E2E. Si una prueba descubre un error del producto,
no la ajusten para que pase: abran un issue `bug` y avisen a Raul (`AGENTS.md` §7.3).

## 6. Si usan IA (Claude Code o Codex)

- Pidan algo concreto, con el archivo y la regla: «Usa la skill test-unitario para cubrir
  `validarPago` de `planPagos.ts` con casos positivo, negativo y límite».
- No dejen que cambie `src/` ni `tests/apoyo/`.
- Revisen cada línea, córranla y pregúntense: ¿qué regla prueba? ¿Fallaría si la regla se rompe?

## 7. Errores comunes

- Dejar pruebas en `backend/src/`: no corren.
- Suponer nombres o firmas: abran el archivo real antes de escribir; el dominio cambió.
- Olvidar el `await` delante de `expect(...).rejects`: la prueba pasa sin verificar nada.
- Medir con `npm run test:cobertura` a secas: incluye integración e infla el número.
- Comprobar el texto del mensaje en vez del `codigo`.

## 8. Lista antes del pull request

- [ ] Cada archivo empieza con `// Consigna §N: <ítem>`.
- [ ] AAA visible y un comportamiento por `it`.
- [ ] Casos positivo, negativo y límite por regla.
- [ ] Errores por `codigo`, con función flecha o `rejects`.
- [ ] Sin `new Date()`, `.only`, `.skip`, ni `if`, `for` o `try` dentro de un `it`.
- [ ] `npm run typecheck` y `npm run test:unit` en verde dos veces seguidas.
- [ ] Tabla de cobertura pegada en el pull request.
- [ ] Puedo explicar cada prueba sin leerla.
