import { Link, useParams } from 'react-router';
import { api } from '../api/api';
import { Cargando, ContenedorTabla, Dato, Encabezado, MensajeError } from '../componentes/Basicos';
import { Icono } from '../componentes/Icono';
import { TablaReservas, TablaVentas } from '../componentes/TablasOperaciones';
import { saldoPendienteDelCliente } from '../dominio';
import { bs, fecha } from '../utilidades/formato';
import { useDatos } from '../utilidades/useDatos';

/** Un cliente con todas sus operaciones: reservas, ventas, pagos y saldo. */
export function ClienteDetalle() {
  const id = Number(useParams().id);
  const { datos: cliente, error } = useDatos(() => api.clientes.obtener(id), [id]);

  if (error) return <div className="pagina"><MensajeError mensaje={error} /></div>;
  if (!cliente) return <Cargando />;

  const vigentes = cliente.ventas.filter((v) => v.estado === 'VIGENTE');
  const saldoTotal = saldoPendienteDelCliente(cliente.ventas);

  return (
    <div className="pagina">
      <Link to="/clientes" className="enlace-volver" data-testid="volver-clientes">
        <Icono nombre="volver" />
        Clientes
      </Link>
      <Encabezado titulo={cliente.nombreCompleto} subtitulo={`Cliente desde ${fecha(cliente.creadoEn)}`} />
      <div className="tarjeta grilla-datos cuatro">
        <Dato etiqueta="Documento">{cliente.documento}</Dato>
        <Dato etiqueta="Teléfono">{cliente.telefono}</Dato>
        <Dato etiqueta="Correo">{cliente.email || '—'}</Dato>
        <Dato etiqueta="Dirección">{cliente.direccion || '—'}</Dato>
        <Dato etiqueta="Compras vigentes">{vigentes.length}</Dato>
        <Dato etiqueta="Saldo total pendiente" testid="cliente-saldo-total">
          {bs(saldoTotal)}
        </Dato>
      </div>

      <h2 className="titulo-seccion">Ventas</h2>
      <ContenedorTabla etiqueta="Ventas del cliente">
        <TablaVentas ventas={cliente.ventas} mostrarCliente={false} />
      </ContenedorTabla>

      <h2 className="titulo-seccion">Reservas</h2>
      <ContenedorTabla etiqueta="Reservas del cliente">
        <TablaReservas reservas={cliente.reservas} mostrarCliente={false} />
      </ContenedorTabla>
    </div>
  );
}
