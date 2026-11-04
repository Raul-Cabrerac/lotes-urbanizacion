import { ESTADOS_LOTE } from '../../api/tipos';
import { COLOR_ESTADO } from './colores';

/** Leyenda de colores de los estados del lote. */
export function LeyendaEstados() {
  return (
    <div className="leyenda" data-testid="leyenda">
      {ESTADOS_LOTE.map((estado) => (
        <span key={estado} className="leyenda-item">
          <span className="leyenda-color" style={{ background: COLOR_ESTADO[estado] }} />
          {estado.charAt(0) + estado.slice(1).toLowerCase()}
        </span>
      ))}
    </div>
  );
}
