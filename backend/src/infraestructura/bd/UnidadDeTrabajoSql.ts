import type { Repositorios, UnidadDeTrabajo } from '../../aplicacion/puertos';
import type { BaseDeDatos } from './baseDeDatos';
import { crearRepositorios } from './repositorios';

/**
 * Unidad de trabajo sobre PostgreSQL.
 *
 * `transaccion` abre una transacción: si algo falla adentro se hace ROLLBACK y no queda ningún
 * cambio a medias (por ejemplo, registrar una venta y marcar el lote como VENDIDO).
 */
export class UnidadDeTrabajoSql implements UnidadDeTrabajo {
  readonly repos: Repositorios;

  constructor(private readonly bd: BaseDeDatos) {
    this.repos = crearRepositorios(bd.sql);
  }

  transaccion<T>(trabajo: (repos: Repositorios) => Promise<T>): Promise<T> {
    // Dentro de `trabajo` se usan SOLO los repos recibidos (ligados a la transacción),
    // nunca `this.repos`.
    return this.bd.transaccion((sql) => trabajo(crearRepositorios(sql)));
  }
}
