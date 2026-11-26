import type { FiltrosReservas, RepositorioReservas } from '../../../aplicacion/puertos';
import { armarPagina } from '../../../dominio/paginacion';
import { OPERACIONES_RESERVA } from '../../../dominio/reserva';
import { construirWhere, consultarPagina, transicionarSi, type Consultas } from './consultas';
import { aReserva, aReservaVista } from './conversiones';
import {
  COLUMNAS_CLIENTE_Y_ASESOR,
  COLUMNAS_LOTE,
  joinsDeOperacion,
  type FilaReserva,
  type FilaReservaVista,
} from './filas';

/** Reserva con su lote, proyecto, cliente y asesor (para mostrarla sin más consultas). */
const SQL_RESERVA_VISTA = `
  SELECT r.*, ${COLUMNAS_LOTE}, ${COLUMNAS_CLIENTE_Y_ASESOR}
  FROM reservas r ${joinsDeOperacion('r')}`;

/** De la más nueva a la más vieja. */
const ORDEN_RESERVAS = 'r.fecha DESC, r.id DESC';

/** Las reservas que cumplen los filtros (sin ORDER BY). */
function consultaReservas(filtros: FiltrosReservas): { sql: string; parametros: unknown[] } {
  const { where, parametros } = construirWhere([
    ['r.estado = ?', filtros.estado],
    ['r.cliente_id = ?', filtros.clienteId],
    ['r.lote_id = ?', filtros.loteId],
    ['l.proyecto_id = ?', filtros.proyectoId],
  ]);
  return { sql: `${SQL_RESERVA_VISTA} ${where}`, parametros };
}

export function crearRepositorioReservas(bd: Consultas): RepositorioReservas {
  return {
    async listar(filtros = {}) {
      const { sql, parametros } = consultaReservas(filtros);
      const filas = await bd.filas<FilaReservaVista>(`${sql} ORDER BY ${ORDEN_RESERVAS}`, parametros);
      return filas.map(aReservaVista);
    },

    async listarPagina(filtros, paginacion) {
      const { sql, parametros } = consultaReservas(filtros);
      const { filas, total } = await consultarPagina<FilaReservaVista>(bd, sql, parametros, ORDEN_RESERVAS, paginacion);
      return armarPagina(filas.map(aReservaVista), total, paginacion);
    },

    async buscarPorId(id) {
      const fila = await bd.fila<FilaReservaVista>(`${SQL_RESERVA_VISTA} WHERE r.id = $1`, [id]);
      return fila && aReservaVista(fila);
    },

    async buscarActivaPorLote(loteId) {
      const fila = await bd.fila<FilaReservaVista>(
        `${SQL_RESERVA_VISTA} WHERE r.lote_id = $1 AND r.estado = 'ACTIVA'`,
        [loteId],
      );
      return fila && aReservaVista(fila);
    },

    async listarCandidatasAVencer() {
      // Cuáles ya vencieron lo decide estaVencida (dominio/reserva.ts), no este SQL.
      const filas = await bd.filas<FilaReserva>(
        'SELECT * FROM reservas WHERE estado = ANY($1) AND fecha_vencimiento IS NOT NULL ORDER BY id',
        [[...OPERACIONES_RESERVA.vencer.de]],
      );
      return filas.map(aReserva);
    },

    async crear(d) {
      const fila = await bd.filaObligatoria<FilaReserva>(
        `INSERT INTO reservas
           (lote_id, cliente_id, asesor_id, fecha, fecha_vencimiento, observacion, anticipo, metodo_anticipo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [d.loteId, d.clienteId, d.asesorId, d.fecha, d.fechaVencimiento, d.observacion, d.anticipo, d.metodoAnticipo],
      );
      return aReserva(fila);
    },

    async finalizar(id, transicion, fecha, motivo) {
      const columnas = { finalizada_en: fecha, motivo_finalizacion: motivo ?? null };
      return (await transicionarSi(bd, 'reservas', id, transicion, columnas)) !== null;
    },
  };
}
