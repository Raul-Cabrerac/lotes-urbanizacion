import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api/api';
import type { Cuota, Pago } from '../api/tiposOperaciones';
import { operacionesDeLaVenta } from '../dominio';
import { AccesoDenegado } from '../auth/AccesoDenegado';
import { useSesion } from '../auth/Sesion';
import { useAvisos } from '../componentes/Avisos';
import { Cargando, ContenedorTabla, Dato, Encabezado, Insignia, MensajeError, Vacio } from '../componentes/Basicos';
import { Icono } from '../componentes/Icono';
import { MapaLotes } from '../componentes/mapa/MapaLotes';
import { ModalConfirmar } from '../componentes/ModalConfirmar';
import { Tabla } from '../componentes/Tabla';
import { ETIQUETA_MODALIDAD } from '../utilidades/estados';
import { bs, fecha, fechaHora, m2, plural } from '../utilidades/formato';
import { useDatos } from '../utilidades/useDatos';
import { ModalPago } from './ModalPago';

/** Detalle de una venta: plan de pagos, pagos realizados y saldo (consigna, secciones 9 y 10). */
export function VentaDetalle() {
  const id = Number(useParams().id);
  const { puede } = useSesion();
  const avisos = useAvisos();
  const { datos: venta, error, estadoError, setDatos, recargar } = useDatos(() => api.ventas.obtener(id), [id]);
  const [pagando, setPagando] = useState<Cuota | null>(null);
  const [anulandoPago, setAnulandoPago] = useState<Pago | null>(null);
  const [anulandoVenta, setAnulandoVenta] = useState(false);

  if (estadoError === 403) return <AccesoDenegado />; // p. ej. un cliente que abre la venta de otro
  if (error) return <div className="pagina"><MensajeError mensaje={error} /></div>;
  if (!venta) return <Cargando />;

  const vigente = venta.estado === 'VIGENTE';
  const admite = operacionesDeLaVenta(venta);
  const { resumen } = venta;
  const porcentajePagado = Math.min(100, Math.round((resumen.totalPagado / venta.precioPactado) * 100));
  const desdePortal = puede('portal:ver');

  return (
    <div className="pagina">
      <Link to={desdePortal ? '/mi-portal' : '/ventas'} className="enlace-volver" data-testid="volver-ventas">
        <Icono nombre="volver" />
        {desdePortal ? 'Mis lotes' : 'Ventas'}
      </Link>
      <Encabezado
        titulo={`Plan de pagos · Lote ${venta.lote.codigo}`}
        subtitulo={`${venta.lote.proyecto.nombre} · Venta N° ${venta.id} del ${fecha(venta.fecha)}`}
      >
        <Insignia estado={venta.estado} testid="venta-estado" />
        {admite.anular && puede('ventas:anular') && (
          <button type="button" className="boton boton-texto-peligro" onClick={() => setAnulandoVenta(true)} data-testid="anular-venta">
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
          <progress className="barra-progreso" value={porcentajePagado} max={100} aria-label="Porcentaje pagado" />
          <div className="texto-suave pequeno">
            {resumen.saldada
              ? 'Venta pagada en su totalidad'
              : `${porcentajePagado}% pagado · ${resumen.cuotasPagadas} de ${venta.cuotas.length} cuotas pagadas`}
          </div>
          {vigente && resumen.cuotasVencidas > 0 && (
            <div className="texto-alerta pequeno" data-testid="venta-vencidas">
              {plural(resumen.cuotasVencidas, 'cuota vencida', 'cuotas vencidas')} por {bs(resumen.montoVencido)}
            </div>
          )}
        </div>

        <div className="tarjeta grilla-datos">
          <Dato etiqueta="Cliente">
            {venta.cliente.nombreCompleto}
            <div className="texto-suave pequeno">CI/NIT {venta.cliente.documento}</div>
          </Dato>
          <Dato etiqueta="Asesor">{venta.asesor.nombre}</Dato>
          <Dato etiqueta="Modalidad">{ETIQUETA_MODALIDAD[venta.modalidad]}</Dato>
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
          <MapaLotes key={venta.id} lotes={[venta.lote]} seleccionadoId={venta.lote.id} />
        </div>
      </div>

      <h2 className="titulo-seccion">Cronograma de cuotas</h2>
      <ContenedorTabla etiqueta="Cronograma de cuotas">
        <Tabla
          testid="tabla-cuotas"
          filas={venta.cuotas}
          clave={(c) => c.id}
          atributosFila={(c) => ({ 'data-testid': `cuota-${c.numero}`, 'data-estado': c.estado })}
          columnas={[
            { titulo: 'N°', celda: (c) => c.numero },
            { titulo: 'Concepto', celda: (c) => c.concepto },
            { titulo: 'Vence', celda: (c) => fecha(c.fechaVencimiento) },
            { titulo: 'Monto', clase: 'numero', celda: (c) => bs(c.monto) },
            { titulo: 'Pagado', clase: 'numero', celda: (c) => bs(c.montoPagado) },
            { titulo: 'Pendiente', clase: 'numero', celda: (c) => bs(c.montoPendiente) },
            { titulo: 'Estado', celda: (c) => <Insignia estado={c.estado} testid={`cuota-${c.numero}-estado`} /> },
            {
              titulo: '',
              clase: 'numero',
              celda: (c) =>
                admite.pagar(c) && puede('pagos:registrar') && (
                  <button type="button" className="boton boton-chico boton-primario" onClick={() => setPagando(c)} data-testid={`pagar-cuota-${c.numero}`}>
                    Registrar pago
                  </button>
                ),
            },
          ]}
        />
      </ContenedorTabla>

      <h2 className="titulo-seccion">Historial de pagos</h2>
      <ContenedorTabla etiqueta="Historial de pagos">
        {venta.pagos.length === 0 ? (
          <Vacio>Todavía no hay pagos.</Vacio>
        ) : (
          <Tabla
            testid="tabla-pagos"
            filas={venta.pagos}
            clave={(p) => p.id}
            atributosFila={(p) => ({ className: p.estado === 'ANULADO' ? 'fila-anulada' : '', 'data-testid': `pago-${p.id}` })}
            columnas={[
              { titulo: 'Fecha', celda: (p) => fechaHora(p.fecha) },
              { titulo: 'Cuota', celda: (p) => p.cuotaConcepto },
              { titulo: 'Monto', clase: 'numero', celda: (p) => bs(p.monto) },
              { titulo: 'Método', celda: (p) => p.metodo },
              { titulo: 'Referencia', celda: (p) => p.referencia || '—' },
              { titulo: 'Registrado por', celda: (p) => p.registradoPor.nombre },
              {
                titulo: 'Estado',
                celda: (p) => (
                  <div>
                    <Insignia estado={p.estado} />
                    {p.estado === 'ANULADO' && (
                      <div className="texto-suave pequeno">
                        {fechaHora(p.anuladoEn)} · {p.anuladoPor?.nombre}: {p.motivoAnulacion}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                titulo: '',
                clase: 'numero',
                celda: (p) =>
                  admite.anularPago(p) && puede('pagos:anular') && (
                    <button type="button" className="boton boton-chico boton-texto-peligro" onClick={() => setAnulandoPago(p)} data-testid={`anular-pago-${p.id}`}>
                      Anular
                    </button>
                  ),
              },
            ]}
          />
        )}
      </ContenedorTabla>

      {pagando && (
        <ModalPago
          venta={venta}
          cuota={pagando}
          onCerrar={() => setPagando(null)}
          onConflicto={() => void recargar()}
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
          onConflicto={() => void recargar()}
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
          onConflicto={() => void recargar()}
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
