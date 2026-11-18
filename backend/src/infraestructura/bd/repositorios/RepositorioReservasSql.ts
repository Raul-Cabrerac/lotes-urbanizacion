import type { RepositorioReservas } from '../../../aplicacion/puertos';
import { OPERACIONES_RESERVA } from '../../../dominio/reserva';
import { construirWhere, transicionarSi, type Consultas } from './consultas';
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

export function crearRepositorioReservas(bd: Consultas): RepositorioReservas {
  return {
    async listar(filtros = {}) {
      const { where, parametros } = construirWhere([
        ['r.estado = ?', filtros.estado],
        ['r.cliente_id = ?', filtros.clienteId],
        ['r.lote_id = ?', filtros.loteId],
        ['l.proyecto_id = ?', filtros.proyectoId],
      ]);
      const filas = await bd.filas<FilaReservaVista>(
        `${SQL_RESERVA_VISTA} ${where} ORDER BY r.fecha DESC, r.id DESC`,
        parametros,
      );
      return filas.map(aReservaVista);
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
        `INSERT INTO reservas (lote_id, cliente_id, asesor_id, fecha, fecha_vencimiento, observacion)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [d.loteId, d.clienteId, d.asesorId, d.fecha, d.fechaVencimiento, d.observacion],
      );
      return aReserva(fila);
    },

    async finalizar(id, transicion, fecha, motivo) {
      const columnas = { finalizada_en: fecha, motivo_finalizacion: motivo ?? null };
      return (await transicionarSi(bd, 'reservas', id, transicion, columnas)) !== null;
    },
  };
}
