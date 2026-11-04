import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api/api';
import type { Cuota, Pago } from '../api/tiposOperaciones';
import { useSesion } from '../auth/Sesion';
import { useAvisos } from '../componentes/Avisos';
import { Cargando, Dato, Encabezado, Insignia, MensajeError } from '../componentes/Basicos';
import { MapaLotes } from '../componentes/mapa/MapaLotes';
import { ModalConfirmar } from '../componentes/ModalConfirmar';
import { bs, fecha, fechaHora, m2 } from '../utilidades/formato';
import { useDatos } from '../utilidades/useDatos';
import { AccesoDenegado } from './Errores';
import { ModalPago } from './ModalPago';

/** Detalle de una venta: plan de pagos, pagos realizados y saldo (consigna, secciones 9 y 10). */
export function VentaDetalle() {
  const id = Number(useParams().id);
  const { puede, usuario } = useSesion();
  const avisos = useAvisos();
  const { datos: venta, error, estadoError, setDatos } = useDatos(() => api.ventas.obtener(id), [id]);
  const [pagando, setPagando] = useState<Cuota | null>(null);
  const [anulandoPago, setAnulandoPago] = useState<Pago | null>(null);
  const [anulandoVenta, setAnulandoVenta] = useState(false);
  const loteEnMapa = useMemo(() => (venta ? [venta.lote] : []), [venta]);

  if (estadoError === 403) return <AccesoDenegado />; // p. ej. un cliente que abre la venta de otro
  if (error) return <div className="pagina"><MensajeError mensaje={error} /></div>;
  if (!venta) return <Cargando />;

  const vigente = venta.estado === 'VIGENTE';
  const { resumen } = venta;
  const porcentajePagado = Math.min(100, Math.round((resumen.totalPagado / venta.precioPactado) * 100));
  const esCliente = usuario?.rol === 'CLIENTE';

  return (
    <div className="pagina">
      <Link to={esCliente ? '/mi-portal' : '/ventas'} className="enlace-volver" data-testid="volver-ventas">
        ← {esCliente ? 'Mis lotes' : 'Ventas'}
      </Link>
      <Encabezado
        titulo={`Plan de pagos · Lote ${venta.lote.codigo}`}
        subtitulo={`${venta.lote.proyecto.nombre} · Venta N° ${venta.id} del ${fecha(venta.fecha)}`}
      >
        <Insignia estado={venta.estado} testid="venta-estado" />
        {vigente && puede('ventas:anular') && (
          <button className="boton boton-texto-peligro" onClick={() => setAnulandoVenta(true)} data-testid="anular-venta">
            Anular venta
          </button>
        )}
      </Encabezado>

      {!vigente && (
        <div className="caja caja-gris" data-testid="venta-anulada">
          Venta anulada el {fechaHora(venta.anuladaEn)} por {venta.anuladaPor?.nombre}. Motivo: {venta.motivoAnulacion}
        </div>
      )}

      <div className="grilla-venta">
        <div className="tarjeta tarjeta-saldo" data-testid="resumen-saldo">
          <div className="saldo-titulo">Lote {venta.lote.codigo}</div>
          <Dato etiqueta="Precio pactado" testid="venta-precio-pactado">
            <span className="monto-verde">{bs(venta.precioPactado)}</span>
          </Dato>
          <Dato etiqueta="Pagado" testid="venta-total-pagado">
            {bs(resumen.totalPagado)}
          </Dato>
          <Dato etiqueta={vigente ? 'Saldo pendiente' : 'Saldo al anular'} testid="venta-saldo">
            <span className={!vigente ? 'texto-suave' : resumen.saldoPendiente > 0 ? 'monto-rojo' : 'monto-verde'}>
              {bs(resumen.saldoPendiente)}
            </span>
          </Dato>
          <div className="barra-progreso" title={`${porcentajePagado}% pagado`}>
            <span style={{ width: `${porcentajePagado}%` }} />
          </div>
          <div className="texto-suave pequeno">
            {resumen.saldada
              ? '¡Venta completamente pagada!'
              : `${porcentajePagado}% pagado · ${resumen.cuotasPagadas} de ${venta.cuotas.length} cuotas pagadas`}
          </div>
          {vigente && resumen.cuotasVencidas > 0 && (
            <div className="texto-alerta pequeno" data-testid="venta-vencidas">
              {resumen.cuotasVencidas} cuota(s) vencida(s) por {bs(resumen.montoVencido)}
            </div>
          )}
        </div>

        <div className="tarjeta grilla-datos">
          <Dato etiqueta="Cliente">
            {venta.cliente.nombreCompleto}
            <div className="texto-suave pequeno">CI/NIT {venta.cliente.documento}</div>
          </Dato>
          <Dato etiqueta="Asesor">{venta.asesor.nombre}</Dato>
          <Dato etiqueta="Modalidad">{venta.modalidad === 'CONTADO' ? 'Al contado' : 'Financiado'}</Dato>
          <Dato etiqueta="Cuota inicial">{venta.modalidad === 'FINANCIADO' ? bs(venta.cuotaInicial) : '—'}</Dato>
          <Dato etiqueta="Cuotas mensuales">{venta.numeroCuotas || '—'}</Dato>
          <Dato etiqueta="Próximo vencimiento" testid="venta-proxima">
            {vigente && resumen.proximaCuota
              ? `${fecha(resumen.proximaCuota.fechaVencimiento)} · ${bs(resumen.proximaCuota.montoPendiente)}`
              : '—'}
          </Dato>
          <Dato etiqueta="Lote">
            Mz {venta.lote.manzano || '—'} · {venta.lote.etapa || '—'} · {m2(venta.lote.superficieM2)}
          </Dato>
          <Dato etiqueta="Origen">{venta.reservaId ? `Reserva N° ${venta.reservaId}` : 'Venta directa'}</Dato>
        </div>

        <div className="tarjeta sin-relleno mapa-mini" data-testid="venta-mapa">
          <MapaLotes lotes={loteEnMapa} seleccionadoId={venta.lote.id} claveVista={venta.id} />
        </div>
      </div>

      <h2 className="titulo-seccion">Cronograma de cuotas</h2>
      <div className="tarjeta sin-relleno">
        <table className="tabla" data-testid="tabla-cuotas">
          <thead>
            <tr>
              <th>N°</th>
              <th>Concepto</th>
              <th>Vence</th>
              <th className="numero">Monto</th>
              <th className="numero">Pagado</th>
              <th className="numero">Pendiente</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {venta.cuotas.map((c) => (
              <tr key={c.id} data-testid={`cuota-${c.numero}`} data-estado={c.estado}>
                <td>{c.numero}</td>
                <td>{c.concepto}</td>
                <td>{fecha(c.fechaVencimiento)}</td>
                <td className="numero">{bs(c.monto)}</td>
                <td className="numero">{bs(c.montoPagado)}</td>
                <td className="numero">{bs(c.montoPendiente)}</td>
                <td>
                  <Insignia estado={c.estado} testid={`cuota-${c.numero}-estado`} />
                </td>
                <td className="numero">
                  {vigente && c.estado !== 'PAGADA' && puede('pagos:registrar') && (
                    <button className="boton boton-chico boton-primario" onClick={() => setPagando(c)} data-testid={`pagar-cuota-${c.numero}`}>
                      Registrar pago
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="titulo-seccion">Historial de pagos</h2>
      <div className="tarjeta sin-relleno">
        {venta.pagos.length === 0 ? (
          <div className="vacio">Todavía no hay pagos.</div>
        ) : (
          <table className="tabla" data-testid="tabla-pagos">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cuota</th>
                <th className="numero">Monto</th>
                <th>Método</th>
                <th>Referencia</th>
                <th>Registrado por</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {venta.pagos.map((p) => (
                <tr key={p.id} className={p.estado === 'ANULADO' ? 'fila-anulada' : ''} data-testid={`pago-${p.id}`}>
                  <td>{fechaHora(p.fecha)}</td>
                  <td>{p.cuotaConcepto}</td>
                  <td className="numero">{bs(p.monto)}</td>
                  <td>{p.metodo}</td>
                  <td>{p.referencia || '—'}</td>
                  <td>{p.registradoPor.nombre}</td>
                  <td>
                    <Insignia estado={p.estado} />
                    {p.estado === 'ANULADO' && (
                      <div className="texto-suave pequeno">
                        {fechaHora(p.anuladoEn)} · {p.anuladoPor?.nombre}: {p.motivoAnulacion}
                      </div>
                    )}
                  </td>
                  <td className="numero">
                    {p.estado === 'VALIDO' && vigente && puede('pagos:anular') && (
                      <button className="boton boton-chico boton-texto-peligro" onClick={() => setAnulandoPago(p)} data-testid={`anular-pago-${p.id}`}>
                        Anular
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagando && (
        <ModalPago
          venta={venta}
          cuota={pagando}
          onCerrar={() => setPagando(null)}
          onPagado={(actualizada) => {
            setPagando(null);
            setDatos(actualizada);
            avisos.exito(`Pago registrado. Nuevo saldo: ${bs(actualizada.resumen.saldoPendiente)}.`);
          }}
        />
      )}
      {anulandoPago && (
        <ModalConfirmar
          titulo="Anular pago"
          mensaje={`El pago de ${bs(anulandoPago.monto)} (${anulandoPago.cuotaConcepto}) quedará ANULADO en el historial y el saldo se recalculará.`}
          motivo={{ etiqueta: 'Motivo de la anulación', obligatorio: true }}
          textoConfirmar="Anular pago"
          peligro
          onCerrar={() => setAnulandoPago(null)}
          onConfirmar={async (motivo) => {
            setDatos(await api.pagos.anular(anulandoPago.id, motivo));
            setAnulandoPago(null);
            avisos.exito('Pago anulado.');
          }}
        />
      )}
      {anulandoVenta && (
        <ModalConfirmar
          titulo="Anular venta"
          mensaje={`La venta quedará ANULADA y el lote ${venta.lote.codigo} volverá a estar DISPONIBLE. Los pagos se conservan en el historial.`}
          motivo={{ etiqueta: 'Motivo de la anulación', obligatorio: true }}
          textoConfirmar="Anular venta"
          peligro
          onCerrar={() => setAnulandoVenta(false)}
          onConfirmar={async (motivo) => {
            setDatos(await api.ventas.anular(venta.id, motivo));
            setAnulandoVenta(false);
            avisos.exito('Venta anulada.');
          }}
        />
      )}
    </div>
  );
}
