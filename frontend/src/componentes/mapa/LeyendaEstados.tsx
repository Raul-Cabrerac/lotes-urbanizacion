import { ESTADOS_LOTE } from '../../dominio';
import { ASPECTO_ESTADO, estiloEstado } from '../../utilidades/estados';

/** Leyenda de colores de los estados del lote. */
export function LeyendaEstados() {
  return (
    <div className="leyenda" data-testid="leyenda">
      {ESTADOS_LOTE.map((estado) => (
        <span key={estado} className="leyenda-item">
          <span className="leyenda-color" style={estiloEstado(estado)} />
          {ASPECTO_ESTADO[estado].etiqueta}
        </span>
      ))}
    </div>
  );
}
