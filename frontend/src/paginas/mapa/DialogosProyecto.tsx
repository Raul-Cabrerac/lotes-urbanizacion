import { api } from '../../api/api';
import type { ProyectoDetalle } from '../../api/tipos';
import { ModalConfirmar } from '../../componentes/ModalConfirmar';
import { ModalProyecto } from '../ModalProyecto';
import { ModalImportarKml } from './ModalImportarKml';

export type DialogoProyecto = 'importar-kml' | 'editar-proyecto' | 'publicar';

interface Props {
  dialogo: DialogoProyecto;
  proyecto: ProyectoDetalle;
  onCerrar: () => void;
  /** La operación salió bien: se muestra el mensaje y se vuelven a pedir los datos al servidor. */
  onTerminado: (mensaje: string) => Promise<void>;
  /** Después de importar un KML el mapa se vuelve a encuadrar para mostrar los lotes nuevos. */
  onLotesImportados: () => void;
}

/** Diálogos del administrador sobre el proyecto: importar KML, editar datos y publicar. */
export function DialogosProyecto({ dialogo, proyecto, onCerrar, onTerminado, onLotesImportados }: Props) {
  switch (dialogo) {
    case 'importar-kml':
      return (
        <ModalImportarKml
          proyectoId={proyecto.id}
          onCerrar={onCerrar}
          onImportado={async (resultado) => {
            const perimetro = resultado.limiteImportado ? ' y el perímetro del proyecto' : '';
            const omitidos = resultado.elementosOmitidos
              ? ` (${resultado.elementosOmitidos} elementos que no son polígonos se ignoraron)`
              : '';
            await onTerminado(`Se importaron ${resultado.lotesCreados} lotes${perimetro}${omitidos}.`);
            onLotesImportados();
          }}
        />
      );
    case 'editar-proyecto':
      return (
        <ModalProyecto
          proyecto={proyecto}
          onCerrar={onCerrar}
          onGuardado={() => onTerminado('Proyecto actualizado.')}
        />
      );
    case 'publicar':
      return (
        <ModalConfirmar
          titulo="Publicar proyecto"
          mensaje="Al publicarlo, los asesores podrán ver el mapa y comercializar los lotes que tengan precio."
          textoConfirmar="Publicar"
          testid="modal-publicar"
          onCerrar={onCerrar}
          onConfirmar={async () => {
            await api.proyectos.publicar(proyecto.id);
            await onTerminado('Proyecto publicado.');
          }}
        />
      );
  }
}
