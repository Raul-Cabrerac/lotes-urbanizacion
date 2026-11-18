import type { RepositorioPagos } from '../../../aplicacion/puertos';
import { OPERACIONES_PAGO } from '../../../dominio/planPagos';
import { transicionarSi, type Consultas } from './consultas';
import { aPago } from './conversiones';
import type { FilaPago } from './filas';

export function crearRepositorioPagos(bd: Consultas): RepositorioPagos {
  return {
    async buscarPorId(id) {
      const fila = await bd.fila<FilaPago & { venta_id: number }>(
        `SELECT pg.*, cu.venta_id FROM pagos pg JOIN cuotas cu ON cu.id = pg.cuota_id
         WHERE pg.id = $1`,
        [id],
      );
      return fila && { ...aPago(fila), ventaId: fila.venta_id };
    },

    async crear(d) {
      const fila = await bd.filaObligatoria<FilaPago>(
        `INSERT INTO pagos (cuota_id, monto, metodo, referencia, fecha, registrado_por_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [d.cuotaId, d.monto, d.metodo, d.referencia, d.fecha, d.registradoPorId],
      );
      return aPago(fila);
    },

    async anular(id, { motivo, anuladoPorId, fecha }) {
      // Un pago nunca se borra: se marca ANULADO con motivo, usuario y fecha (trazabilidad).
      // En dos anulaciones simultáneas, la segunda no pisa a la primera.
      const columnas = { motivo_anulacion: motivo, anulado_por_id: anuladoPorId, anulado_en: fecha };
      return (await transicionarSi(bd, 'pagos', id, OPERACIONES_PAGO.anular, columnas)) !== null;
    },
  };
}
