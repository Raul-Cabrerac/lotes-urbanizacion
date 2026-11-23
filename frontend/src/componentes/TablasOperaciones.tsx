/** Tablas de reservas y ventas reutilizadas en varias pantallas. */
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { Reserva, Venta } from '../api/tiposOperaciones';
import { ETIQUETA_MODALIDAD } from '../utilidades/estados';
import { bs, fecha, plural } from '../utilidades/formato';
import { Insignia, Vacio } from './Basicos';
import { Tabla } from './Tabla';

export function TablaVentas({ ventas, mostrarCliente = true }: { ventas: Venta[]; mostrarCliente?: boolean }) {
  if (ventas.length === 0) return <Vacio>No hay ventas.</Vacio>;
  return (
    <Tabla
      testid="tabla-ventas"
      filas={ventas}
      clave={(v) => v.id}
      atributosFila={(v) => ({ 'data-testid': `fila-venta-${v.lote.codigo}` })}
      columnas={[
        { titulo: 'Fecha', celda: (v) => fecha(v.fecha) },
        { titulo: 'Lote', celda: (v) => <strong className="codigo">{v.lote.codigo}</strong> },
        { titulo: 'Proyecto', celda: (v) => v.lote.proyecto.nombre },
        mostrarCliente && { titulo: 'Cliente', celda: (v) => v.cliente.nombreCompleto },
        {
          titulo: 'Modalidad',
          celda: (v) =>
            v.modalidad === 'CONTADO'
              ? ETIQUETA_MODALIDAD.CONTADO
              : `${ETIQUETA_MODALIDAD.FINANCIADO} en ${plural(v.numeroCuotas, 'cuota', 'cuotas')}`,
        },
        { titulo: 'Precio pactado', clase: 'numero', celda: (v) => bs(v.precioPactado) },
        { titulo: 'Pagado', clase: 'numero', celda: (v) => bs(v.resumen.totalPagado) },
        {
          titulo: 'Saldo',
          clase: 'numero',
          celda: (v) => (
            <div>
              {bs(v.resumen.saldoPendiente)}
              {v.resumen.cuotasVencidas > 0 && v.estado === 'VIGENTE' && (
                <div className="texto-alerta pequeno">{plural(v.resumen.cuotasVencidas, 'cuota vencida', 'cuotas vencidas')}</div>
              )}
            </div>
          ),
        },
        { titulo: 'Estado', celda: (v) => <Insignia estado={v.estado} /> },
        {
          titulo: '',
          celda: (v) => (
            <Link className="boton boton-chico" to={`/ventas/${v.id}`} data-testid={`ver-venta-${v.lote.codigo}`}>
              Plan de pagos
            </Link>
          ),
        },
      ]}
    />
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
    <Tabla
      testid="tabla-reservas"
      filas={reservas}
      clave={(r) => r.id}
      atributosFila={(r) => ({ 'data-testid': `fila-reserva-${r.lote.codigo}` })}
      columnas={[
        { titulo: 'Fecha', celda: (r) => fecha(r.fecha) },
        { titulo: 'Lote', celda: (r) => <strong className="codigo">{r.lote.codigo}</strong> },
        { titulo: 'Proyecto', celda: (r) => r.lote.proyecto.nombre },
        mostrarCliente && { titulo: 'Cliente', celda: (r) => r.cliente.nombreCompleto },
        { titulo: 'Vence', celda: (r) => (r.fechaVencimiento ? fecha(r.fechaVencimiento) : 'Sin vencimiento') },
        { titulo: 'Asesor', celda: (r) => r.asesor.nombre },
        { titulo: 'Estado', celda: (r) => <Insignia estado={r.estado} /> },
        {
          titulo: 'Observación / motivo',
          claseCelda: 'texto-suave pequeno',
          celda: (r) => r.motivoFinalizacion ?? r.observacion,
        },
        acciones !== undefined && { titulo: '', clase: 'numero', celda: acciones },
      ]}
    />
  );
}
