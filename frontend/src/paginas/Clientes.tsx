import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../api/api';
import type { Cliente } from '../api/tipos';
import { useSesion } from '../auth/Sesion';
import { useAvisos } from '../componentes/Avisos';
import { Cargando, Encabezado, MensajeError, Vacio } from '../componentes/Basicos';
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
          <button className="boton boton-primario" onClick={() => setEditando('nuevo')} data-testid="nuevo-cliente">
            + Registrar cliente
          </button>
        )}
      </Encabezado>

      <input
        className="buscador"
        placeholder="Buscar por nombre, documento, teléfono o correo..."
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        data-testid="buscar-cliente"
      />
      <MensajeError mensaje={error} />
      {cargando && !clientes && <Cargando />}
      {clientes?.length === 0 && <Vacio>No se encontraron clientes.</Vacio>}

      {clientes && clientes.length > 0 && (
        <div className="tarjeta sin-relleno">
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
                  <td>{c.nombreCompleto}</td>
                  <td>{c.documento}</td>
                  <td>{c.telefono}</td>
                  <td>{c.email || '—'}</td>
                  <td>{c.direccion || '—'}</td>
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
        </div>
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
