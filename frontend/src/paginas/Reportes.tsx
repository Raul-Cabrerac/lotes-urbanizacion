import { Link } from 'react-router';
import { api } from '../api/api';
import { Cargando, ContenedorTabla, Encabezado, Insignia, MensajeError } from '../componentes/Basicos';
import { Icono } from '../componentes/Icono';
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
            <table className="tabla" data-testid="tabla-reporte">
              <thead>
                <tr>
                  <th>Proyecto</th>
                  <th className="numero">Lotes</th>
                  <th className="numero">Disponibles</th>
                  <th className="numero">Reservados</th>
                  <th className="numero">Vendidos</th>
                  <th className="numero">Bloqueados</th>
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
                    <td className="numero" data-etiqueta="Lotes">{f.lotes.total}</td>
                    <td className="numero" data-etiqueta="Disponibles">{f.lotes.porEstado.DISPONIBLE}</td>
                    <td className="numero" data-etiqueta="Reservados">{f.lotes.porEstado.RESERVADO}</td>
                    <td className="numero" data-etiqueta="Vendidos">{f.lotes.porEstado.VENDIDO}</td>
                    <td className="numero" data-etiqueta="Bloqueados">{f.lotes.porEstado.BLOQUEADO}</td>
                    <td className="numero" data-etiqueta="Reservas activas">{f.reservasActivas}</td>
                    <td className="numero" data-etiqueta="Vendido">{bs(f.montoVendido)}</td>
                    <td className="numero" data-etiqueta="Cobrado">{bs(f.totalCobrado)}</td>
                    <td className="numero" data-etiqueta="Por cobrar">{bs(f.saldoPorCobrar)}</td>
                    <td className="numero" data-etiqueta="Cuotas vencidas">
                      {f.cuotasVencidas} {f.cuotasVencidas > 0 && <span className="texto-alerta">({bs(f.montoVencido)})</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ContenedorTabla>
        </>
      )}
    </div>
  );
}
