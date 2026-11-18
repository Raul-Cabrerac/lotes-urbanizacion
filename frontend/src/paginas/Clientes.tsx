import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../api/api';
import type { Cliente } from '../api/tipos';
import { useSesion } from '../auth/Sesion';
import { useAvisos } from '../componentes/Avisos';
import { CampoBusqueda, Cargando, ContenedorTabla, Encabezado, MensajeError, Vacio } from '../componentes/Basicos';
import { Icono } from '../componentes/Icono';
import { useDatos } from '../utilidades/useDatos';
import { ModalCliente } from './ModalCliente';

/** Registro y búsqueda de clientes (consigna, sección 6). */
export function Clientes() {
  const { puede } = useSesion();
  const avisos = useAvisos();
  const navegar = useNavigate();
  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const { datos: clientes, error, cargando, recargar } = useDatos(() => api.clientes.listar(busqueda), [busqueda]);
  const [editando, setEditando] = useState<Cliente | 'nuevo' | null>(null);

  useEffect(() => {
    const temporizador = setTimeout(() => setBusqueda(texto), 300);
    return () => clearTimeout(temporizador);
  }, [texto]);

  return (
    <div className="pagina">
      <Encabezado titulo="Clientes" subtitulo="Personas que reservan o compran lotes.">
        {puede('clientes:gestionar') && (
          <button type="button" className="boton boton-primario" onClick={() => setEditando('nuevo')} data-testid="nuevo-cliente">
            <Icono nombre="mas" />
            Registrar cliente
          </button>
        )}
      </Encabezado>

      <CampoBusqueda
        className="buscador-pagina"
        placeholder="Nombre, documento, teléfono o correo"
        aria-label="Buscar cliente"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        data-testid="buscar-cliente"
      />
      <MensajeError mensaje={error} />
      {cargando && !clientes && <Cargando />}
      {clientes?.length === 0 && <Vacio>No se encontraron clientes.</Vacio>}

      {clientes && clientes.length > 0 && (
        <ContenedorTabla etiqueta="Clientes">
          <table className="tabla" data-testid="tabla-clientes">
            <thead>
              <tr>
                <th>Nombre completo</th>
                <th>Documento</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Dirección</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id} className="fila-clic" onClick={() => navegar(`/clientes/${c.id}`)} data-testid={`fila-cliente-${c.documento}`}>
                  <td>
                    <Link to={`/clientes/${c.id}`} onClick={(e) => e.stopPropagation()}>
                      {c.nombreCompleto}
                    </Link>
                  </td>
                  <td data-etiqueta="Documento">{c.documento}</td>
                  <td data-etiqueta="Teléfono">{c.telefono}</td>
                  <td data-etiqueta="Correo">{c.email || '—'}</td>
                  <td data-etiqueta="Dirección">{c.direccion || '—'}</td>
                  <td className="numero">
                    {puede('clientes:gestionar') && (
                      <button
                        className="boton boton-chico"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditando(c);
                        }}
                        data-testid={`editar-cliente-${c.documento}`}
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ContenedorTabla>
      )}

      {editando && (
        <ModalCliente
          cliente={editando === 'nuevo' ? undefined : editando}
          onCerrar={() => setEditando(null)}
          onGuardado={async (guardado) => {
            setEditando(null);
            avisos.exito(`Cliente ${guardado.nombreCompleto} guardado.`);
            await recargar();
          }}
        />
      )}
    </div>
  );
}
