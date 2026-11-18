---
name: nueva-funcionalidad
description: Guía para agregar o modificar una funcionalidad atravesando las capas del proyecto en el orden correcto (dominio → puertos → servicio → repositorio SQL → esquema zod y ruta → documentación → interfaz con data-testid), respetando las convenciones del equipo y dejando la funcionalidad lista para probar. Usar cuando se pida implementar, cambiar o extender una regla de negocio, un endpoint o una pantalla.
argument-hint: "[funcionalidad o regla a agregar]"
---

# Skill: agregar o cambiar una funcionalidad

## 1. Antes de escribir una línea

1. Leer `docs/CONVENCIONES.md` (§4 arquitectura, §5 nombres, §6 estilo y errores).
2. Localizar la regla en la consigna y anotar la sección (`§N`). Si la consigna no la cubre, la
   decisión se toma en equipo y se registra en `docs/DECISIONES.md`.
3. Buscar si ya existe algo parecido para extender en vez de duplicar.
4. Escribir en dos líneas qué cambia y cómo se verá que funciona (ese texto va al pull request).

## 2. Orden de implementación (de adentro hacia afuera)

| Paso | Capa | Qué se hace | Convención clave |
|---|---|---|---|
| 1 | `backend/src/dominio/` | La regla como función pura (`validarX`, `calcularX`). Error nuevo → `throw new ErrorConflicto('CODIGO', 'mensaje')` o `ErrorReglaNegocio`, y el código en el catálogo de `docs/API.md`. JSDoc con `Consigna §N` | Sin imports externos; dinero con `dinero.ts`; fechas con `fechas.ts` |
| 2 | `aplicacion/repositorios.ts` | Solo si hace falta un dato nuevo: agregar el método a la interfaz del repositorio | Métodos pequeños y nombrados por intención (`buscarActivaPorLote`) |
| 3 | `aplicacion/servicios/` | Método del servicio: buscar → aplicar la regla del dominio → persistir. Dentro de `this.uow.transaccion(async (repos) => ...)` si escribe en más de una tabla | Dentro de la transacción usar solo los `repos` recibidos |
| 4 | `infraestructura/bd/repositorios/` | Implementar el método con SQL parametrizado; si cambia el esquema, migración nueva `00N_descripcion.sql` | `$1, $2`; `RETURNING *` con `filaObligatoria`; conversión en `conversiones.ts`; nunca concatenar valores |
| 5 | `http/validacion.ts` y `http/rutas.ts` | Esquema zod; ruta con `autorizar('permiso')` y `parsear(esquema, req.body)`; si es un servicio nuevo, registrarlo en `contenedor.ts` | Ruta `/api/recurso/:id/accion` |
| 6 | `docs/API.md` | Ruta, permiso, cuerpo y códigos de error nuevos | Mismo pull request |
| 7 | `frontend/src/api/` | Función en `api.ts` y tipos en `tipos.ts` o `tiposOperaciones.ts` | — |
| 8 | `frontend/src/componentes/` o `paginas/` | Control o pantalla con `data-testid` en todo elemento interactivo o verificable; tras la operación, volver a pedir los datos; errores en `aviso-error` o en el error del modal | Prefijos de `docs/CONVENCIONES.md` §7; anotar los nuevos en `docs/GUIA_TESTING.md` §6. La interfaz es de Mario: todo cambio en `frontend/src/` necesita su visto bueno (`AGENTS.md` §7, regla 9) |
| 9 | Verificación | `npm run typecheck`, `npm run dev:pruebas` y probar a mano el camino feliz y uno de error | Mostrar la salida real |
| 10 | Pruebas | Indicar qué skill corresponde: `test-unitario` para la regla, `test-integracion` para el endpoint, `test-e2e` si cambia un flujo de §14. No escribirlas sin que lo pidan | — |

## 3. Plantillas mínimas

Regla en el dominio:

```ts
/** Consigna §9: un pago anulado conserva la trazabilidad y no se anula dos veces. */
export function validarPagoAnulable(pago: { estado: EstadoPago }, motivo: string): void {
  validarMotivo(motivo); // MOTIVO_REQUERIDO
  if (pago.estado !== 'VALIDO') throw new ErrorConflicto('PAGO_YA_ANULADO', 'El pago ya fue anulado.');
}
```

Servicio:

```ts
/** Consigna §9: el administrador anula un pago dejando quién, cuándo y por qué. */
async anular(pagoId: number, motivo: string, usuario: UsuarioActual) {
  const ventaId = await this.uow.transaccion(async (repos) => {
    const pago = await repos.pagos.buscarPorId(pagoId);
    if (!pago) throw new ErrorNoEncontrado('Pago no encontrado.');
    validarPagoAnulable(pago, motivo);
    await repos.pagos.anular(pagoId, { motivo, anuladoPorId: usuario.id, fecha: this.reloj.ahora() });
    return pago.ventaId;
  });
  return this.ventas.obtener(ventaId, usuario);
}
```

Ruta:

```ts
r.post('/:id/anular', autorizar('pagos:anular'), async (req, res) => {
  const { motivo } = parsear(esquemas.motivo, req.body);
  res.json(await s.pagos.anular(leerId(req.params.id), motivo, usuarioDe(req)));
});
```

## 4. Qué NO hacer

- Poner la regla en la ruta, en el repositorio o en el componente React.
- Usar `any`, `!` o `new Date()` fuera de `RelojSistema`.
- Crear una ruta sin `autorizar(...)` "porque es interna".
- Agregar un control sin `data-testid` o con un nombre fuera de la convención.
- Dejar la documentación "para después".
- Introducir una librería nueva sin discutirlo en equipo y anotarlo en `docs/DECISIONES.md`.

## 5. Lista de verificación antes del pull request

- [ ] Regla en el dominio con JSDoc y sección de la consigna; error con código en el catálogo.
- [ ] Servicio transaccional si escribe en más de una tabla; `cambiarEstadoSi` si cambia el
      estado de un lote.
- [ ] SQL parametrizado; archivos de menos de 250 líneas.
- [ ] Ruta con autorización y validación; documentada en `docs/API.md`.
- [ ] Interfaz con `data-testid` documentados; refresca desde el servidor; muestra errores.
- [ ] `npm run typecheck` y prueba manual hechos; salida mostrada.
- [ ] Indicado qué pruebas corresponden y con qué skill.
