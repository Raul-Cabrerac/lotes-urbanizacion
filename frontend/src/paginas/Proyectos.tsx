import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../api/api';
import { ESTADOS_LOTE } from '../api/tipos';
import { useSesion } from '../auth/Sesion';
import { Cargando, Encabezado, Insignia, MensajeError, Vacio } from '../componentes/Basicos';
import { COLOR_ESTADO } from '../componentes/mapa/colores';
import { fecha } from '../utilidades/formato';
import { useDatos } from '../utilidades/useDatos';
import { ModalProyecto } from './ModalProyecto';

/** Lista de proyectos de urbanización (el administrador ve también los BORRADOR). */
export function Proyectos() {
  const { puede } = useSesion();
  const navegar = useNavigate();
  const { datos: proyectos, error, cargando } = useDatos(() => api.proyectos.listar(), []);
  const [creando, setCreando] = useState(false);

  return (
    <div className="pagina">
      <Encabezado titulo="Proyectos" subtitulo="Seleccione un proyecto para ver su mapa de lotes.">
        {puede('proyectos:gestionar') && (
          <button className="boton boton-primario" onClick={() => setCreando(true)} data-testid="nuevo-proyecto">
            + Nuevo proyecto
          </button>
        )}
      </Encabezado>

      <MensajeError mensaje={error} />
      {cargando && !proyectos && <Cargando />}
      {proyectos?.length === 0 && <Vacio>No hay proyectos todavía.</Vacio>}

      <div className="grilla-tarjetas">
        {proyectos?.map((p) => (
          <Link key={p.id} to={`/proyectos/${p.id}`} className="tarjeta tarjeta-proyecto" data-testid={`proyecto-${p.id}`}>
            <div className="fila-espaciada">
              <h2>{p.nombre}</h2>
              <Insignia estado={p.estado} />
            </div>
            <p className="texto-suave">{p.ubicacion}</p>
            {p.descripcion && <p className="descripcion">{p.descripcion}</p>}
            <div className="barra-estados" title="Lotes por estado">
              {ESTADOS_LOTE.map((estado) =>
                p.lotesPorEstado[estado] ? (
                  <span
                    key={estado}
                    style={{ flex: p.lotesPorEstado[estado], background: COLOR_ESTADO[estado] }}
                    title={`${estado}: ${p.lotesPorEstado[estado]}`}
                  />
                ) : null,
              )}
            </div>
            <div className="texto-suave pequeno">
              {p.totalLotes} lotes · {p.lotesPorEstado.DISPONIBLE} disponibles · creado el {fecha(p.creadoEn)}
            </div>
          </Link>
        ))}
      </div>

      {creando && (
        <ModalProyecto onCerrar={() => setCreando(false)} onGuardado={(nuevo) => navegar(`/proyectos/${nuevo.id}`)} />
      )}
    </div>
  );
}
