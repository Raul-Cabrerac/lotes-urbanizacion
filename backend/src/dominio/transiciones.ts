/**
 * Máquinas de estado: cada entidad declara sus operaciones como una tabla
 * { operación: { de, a } } en su módulo (lote.ts, reserva.ts, venta.ts, planPagos.ts,
 * proyecto.ts). Las validaciones del dominio, los UPDATE condicionales de los
 * repositorios y los botones de la interfaz leen esa misma tabla.
 */
export interface Transicion<E extends string> {
  /** Estados desde los que se admite la operación. */
  readonly de: readonly E[];
  /** Estado en el que queda la entidad. */
  readonly a: E;
}

export function admite<E extends string>(transicion: Transicion<E>, estado: E): boolean {
  return transicion.de.includes(estado);
}

/**
 * La misma transición, pero solo desde `estado` (el que se acaba de leer). Si la transición no lo
 * admite, no admite ninguno: el UPDATE condicional no cambia la fila y el servicio responde 409.
 */
export function restringir<E extends string>(transicion: Transicion<E>, estado: E): Transicion<E> {
  return { de: transicion.de.filter((desde) => desde === estado), a: transicion.a };
}
