import { Link } from 'react-router';
import type { FiltrosLotes } from '../../api/api';
import { ESTADOS_LOTE, type EstadoLote, type Lote, type ProyectoDetalle } from '../../api/tipos';
import { useSesion } from '../../auth/Sesion';
import { Cargando, Insignia } from '../../componentes/Basicos';
import { COLOR_ESTADO } from '../../componentes/mapa/colores';
import { bs, m2 } from '../../utilidades/formato';

interface Props {
  proyecto: ProyectoDetalle;
  lotes: Lote[] | null;
  filtros: FiltrosLotes;
  onFiltros: (cambiar: (filtros: FiltrosLotes) => FiltrosLotes) => void;
  busqueda: string;
  onBusqueda: (texto: string) => void;
  seleccionadoId: number | null;
  onSeleccionar: (id: number) => void;
  onEditarProyecto: () => void;
  onPublicar: () => void;
}

/** Columna izquierda del mapa: datos del proyecto, contadores por estado, filtros y lista de lotes. */
export function PanelProyecto(props: Props) {
  const { proyecto, lotes, filtros, onFiltros, seleccionadoId } = props;
  const { puede } = useSesion();
  const { resumen } = proyecto;

  return (
    <aside className="panel-lateral">
      <Link to="/proyectos" className="enlace-volver" data-testid="volver-proyectos">
        ← Proyectos
      </Link>
      <div className="fila-espaciada">
        <h1 data-testid="proyecto-titulo">{proyecto.nombre}</h1>
        <Insignia estado={proyecto.estado} testid="proyecto-estado" />
      </div>
      <p className="texto-suave">{proyecto.ubicacion}</p>
      {proyecto.descripcion && <p className="descripcion pequeno">{proyecto.descripcion}</p>}

      {puede('proyectos:gestionar') && (
        <div className="acciones-panel">
          <button className="boton boton-chico" onClick={props.onEditarProyecto} data-testid="editar-proyecto">
            Editar proyecto
          </button>
          {proyecto.estado === 'BORRADOR' && (
            <button
              className="boton boton-chico boton-primario"
              onClick={props.onPublicar}
              data-testid="publicar-proyecto"
            >
              Publicar
            </button>
          )}
        </div>
      )}

      <div className="contadores">
        {ESTADOS_LOTE.map((estado) => (
          <button
            key={estado}
            className={`contador ${filtros.estado === estado ? 'activo' : ''}`}
            style={{ borderTopColor: COLOR_ESTADO[estado] }}
            onClick={() => onFiltros((f) => ({ ...f, estado: f.estado === estado ? '' : estado }))}
            data-testid={`contador-${estado}`}
            title="Filtrar por este estado"
          >
            <strong>{resumen.porEstado[estado]}</strong>
            <span>{estado.toLowerCase()}</span>
          </button>
        ))}
      </div>

      <div className="filtros">
        <select
          value={filtros.estado}
          onChange={(e) => onFiltros((f) => ({ ...f, estado: e.target.value as EstadoLote | '' }))}
          aria-label="Estado"
          data-testid="filtro-estado"
        >
          <option value="">Estado: todos</option>
          {ESTADOS_LOTE.map((estado) => (
            <option key={estado} value={estado}>
              {estado}
            </option>
          ))}
        </select>
        <select
          value={filtros.etapa}
          onChange={(e) => onFiltros((f) => ({ ...f, etapa: e.target.value }))}
          aria-label="Etapa"
          data-testid="filtro-etapa"
        >
          <option value="">Etapa: todas</option>
          {resumen.etapas.map((etapa) => (
            <option key={etapa}>{etapa}</option>
          ))}
        </select>
        <select
          value={filtros.manzano}
          onChange={(e) => onFiltros((f) => ({ ...f, manzano: e.target.value }))}
          aria-label="Manzano"
          data-testid="filtro-manzano"
        >
          <option value="">Manzano: todos</option>
          {resumen.manzanos.map((manzano) => (
            <option key={manzano} value={manzano}>
              Manzano {manzano}
            </option>
          ))}
        </select>
        <input
          placeholder="Buscar código..."
          aria-label="Buscar por código"
          value={props.busqueda}
          onChange={(e) => props.onBusqueda(e.target.value)}
          data-testid="filtro-busqueda"
        />
      </div>

      <div className="lista-lotes" data-testid="lista-lotes">
        {!lotes && <Cargando />}
        {lotes?.length === 0 && <div className="vacio pequeno">Ningún lote coincide con los filtros.</div>}
        {lotes?.map((l) => (
          <button
            key={l.id}
            className={`item-lote ${l.id === seleccionadoId ? 'seleccionado' : ''}`}
            onClick={() => props.onSeleccionar(l.id)}
            data-testid={`item-lote-${l.codigo}`}
            data-estado={l.estado}
          >
            <span className="punto" style={{ background: COLOR_ESTADO[l.estado] }} />
            <span className="item-lote-codigo">{l.codigo}</span>
            <span className="item-lote-info">
              {l.manzano && `Mz ${l.manzano} · `}
              {m2(l.superficieM2)}
            </span>
            <span className="item-lote-precio">{l.precio > 0 ? bs(l.precio) : 'sin precio'}</span>
          </button>
        ))}
      </div>

      <ResumenManzanos resumen={resumen} />
    </aside>
  );
}

/** Tabla plegable con la cantidad de lotes por etapa y manzano (consigna §3 y §10). */
function ResumenManzanos({ resumen }: { resumen: ProyectoDetalle['resumen'] }) {
  return (
    <details className="resumen-manzanos" data-testid="resumen-manzanos">
      <summary>Resumen por etapa y manzano</summary>
      <table className="tabla tabla-compacta">
        <thead>
          <tr>
            <th>Etapa</th>
            <th>Mz</th>
            <th className="numero">Total</th>
            <th className="numero" title="Disponibles">D</th>
            <th className="numero" title="Reservados">R</th>
            <th className="numero" title="Vendidos">V</th>
          </tr>
        </thead>
        <tbody>
          {resumen.porManzano.map((g) => (
            <tr key={`${g.etapa}-${g.manzano}`}>
              <td>{g.etapa || '—'}</td>
              <td>{g.manzano || '—'}</td>
              <td className="numero">{g.total}</td>
              <td className="numero">{g.porEstado.DISPONIBLE}</td>
              <td className="numero">{g.porEstado.RESERVADO}</td>
              <td className="numero">{g.porEstado.VENDIDO}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="texto-suave pequeno">
        Superficie total {m2(resumen.superficieTotalM2)} · disponible a la venta{' '}
        {bs(resumen.valorDisponible)}
      </p>
    </details>
  );
}
