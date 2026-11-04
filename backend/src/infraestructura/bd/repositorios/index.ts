/**
 * Repositorios SQL sobre PostgreSQL (Neon o PostgreSQL en memoria, el mismo SQL en los dos).
 *
 * Cada repositorio traduce entre filas de la base (snake_case) y tipos del dominio (camelCase).
 * Reciben un `EjecutorSql`, que puede ser la conexión normal o una transacción
 * (ver UnidadDeTrabajoSql).
 */
import type { Repositorios } from '../../../aplicacion/puertos';
import type { EjecutorSql } from '../baseDeDatos';
import { crearConsultas } from './consultas';
import { crearRepositorioClientes } from './RepositorioClientesSql';
import { crearRepositorioLotes } from './RepositorioLotesSql';
import { crearRepositorioPagos } from './RepositorioPagosSql';
import { crearRepositorioProyectos } from './RepositorioProyectosSql';
import { crearRepositorioReservas } from './RepositorioReservasSql';
import { crearRepositorioUsuarios } from './RepositorioUsuariosSql';
import { crearRepositorioVentas } from './RepositorioVentasSql';

export function crearRepositorios(sql: EjecutorSql): Repositorios {
  const bd = crearConsultas(sql);
  return {
    proyectos: crearRepositorioProyectos(bd),
    lotes: crearRepositorioLotes(bd),
    clientes: crearRepositorioClientes(bd),
    reservas: crearRepositorioReservas(bd),
    ventas: crearRepositorioVentas(bd),
    pagos: crearRepositorioPagos(bd),
    usuarios: crearRepositorioUsuarios(bd),
  };
}
