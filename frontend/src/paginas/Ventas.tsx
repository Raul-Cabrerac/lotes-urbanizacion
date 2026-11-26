import { useState } from 'react';
import { api } from '../api/api';
import { ESTADOS_VENTA, type EstadoVenta } from '../dominio';
import { Campo, Cargando, ContenedorTabla, Encabezado, MensajeError } from '../componentes/Basicos';
import { Paginacion } from '../componentes/Paginacion';
import { SelectCliente } from '../componentes/SelectorCliente';
import { TablaVentas } from '../componentes/TablasOperaciones';
import { ASPECTO_ESTADO } from '../utilidades/estados';
import { useDatos } from '../utilidades/useDatos';
import { useListadoPaginado } from '../utilidades/useListadoPaginado';

/** Consulta de ventas por cliente, proyecto y estado (consigna, sección 10). */
export function Ventas() {
  const [proyectoId, setProyectoId] = useState<number | ''>('');
  const [clienteId, setClienteId] = useState<number | ''>('');
  const [estado, setEstado] = useState<EstadoVenta | ''>('VIGENTE');
  const { datos: proyectos } = useDatos(() => api.proyectos.listar(), []);
  const { datos: clientes } = useDatos(() => api.clientes.listar(), []);
  const { datos: pagina, error, cargando, cambiarPagina } = useListadoPaginado(
    (paginacion) => api.ventas.listarPagina({ proyectoId, clienteId, estado }, paginacion),
    [proyectoId, clienteId, estado],
  );
  const ventas = pagina?.elementos;

  return (
    <div className="pagina">
      <Encabezado titulo="Ventas y planes de pago" subtitulo="Las ventas se registran desde el mapa del proyecto." />
      <div className="filtros-fila">
        <Campo etiqueta="Proyecto">
          <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value ? Number(e.target.value) : '')} data-testid="ventas-filtro-proyecto">
            <option value="">Todos los proyectos</option>
            {proyectos?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Cliente">
          <SelectCliente
            clientes={clientes ?? []}
            valor={clienteId || null}
            onCambiar={(id) => setClienteId(id ?? '')}
            opcionVacia="Todos los clientes"
            testid="ventas-filtro-cliente"
          />
        </Campo>
        <Campo etiqueta="Estado">
          <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoVenta | '')} data-testid="ventas-filtro-estado">
            {ESTADOS_VENTA.map((valor) => (
              <option key={valor} value={valor}>
                {ASPECTO_ESTADO[valor].plural}
              </option>
            ))}
            <option value="">Todas</option>
          </select>
        </Campo>
      </div>
      <MensajeError mensaje={error} />
      {cargando && !ventas && <Cargando />}
      {ventas && (
        <ContenedorTabla etiqueta="Ventas">
          <TablaVentas ventas={ventas} />
        </ContenedorTabla>
      )}
      {pagina && pagina.total > 0 && <Paginacion pagina={pagina} onCambiar={cambiarPagina} />}
    </div>
  );
}
