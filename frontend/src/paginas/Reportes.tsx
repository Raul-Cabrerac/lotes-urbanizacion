import { Link } from 'react-router';
import { api } from '../api/api';
import { Cargando, Encabezado, Insignia, MensajeError } from '../componentes/Basicos';
import { bs, fechaHora } from '../utilidades/formato';
import { useDatos } from '../utilidades/useDatos';

/** Reporte general para el administrador. */
export function Reportes() {
  const { datos: reporte, error, cargando, recargar } = useDatos(() => api.reportes.resumen(), []);

  return (
    <div className="pagina">
      <Encabezado titulo="Reportes" subtitulo={reporte ? `Generado el ${fechaHora(reporte.generadoEn)}` : undefined}>
        <button className="boton" onClick={recargar} data-testid="reporte-actualizar">
          ↻ Actualizar
        </button>
      </Encabezado>
      <MensajeError mensaje={error} />
      {cargando && !reporte && <Cargando />}
      {reporte && (
        <>
          <div className="indicadores">
            <div className="tarjeta indicador">
              <span>Monto vendido (ventas vigentes)</span>
              <strong data-testid="reporte-vendido">{bs(reporte.totales.montoVendido)}</strong>
            </div>
            <div className="tarjeta indicador">
              <span>Total cobrado (ventas vigentes)</span>
              <strong className="monto-verde" data-testid="reporte-cobrado">{bs(reporte.totales.totalCobrado)}</strong>
            </div>
            <div className="tarjeta indicador">
              <span>Saldo por cobrar (ventas vigentes)</span>
              <strong data-testid="reporte-por-cobrar">{bs(reporte.totales.saldoPorCobrar)}</strong>
            </div>
            <div className="tarjeta indicador">
              <span>Monto en cuotas vencidas</span>
              <strong className="monto-rojo" data-testid="reporte-vencido">{bs(reporte.totales.montoVencido)}</strong>
            </div>
          </div>

          <div className="tarjeta sin-relleno">
            <table className="tabla" data-testid="tabla-reporte">
              <thead>
                <tr>
                  <th>Proyecto</th>
                  <th className="numero">Lotes</th>
                  <th className="numero">Disp.</th>
                  <th className="numero">Res.</th>
                  <th className="numero">Vend.</th>
                  <th className="numero">Bloq.</th>
                  <th className="numero">Reservas activas</th>
                  <th className="numero">Vendido</th>
                  <th className="numero">Cobrado</th>
                  <th className="numero">Por cobrar</th>
                  <th className="numero">Cuotas vencidas</th>
                </tr>
              </thead>
              <tbody>
                {reporte.proyectos.map((f) => (
                  <tr key={f.proyecto.id}>
                    <td>
                      <Link to={`/proyectos/${f.proyecto.id}`} data-testid={`reporte-proyecto-${f.proyecto.id}`}>
                        {f.proyecto.nombre}
                      </Link> <Insignia estado={f.proyecto.estado} />
                    </td>
                    <td className="numero">{f.lotes.total}</td>
                    <td className="numero">{f.lotes.porEstado.DISPONIBLE}</td>
                    <td className="numero">{f.lotes.porEstado.RESERVADO}</td>
                    <td className="numero">{f.lotes.porEstado.VENDIDO}</td>
                    <td className="numero">{f.lotes.porEstado.BLOQUEADO}</td>
                    <td className="numero">{f.reservasActivas}</td>
                    <td className="numero">{bs(f.montoVendido)}</td>
                    <td className="numero">{bs(f.totalCobrado)}</td>
                    <td className="numero">{bs(f.saldoPorCobrar)}</td>
                    <td className="numero">
                      {f.cuotasVencidas} {f.cuotasVencidas > 0 && <span className="texto-alerta">({bs(f.montoVencido)})</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
