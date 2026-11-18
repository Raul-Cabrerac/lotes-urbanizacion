import { Icono } from '../../componentes/Icono';

export type Modo = 'normal' | 'dibujar-lote' | 'dibujar-limite' | 'editar-forma';

interface Props {
  esAdmin: boolean;
  modo: Modo;
  /** Código del lote cuya forma se está editando. */
  codigoEditando: string | null;
  puedeGuardarForma: boolean;
  onModo: (modo: Modo) => void;
  onImportarKml: () => void;
  onActualizar: () => void;
  onGuardarForma: () => void;
  onCancelar: () => void;
}

/** Barra sobre el mapa: herramientas del administrador y avisos del modo dibujo o edición. */
export function BarraMapa(props: Props) {
  const { esAdmin, modo } = props;
  const dibujando = modo === 'dibujar-lote' || modo === 'dibujar-limite';

  return (
    <>
      {modo === 'normal' && (
        <div className="barra-mapa">
          {esAdmin && (
            <>
              <button
                type="button"
                className="boton boton-chico boton-primario"
                onClick={() => props.onModo('dibujar-lote')}
                data-testid="dibujar-lote"
              >
                <Icono nombre="poligono" />
                Dibujar lote
              </button>
              <button type="button" className="boton boton-chico" onClick={props.onImportarKml} data-testid="importar-kml">
                <Icono nombre="importar" />
                Importar KML
              </button>
              <button
                type="button"
                className="boton boton-chico"
                onClick={() => props.onModo('dibujar-limite')}
                data-testid="dibujar-limite"
              >
                <Icono nombre="perimetro" />
                Dibujar perímetro
              </button>
              <span className="barra-mapa-separador" aria-hidden="true" />
            </>
          )}
          <button
            type="button"
            className="boton boton-chico boton-fantasma"
            onClick={props.onActualizar}
            data-testid="actualizar-mapa"
            title="Volver a cargar los lotes"
          >
            <Icono nombre="actualizar" />
            Actualizar
          </button>
          {!esAdmin && (
            <span className="barra-mapa-ayuda texto-suave pequeno" data-testid="ayuda-asesor">
              Haga clic en un lote (en el mapa o en la lista) para ver su detalle, reservarlo o venderlo.
            </span>
          )}
        </div>
      )}

      {dibujando && (
        <div className="aviso-modo" data-testid="aviso-dibujo">
          <p className="aviso-modo-texto">
            <Icono nombre="info" />
            <span>
              <strong>{modo === 'dibujar-lote' ? 'Dibujando un lote' : 'Dibujando el perímetro'}:</strong> haga clic
              en el mapa en cada esquina. Para cerrar el polígono, haga clic en el primer punto o use «Terminar
              polígono».
            </span>
          </p>
          <button type="button" className="boton boton-chico" onClick={props.onCancelar} data-testid="cancelar-dibujo">
            Cancelar
          </button>
        </div>
      )}

      {modo === 'editar-forma' && (
        <div className="aviso-modo" data-testid="aviso-edicion">
          <p className="aviso-modo-texto">
            <Icono nombre="info" />
            <span>
              <strong>Editando la forma de {props.codigoEditando ?? 'lote'}:</strong> arrastre los vértices, o los
              puntos intermedios para agregar uno nuevo.
            </span>
          </p>
          <button
            type="button"
            className="boton boton-chico boton-primario"
            onClick={props.onGuardarForma}
            disabled={!props.puedeGuardarForma}
            data-testid="guardar-forma"
          >
            Guardar forma
          </button>
          <button type="button" className="boton boton-chico" onClick={props.onCancelar} data-testid="cancelar-forma">
            Cancelar
          </button>
        </div>
      )}
    </>
  );
}
