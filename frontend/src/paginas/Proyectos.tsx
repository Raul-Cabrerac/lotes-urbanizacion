import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../api/api';
import { ESTADOS_LOTE } from '../dominio';
import { useSesion } from '../auth/Sesion';
import { Cargando, Encabezado, Insignia, MensajeError, Vacio } from '../componentes/Basicos';
import { Icono } from '../componentes/Icono';
import { Paginacion } from '../componentes/Paginacion';
import { ASPECTO_ESTADO, estiloEstado } from '../utilidades/estados';
import { fecha } from '../utilidades/formato';
import { useListadoPaginado } from '../utilidades/useListadoPaginado';
import { ModalProyecto } from './ModalProyecto';

/** Lista de proyectos de urbanización (el administrador ve también los BORRADOR). */
export function Proyectos() {
  const { puede } = useSesion();
  const navegar = useNavigate();
  const { datos: pagina, error, cargando, cambiarPagina } = useListadoPaginado(
    (paginacion) => api.proyectos.listarPagina(paginacion),
    [],
  );
  const proyectos = pagina?.elementos;
  const [creando, setCreando] = useState(false);

  return (
    <div className="pagina">
      <Encabezado titulo="Proyectos" subtitulo="Seleccione un proyecto para ver su mapa de lotes.">
        {puede('proyectos:gestionar') && (
          <button className="boton boton-primario" onClick={() => setCreando(true)} data-testid="nuevo-proyecto">
            <Icono nombre="mas" />
            Nuevo proyecto
          </button>
        )}
      </Encabezado>

      <MensajeError mensaje={error} />
      {cargando && !proyectos && <Cargando />}
      {pagina?.total === 0 && <Vacio>No hay proyectos todavía.</Vacio>}

      <div className="grilla-tarjetas">
        {proyectos?.map((p) => (
          <Link key={p.id} to={`/proyectos/${p.id}`} className="tarjeta tarjeta-proyecto" data-testid={`proyecto-${p.id}`}>
            <div className="fila-espaciada">
              <h2>{p.nombre}</h2>
              <Insignia estado={p.estado} />
            </div>
            <p className="proyecto-ubicacion">
              <Icono nombre="ubicacion" tamano={14} />
              {p.ubicacion}
            </p>
            {p.descripcion && <p className="descripcion">{p.descripcion}</p>}
            <div className="barra-estados" title="Lotes por estado">
              {ESTADOS_LOTE.map((estado) =>
                p.lotesPorEstado[estado] ? (
                  <span
                    key={estado}
                    style={{ ...estiloEstado(estado), flex: p.lotesPorEstado[estado] }}
                    title={`${ASPECTO_ESTADO[estado].etiqueta}: ${p.lotesPorEstado[estado]}`}
                  />
                ) : null,
              )}
            </div>
            <dl className="proyecto-cifras">
              <div>
                <dt>Lotes</dt>
                <dd>{p.totalLotes}</dd>
              </div>
              <div>
                <dt>{ASPECTO_ESTADO.DISPONIBLE.plural}</dt>
                <dd>{p.lotesPorEstado.DISPONIBLE}</dd>
              </div>
              <div>
                <dt>Creado</dt>
                <dd>{fecha(p.creadoEn)}</dd>
              </div>
            </dl>
          </Link>
        ))}
      </div>
      {pagina && pagina.total > 0 && <Paginacion pagina={pagina} onCambiar={cambiarPagina} />}

      {creando && (
        <ModalProyecto onCerrar={() => setCreando(false)} onGuardado={(nuevo) => navegar(`/proyectos/${nuevo.id}`)} />
      )}
    </div>
  );
}
