import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../api/api';
import type { Cliente } from '../api/tipos';
import { useSesion } from '../auth/Sesion';
import { useAvisos } from '../componentes/Avisos';
import { CampoBusqueda, Cargando, ContenedorTabla, Encabezado, MensajeError, Vacio } from '../componentes/Basicos';
import { Icono } from '../componentes/Icono';
import { ModalCliente } from '../componentes/ModalCliente';
import { Paginacion } from '../componentes/Paginacion';
import { Tabla } from '../componentes/Tabla';
import { useListadoPaginado } from '../utilidades/useListadoPaginado';
import { useValorDiferido } from '../utilidades/useValorDiferido';

/** Registro y búsqueda de clientes (consigna, sección 6). */
export function Clientes() {
  const { puede } = useSesion();
  const avisos = useAvisos();
  const navegar = useNavigate();
  const [texto, setTexto] = useState('');
  const busqueda = useValorDiferido(texto);
  const { datos: pagina, error, cargando, recargar, cambiarPagina } = useListadoPaginado(
    (paginacion) => api.clientes.listarPagina(busqueda, paginacion),
    [busqueda],
  );
  const clientes = pagina?.elementos;
  const [editando, setEditando] = useState<Cliente | 'nuevo' | null>(null);

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
      {pagina?.total === 0 && <Vacio>No se encontraron clientes.</Vacio>}

      {clientes && clientes.length > 0 && (
        <ContenedorTabla etiqueta="Clientes">
          <Tabla
            testid="tabla-clientes"
            filas={clientes}
            clave={(c) => c.id}
            atributosFila={(c) => ({
              className: 'fila-clic',
              onClick: () => navegar(`/clientes/${c.id}`),
              'data-testid': `fila-cliente-${c.documento}`,
            })}
            columnas={[
              {
                titulo: 'Nombre completo',
                encabezaFicha: true,
                celda: (c) => (
                  <Link to={`/clientes/${c.id}`} onClick={(e) => e.stopPropagation()}>
                    {c.nombreCompleto}
                  </Link>
                ),
              },
              { titulo: 'Documento', celda: (c) => c.documento },
              { titulo: 'Teléfono', celda: (c) => c.telefono },
              { titulo: 'Correo', celda: (c) => c.email || '—' },
              { titulo: 'Dirección', celda: (c) => c.direccion || '—' },
              {
                titulo: '',
                clase: 'numero',
                celda: (c) =>
                  puede('clientes:gestionar') && (
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
                  ),
              },
            ]}
          />
        </ContenedorTabla>
      )}
      {pagina && pagina.total > 0 && <Paginacion pagina={pagina} onCambiar={cambiarPagina} />}

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
