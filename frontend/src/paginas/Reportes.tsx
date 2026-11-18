import { Link } from 'react-router';
import { api } from '../api/api';
import { ESTADOS_LOTE } from '../dominio';
import type { Reporte } from '../api/tiposOperaciones';
import { Cargando, ContenedorTabla, Encabezado, Insignia, MensajeError } from '../componentes/Basicos';
import { Icono } from '../componentes/Icono';
import { Tabla } from '../componentes/Tabla';
import { ASPECTO_ESTADO } from '../utilidades/estados';
import { bs, fechaHora } from '../utilidades/formato';
import { useDatos } from '../utilidades/useDatos';

/** Reporte general para el administrador. */
export function Reportes() {
  const { datos: reporte, error, cargando, recargar } = useDatos(() => api.reportes.resumen(), []);

  return (
    <div className="pagina">
      <Encabezado titulo="Reportes" subtitulo={reporte ? `Generado el ${fechaHora(reporte.generadoEn)}` : undefined}>
        <button className="boton" onClick={recargar} data-testid="reporte-actualizar">
          <Icono nombre="actualizar" />
          Actualizar
        </button>
      </Encabezado>
      <MensajeError mensaje={error} />
      {cargando && !reporte && <Cargando />}
      {reporte && (
        <>
          <div className="indicadores">
            <div className="indicador">
              <span>Monto vendido (ventas vigentes)</span>
              <strong data-testid="reporte-vendido">{bs(reporte.totales.montoVendido)}</strong>
            </div>
            <div className="indicador">
              <span>Total cobrado (ventas vigentes)</span>
              <strong className="monto-verde" data-testid="reporte-cobrado">{bs(reporte.totales.totalCobrado)}</strong>
            </div>
            <div className="indicador">
              <span>Saldo por cobrar (ventas vigentes)</span>
              <strong data-testid="reporte-por-cobrar">{bs(reporte.totales.saldoPorCobrar)}</strong>
            </div>
            <div className="indicador">
              <span>Monto en cuotas vencidas</span>
              <strong className="monto-rojo" data-testid="reporte-vencido">{bs(reporte.totales.montoVencido)}</strong>
            </div>
          </div>

          <ContenedorTabla etiqueta="Resumen por proyecto">
            <Tabla
              testid="tabla-reporte"
              filas={reporte.proyectos}
              clave={(f) => f.proyecto.id}
              columnas={[
                {
                  titulo: 'Proyecto',
                  encabezaFicha: true,
                  celda: (f) => (
                    <>
                      <Link to={`/proyectos/${f.proyecto.id}`} data-testid={`reporte-proyecto-${f.proyecto.id}`}>
                        {f.proyecto.nombre}
                      </Link>{' '}
                      <Insignia estado={f.proyecto.estado} />
                    </>
                  ),
                },
                { titulo: 'Lotes', clase: 'numero', celda: (f) => f.lotes.total },
                ...ESTADOS_LOTE.map((estado) => ({
                  titulo: ASPECTO_ESTADO[estado].plural,
                  clase: 'numero',
                  celda: (f: Reporte['proyectos'][number]) => f.lotes.porEstado[estado],
                })),
                { titulo: 'Reservas activas', clase: 'numero', celda: (f) => f.reservasActivas },
                { titulo: 'Vendido', clase: 'numero', celda: (f) => bs(f.montoVendido) },
                { titulo: 'Cobrado', clase: 'numero', celda: (f) => bs(f.totalCobrado) },
                { titulo: 'Por cobrar', clase: 'numero', celda: (f) => bs(f.saldoPorCobrar) },
                {
                  titulo: 'Cuotas vencidas',
                  clase: 'numero',
                  celda: (f) => (
                    <>
                      {f.cuotasVencidas} {f.cuotasVencidas > 0 && <span className="texto-alerta">({bs(f.montoVencido)})</span>}
                    </>
                  ),
                },
              ]}
            />
          </ContenedorTabla>
        </>
      )}
    </div>
  );
}
