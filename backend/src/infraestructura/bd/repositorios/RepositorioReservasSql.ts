import type { RepositorioReservas } from '../../../aplicacion/puertos';
import { construirWhere, type Consultas } from './consultas';
import { aReserva, aReservaVista } from './conversiones';
import { COLUMNAS_LOTE, type FilaReserva, type FilaReservaVista } from './filas';

/** Reserva con su lote, proyecto, cliente y asesor (para mostrarla sin más consultas). */
const SQL_RESERVA_VISTA = `
  SELECT r.*, ${COLUMNAS_LOTE},
         c.nombre_completo AS c_nombre_completo, c.documento AS c_documento, c.telefono AS c_telefono,
         a.nombre AS a_nombre
  FROM reservas r
  JOIN lotes l ON l.id = r.lote_id
  JOIN proyectos p ON p.id = l.proyecto_id
  JOIN clientes c ON c.id = r.cliente_id
  JOIN usuarios a ON a.id = r.asesor_id`;

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

    async listarActivasVencidas(hoy) {
      const filas = await bd.filas<FilaReserva>(
        "SELECT * FROM reservas WHERE estado = 'ACTIVA' AND fecha_vencimiento < $1::date",
        [hoy],
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

    async finalizar(id, estado, fecha, motivo) {
      await bd.filas(
        `UPDATE reservas SET estado = $1, finalizada_en = $2, motivo_finalizacion = $3
         WHERE id = $4`,
        [estado, fecha, motivo ?? null, id],
      );
    },
  };
}
