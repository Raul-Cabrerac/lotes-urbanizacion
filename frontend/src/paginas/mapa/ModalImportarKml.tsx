import { useState, type FormEvent } from 'react';
import { api } from '../../api/api';
import { mensajeDeError } from '../../api/http';
import type { ResultadoImportacion } from '../../api/tiposOperaciones';
import { Campo, MensajeError } from '../../componentes/Basicos';
import { Modal } from '../../componentes/Modal';
import { numeroOIndefinido } from '../../utilidades/formato';

const EJEMPLO = '/ejemplos/urbanizacion_el_mirador.kml';

/** Importar lotes (y el perímetro) desde un archivo KML de Google Earth (paso 2 del flujo de la consigna). */
export function ModalImportarKml({
  proyectoId,
  onCerrar,
  onImportado,
}: {
  proyectoId: number;
  onCerrar: () => void;
  onImportado: (resultado: ResultadoImportacion) => void;
}) {
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [kml, setKml] = useState('');
  const [precio, setPrecio] = useState('');
  const [manzano, setManzano] = useState('');
  const [etapa, setEtapa] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);

  const leerArchivo = async (archivo: File | undefined) => {
    if (!archivo) return;
    setNombreArchivo(archivo.name);
    setKml(await archivo.text());
    setError(null);
  };

  const usarEjemplo = async () => {
    const respuesta = await fetch(EJEMPLO);
    setKml(await respuesta.text());
    setNombreArchivo('urbanizacion_el_mirador.kml (ejemplo)');
    setError(null);
  };

  const importar = async (e: FormEvent) => {
    e.preventDefault();
    if (!kml) return setError('Seleccione un archivo KML.');
    setImportando(true);
    setError(null);
    try {
      onImportado(
        await api.proyectos.importarKml(proyectoId, {
          kml,
          precioPorDefecto: numeroOIndefinido(precio),
          manzanoPorDefecto: manzano || undefined,
          etapaPorDefecto: etapa || undefined,
        }),
      );
    } catch (err) {
      setError(mensajeDeError(err));
      setImportando(false);
    }
  };

  return (
    <Modal titulo="Importar lotes desde KML" onCerrar={onCerrar} testid="modal-kml">
      <form onSubmit={importar} className="formulario">
        <p className="texto-suave">
          Cada polígono del archivo se crea como un lote. Si el polígono trae datos (ExtendedData: <code>codigo</code>,{' '}
          <code>manzano</code>, <code>etapa</code>, <code>precio</code>, <code>dimensiones</code>) se usan; si no, se usan los
          valores por defecto de abajo. Un polígono con <code>tipo=limite</code> se guarda como perímetro del proyecto. Si
          algún polígono tiene errores no se importa nada.
        </p>
        <Campo etiqueta="Archivo KML *">
          <input type="file" accept=".kml,application/vnd.google-earth.kml+xml" onChange={(e) => leerArchivo(e.target.files?.[0])} data-testid="kml-archivo" />
        </Campo>
        <div className="fila-espaciada">
          <span className="texto-suave pequeno" data-testid="kml-nombre">
            {nombreArchivo ? `Seleccionado: ${nombreArchivo}` : 'Ningún archivo seleccionado'}
          </span>
          <span>
            <button type="button" className="boton boton-chico" onClick={usarEjemplo} data-testid="kml-usar-ejemplo">
              Usar KML de ejemplo
            </button>{' '}
            <a className="pequeno" href={EJEMPLO} download>
              Descargar ejemplo
            </a>
          </span>
        </div>
        <div className="fila-campos">
          <Campo etiqueta="Precio por defecto (Bs)">
            <input type="number" min="0" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} data-testid="kml-precio" />
          </Campo>
          <Campo etiqueta="Manzano por defecto">
            <input value={manzano} onChange={(e) => setManzano(e.target.value)} data-testid="kml-manzano" />
          </Campo>
          <Campo etiqueta="Etapa por defecto">
            <input value={etapa} onChange={(e) => setEtapa(e.target.value)} data-testid="kml-etapa" />
          </Campo>
        </div>
        <MensajeError mensaje={error} testid="kml-error" />
        <div className="modal-pie">
          <button type="button" className="boton" onClick={onCerrar} data-testid="kml-cancelar">
            Cancelar
          </button>
          <button type="submit" className="boton boton-primario" disabled={importando} data-testid="kml-importar">
            {importando ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
