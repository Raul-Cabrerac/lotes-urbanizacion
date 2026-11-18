import type { RepositorioVentas, VentaVista } from '../../../aplicacion/puertos';
import type { Cuota } from '../../../dominio/tipos';
import { construirWhere, type Consultas } from './consultas';
import { aClienteResumen, aCuota, aLoteResumen, aPagoVista, aVenta } from './conversiones';
import {
  COLUMNAS_LOTE,
  type FilaCuota,
  type FilaPagoVista,
  type FilaVenta,
  type FilaVentaVista,
} from './filas';

/** Venta con su lote, proyecto, cliente, asesor y quién la anuló. */
const SQL_VENTA_VISTA = `
  SELECT v.*, ${COLUMNAS_LOTE},
         c.nombre_completo AS c_nombre_completo, c.documento AS c_documento, c.telefono AS c_telefono,
         a.nombre AS a_nombre, an.nombre AS an_nombre
  FROM ventas v
  JOIN lotes l ON l.id = v.lote_id
  JOIN proyectos p ON p.id = l.proyecto_id
  JOIN clientes c ON c.id = v.cliente_id
  JOIN usuarios a ON a.id = v.asesor_id
  LEFT JOIN usuarios an ON an.id = v.anulada_por_id`;

/** Historial de pagos con la cuota a la que pertenecen y quién los registró o anuló. */
const SQL_PAGOS_DE_VENTAS = `
  SELECT pg.*, cu.venta_id, cu.numero AS cuota_numero, cu.concepto AS cuota_concepto,
         rp.nombre AS registrado_por_nombre, ap.nombre AS anulado_por_nombre
  FROM pagos pg
  JOIN cuotas cu ON cu.id = pg.cuota_id
  JOIN usuarios rp ON rp.id = pg.registrado_por_id
  LEFT JOIN usuarios ap ON ap.id = pg.anulado_por_id
  WHERE cu.venta_id = ANY($1::int[])
  ORDER BY pg.fecha, pg.id`;

export function crearRepositorioVentas(bd: Consultas): RepositorioVentas {
  /** Agrega a cada venta sus cuotas y su historial de pagos (2 consultas para todas las ventas). */
  async function completarVentas(ventas: FilaVentaVista[]): Promise<VentaVista[]> {
    if (ventas.length === 0) return [];
    const ids = ventas.map((v) => v.id);
    const [cuotas, pagos] = await Promise.all([
      bd.filas<FilaCuota>(
        'SELECT * FROM cuotas WHERE venta_id = ANY($1::int[]) ORDER BY venta_id, numero',
        [ids],
      ),
      bd.filas<FilaPagoVista>(SQL_PAGOS_DE_VENTAS, [ids]),
    ]);
    return ventas.map((v) => ({
      ...aVenta(v),
      lote: aLoteResumen(v),
      cliente: aClienteResumen(v),
      asesor: { id: v.asesor_id, nombre: v.a_nombre },
      anuladaPor: v.anulada_por_id ? { id: v.anulada_por_id, nombre: v.an_nombre ?? '' } : null,
      cuotas: cuotas.filter((c) => c.venta_id === v.id).map(aCuota),
      pagos: pagos.filter((p) => p.venta_id === v.id).map(aPagoVista),
    }));
  }

  return {
    async listar(filtros = {}) {
      const { where, parametros } = construirWhere([
        ['v.cliente_id = ?', filtros.clienteId],
        ['v.lote_id = ?', filtros.loteId],
        ['v.estado = ?', filtros.estado],
        ['l.proyecto_id = ?', filtros.proyectoId],
      ]);
      const filas = await bd.filas<FilaVentaVista>(
        `${SQL_VENTA_VISTA} ${where} ORDER BY v.fecha DESC, v.id DESC`,
        parametros,
      );
      return completarVentas(filas);
    },

    async buscarPorId(id) {
      const filas = await bd.filas<FilaVentaVista>(`${SQL_VENTA_VISTA} WHERE v.id = $1`, [id]);
      return (await completarVentas(filas))[0] ?? null;
    },

    async bloquearPorId(id) {
      // Otra transacción que pida la misma venta espera aquí hasta que esta termine.
      await bd.filas('SELECT id FROM ventas WHERE id = $1 FOR UPDATE', [id]);
    },

    async crear(d, cuotasNuevas) {
      const venta = await bd.filaObligatoria<FilaVenta>(
        `INSERT INTO ventas (lote_id, cliente_id, asesor_id, reserva_id, fecha, precio_pactado,
                             modalidad, cuota_inicial, numero_cuotas)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          d.loteId,
          d.clienteId,
          d.asesorId,
          d.reservaId,
          d.fecha,
          d.precioPactado,
          d.modalidad,
          d.cuotaInicial,
          d.numeroCuotas,
        ],
      );
      const cuotas: Cuota[] = [];
      for (const c of cuotasNuevas) {
        const cuota = await bd.filaObligatoria<FilaCuota>(
          `INSERT INTO cuotas (venta_id, numero, concepto, monto, fecha_vencimiento)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [venta.id, c.numero, c.concepto, c.monto, c.fechaVencimiento],
        );
        cuotas.push(aCuota(cuota));
      }
      return { ...aVenta(venta), cuotas };
    },

    async anular(id, { motivo, anuladaPorId, fecha }) {
      // Solo anula una venta que sigue VIGENTE (dos anulaciones simultáneas: gana una).
      const actualizadas = await bd.filas(
        `UPDATE ventas SET estado = 'ANULADA', motivo_anulacion = $1, anulada_por_id = $2, anulada_en = $3
         WHERE id = $4 AND estado = 'VIGENTE' RETURNING id`,
        [motivo, anuladaPorId, fecha, id],
      );
      return actualizadas.length === 1;
    },
  };
}
