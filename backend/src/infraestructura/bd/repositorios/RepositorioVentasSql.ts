import type { FiltrosVentas, RepositorioVentas, VentaVista } from '../../../aplicacion/puertos';
import { armarPagina } from '../../../dominio/paginacion';
import type { Cuota } from '../../../dominio/tipos';
import { OPERACIONES_VENTA } from '../../../dominio/venta';
import { construirWhere, consultarPagina, transicionarSi, type Consultas } from './consultas';
import { aClienteResumen, aCuota, aLoteResumen, aPagoVista, aVenta } from './conversiones';
import {
  COLUMNAS_CLIENTE_Y_ASESOR,
  COLUMNAS_LOTE,
  type FilaCuota,
  type FilaPagoVista,
  type FilaVenta,
  type FilaVentaVista,
  joinsDeOperacion,
} from './filas';

/** Venta con su lote, proyecto, cliente, asesor y quién la anuló. */
const SQL_VENTA_VISTA = `
  SELECT v.*, ${COLUMNAS_LOTE}, ${COLUMNAS_CLIENTE_Y_ASESOR}, an.nombre AS an_nombre
  FROM ventas v ${joinsDeOperacion('v')}
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

/** De la más nueva a la más vieja. */
const ORDEN_VENTAS = 'v.fecha DESC, v.id DESC';

/** Las ventas que cumplen los filtros (sin ORDER BY). */
function consultaVentas(filtros: FiltrosVentas): { sql: string; parametros: unknown[] } {
  const { where, parametros } = construirWhere([
    ['v.cliente_id = ?', filtros.clienteId],
    ['v.lote_id = ?', filtros.loteId],
    ['v.estado = ?', filtros.estado],
    ['l.proyecto_id = ?', filtros.proyectoId],
  ]);
  return { sql: `${SQL_VENTA_VISTA} ${where}`, parametros };
}

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
      const { sql, parametros } = consultaVentas(filtros);
      const filas = await bd.filas<FilaVentaVista>(`${sql} ORDER BY ${ORDEN_VENTAS}`, parametros);
      return completarVentas(filas);
    },

    async listarPagina(filtros, paginacion) {
      const { sql, parametros } = consultaVentas(filtros);
      const { filas, total } = await consultarPagina<FilaVentaVista>(bd, sql, parametros, ORDEN_VENTAS, paginacion);
      return armarPagina(await completarVentas(filas), total, paginacion);
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
      // Dos anulaciones simultáneas: gana una.
      const columnas = { motivo_anulacion: motivo, anulada_por_id: anuladaPorId, anulada_en: fecha };
      return (await transicionarSi(bd, 'ventas', id, OPERACIONES_VENTA.anular, columnas)) !== null;
    },
  };
}
