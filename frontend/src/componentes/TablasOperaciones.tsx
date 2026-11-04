/** Tablas de reservas y ventas reutilizadas en varias pantallas. */
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { Reserva, Venta } from '../api/tiposOperaciones';
import { bs, fecha } from '../utilidades/formato';
import { Insignia, Vacio } from './Basicos';

export function TablaVentas({ ventas, mostrarCliente = true }: { ventas: Venta[]; mostrarCliente?: boolean }) {
  if (ventas.length === 0) return <Vacio>No hay ventas.</Vacio>;
  return (
    <table className="tabla" data-testid="tabla-ventas">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Lote</th>
          <th>Proyecto</th>
          {mostrarCliente && <th>Cliente</th>}
          <th>Modalidad</th>
          <th className="numero">Precio pactado</th>
          <th className="numero">Pagado</th>
          <th className="numero">Saldo</th>
          <th>Estado</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {ventas.map((v) => (
          <tr key={v.id} data-testid={`fila-venta-${v.lote.codigo}`}>
            <td>{fecha(v.fecha)}</td>
            <td>
              <strong>{v.lote.codigo}</strong>
            </td>
            <td>{v.lote.proyecto.nombre}</td>
            {mostrarCliente && <td>{v.cliente.nombreCompleto}</td>}
            <td>{v.modalidad === 'CONTADO' ? 'Contado' : `Financiado (${v.numeroCuotas} cuotas)`}</td>
            <td className="numero">{bs(v.precioPactado)}</td>
            <td className="numero">{bs(v.resumen.totalPagado)}</td>
            <td className="numero">
              {bs(v.resumen.saldoPendiente)}
              {v.resumen.cuotasVencidas > 0 && v.estado === 'VIGENTE' && (
                <div className="texto-alerta pequeno">{v.resumen.cuotasVencidas} cuota(s) vencida(s)</div>
              )}
            </td>
            <td>
              <Insignia estado={v.estado} />
            </td>
            <td>
              <Link className="boton boton-chico" to={`/ventas/${v.id}`} data-testid={`ver-venta-${v.lote.codigo}`}>
                Plan de pagos
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TablaReservas({
  reservas,
  mostrarCliente = true,
  acciones,
}: {
  reservas: Reserva[];
  mostrarCliente?: boolean;
  acciones?: (reserva: Reserva) => ReactNode;
}) {
  if (reservas.length === 0) return <Vacio>No hay reservas.</Vacio>;
  return (
    <table className="tabla" data-testid="tabla-reservas">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Lote</th>
          <th>Proyecto</th>
          {mostrarCliente && <th>Cliente</th>}
          <th>Vence</th>
          <th>Asesor</th>
          <th>Estado</th>
          <th>Observación / motivo</th>
          {acciones && <th />}
        </tr>
      </thead>
      <tbody>
        {reservas.map((r) => (
          <tr key={r.id} data-testid={`fila-reserva-${r.lote.codigo}`}>
            <td>{fecha(r.fecha)}</td>
            <td>
              <strong>{r.lote.codigo}</strong>
            </td>
            <td>{r.lote.proyecto.nombre}</td>
            {mostrarCliente && <td>{r.cliente.nombreCompleto}</td>}
            <td>{r.fechaVencimiento ? fecha(r.fechaVencimiento) : 'Sin vencimiento'}</td>
            <td>{r.asesor.nombre}</td>
            <td>
              <Insignia estado={r.estado} />
            </td>
            <td className="texto-suave pequeno">{r.motivoFinalizacion ?? r.observacion}</td>
            {acciones && <td className="numero">{acciones(r)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
