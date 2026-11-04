import type { RepositorioLotes } from '../../../aplicacion/puertos';
import type { EstadoLote } from '../../../dominio/tipos';
import { construirUpdate, construirWhere, type Consultas } from './consultas';
import { aLote } from './conversiones';
import type { FilaLote } from './filas';

export function crearRepositorioLotes(bd: Consultas): RepositorioLotes {
  return {
    async listarPorProyecto(proyectoId, filtros = {}) {
      const busqueda = filtros.busqueda?.trim();
      const { where, parametros } = construirWhere([
        ['proyecto_id = ?', proyectoId],
        ['estado = ?', filtros.estado],
        ['manzano = ?', filtros.manzano],
        ['etapa = ?', filtros.etapa],
        ['codigo ILIKE ?', busqueda ? `%${busqueda}%` : undefined],
      ]);
      const filas = await bd.filas<FilaLote>(
        `SELECT * FROM lotes ${where} ORDER BY etapa, manzano, codigo`,
        parametros,
      );
      return filas.map(aLote);
    },

    async buscarPorId(id) {
      const fila = await bd.fila<FilaLote>('SELECT * FROM lotes WHERE id = $1', [id]);
      return fila && aLote(fila);
    },

    async buscarPorCodigo(proyectoId, codigo) {
      const fila = await bd.fila<FilaLote>(
        'SELECT * FROM lotes WHERE proyecto_id = $1 AND codigo = $2',
        [proyectoId, codigo],
      );
      return fila && aLote(fila);
    },

    async crear(proyectoId, d) {
      const fila = await bd.filaObligatoria<FilaLote>(
        `INSERT INTO lotes (proyecto_id, codigo, manzano, etapa, superficie_m2, dimensiones, precio, geometria)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          proyectoId,
          d.codigo,
          d.manzano,
          d.etapa,
          d.superficieM2,
          d.dimensiones,
          d.precio,
          JSON.stringify(d.geometria),
        ],
      );
      return aLote(fila);
    },

    async actualizar(id, c) {
      const { sql, parametros } = construirUpdate(
        'lotes',
        id,
        {
          codigo: c.codigo,
          manzano: c.manzano,
          etapa: c.etapa,
          superficie_m2: c.superficieM2,
          dimensiones: c.dimensiones,
          precio: c.precio,
          geometria: c.geometria && JSON.stringify(c.geometria),
        },
        true,
      );
      return aLote(await bd.filaObligatoria<FilaLote>(sql, parametros));
    },

    async cambiarEstadoSi(id, estadoEsperado, nuevoEstado) {
      // Un solo UPDATE condicional: si otro usuario cambió el estado antes, no se actualiza
      // ninguna fila y la operación se rechaza (dos personas no reservan el mismo lote).
      const actualizadas = await bd.filas(
        `UPDATE lotes SET estado = $1, actualizado_en = now()
         WHERE id = $2 AND estado = $3 RETURNING id`,
        [nuevoEstado, id, estadoEsperado],
      );
      return actualizadas.length === 1;
    },

    async contarPorEstado() {
      const filas = await bd.filas<{ proyecto_id: number; estado: string; cantidad: number }>(
        'SELECT proyecto_id, estado, count(*)::int AS cantidad FROM lotes GROUP BY proyecto_id, estado',
      );
      return filas.map((f) => ({
        proyectoId: f.proyecto_id,
        estado: f.estado as EstadoLote,
        cantidad: f.cantidad,
      }));
    },

    async tieneOperaciones(id) {
      const fila = await bd.fila<{ total: number }>(
        `SELECT (SELECT count(*) FROM reservas WHERE lote_id = $1)
              + (SELECT count(*) FROM ventas WHERE lote_id = $1) AS total`,
        [id],
      );
      return Number(fila?.total) > 0;
    },

    async eliminar(id) {
      await bd.filas('DELETE FROM lotes WHERE id = $1', [id]);
    },
  };
}
