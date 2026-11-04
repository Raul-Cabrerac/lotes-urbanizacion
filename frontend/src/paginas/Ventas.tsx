import { useState } from 'react';
import { api } from '../api/api';
import type { EstadoVenta } from '../api/tipos';
import { Cargando, Encabezado, MensajeError } from '../componentes/Basicos';
import { TablaVentas } from '../componentes/TablasOperaciones';
import { useDatos } from '../utilidades/useDatos';

/** Consulta de ventas por cliente, proyecto y estado (consigna, sección 10). */
export function Ventas() {
  const [proyectoId, setProyectoId] = useState<number | ''>('');
  const [clienteId, setClienteId] = useState<number | ''>('');
  const [estado, setEstado] = useState<EstadoVenta | ''>('VIGENTE');
  const { datos: proyectos } = useDatos(() => api.proyectos.listar(), []);
  const { datos: clientes } = useDatos(() => api.clientes.listar(), []);
  const { datos: ventas, error, cargando } = useDatos(
    () => api.ventas.listar({ proyectoId, clienteId, estado }),
    [proyectoId, clienteId, estado],
  );

  return (
    <div className="pagina">
      <Encabezado titulo="Ventas y planes de pago" subtitulo="Las ventas se registran desde el mapa del proyecto." />
      <div className="filtros-fila">
        <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value ? Number(e.target.value) : '')} data-testid="ventas-filtro-proyecto">
          <option value="">Todos los proyectos</option>
          {proyectos?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <select value={clienteId} onChange={(e) => setClienteId(e.target.value ? Number(e.target.value) : '')} data-testid="ventas-filtro-cliente">
          <option value="">Todos los clientes</option>
          {clientes?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombreCompleto}
            </option>
          ))}
        </select>
        <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoVenta | '')} data-testid="ventas-filtro-estado">
          <option value="VIGENTE">Vigentes</option>
          <option value="ANULADA">Anuladas</option>
          <option value="">Todas</option>
        </select>
      </div>
      <MensajeError mensaje={error} />
      {cargando && !ventas && <Cargando />}
      {ventas && (
        <div className="tarjeta sin-relleno">
          <TablaVentas ventas={ventas} />
        </div>
      )}
    </div>
  );
}
