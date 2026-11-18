import { useState, type FormEvent } from 'react';
import { api } from '../api/api';
import type { Proyecto } from '../api/tipos';
import { Campo, MensajeError } from '../componentes/Basicos';
import { Modal } from '../componentes/Modal';
import { useEnvio } from '../utilidades/useEnvio';

/** Crear (sin `proyecto`) o editar un proyecto de urbanización. */
export function ModalProyecto({
  proyecto,
  onCerrar,
  onGuardado,
}: {
  proyecto?: Proyecto;
  onCerrar: () => void;
  onGuardado: (proyecto: Proyecto) => void;
}) {
  const [nombre, setNombre] = useState(proyecto?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(proyecto?.descripcion ?? '');
  const [ubicacion, setUbicacion] = useState(proyecto?.ubicacion ?? '');
  const { enviar, enviando, error } = useEnvio();

  const guardar = (e: FormEvent) => {
    e.preventDefault();
    const datos = { nombre, descripcion, ubicacion };
    void enviar(async () =>
      onGuardado(proyecto ? await api.proyectos.actualizar(proyecto.id, datos) : await api.proyectos.crear(datos)),
    );
  };

  return (
    <Modal titulo={proyecto ? 'Editar proyecto' : 'Nuevo proyecto'} onCerrar={onCerrar} testid="modal-proyecto">
      <form onSubmit={guardar} className="formulario">
        <Campo etiqueta="Nombre *">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required data-testid="proyecto-nombre" />
        </Campo>
        <Campo etiqueta="Ubicación *" ayuda="Ej.: Urubó, Porongo - Santa Cruz">
          <input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} required data-testid="proyecto-ubicacion" />
        </Campo>
        <Campo etiqueta="Descripción">
          <textarea rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} data-testid="proyecto-descripcion" />
        </Campo>
        <MensajeError mensaje={error} />
        <div className="modal-pie">
          <button type="button" className="boton" onClick={onCerrar} data-testid="proyecto-cancelar">
            Cancelar
          </button>
          <button type="submit" className="boton boton-primario" disabled={enviando} data-testid="proyecto-guardar">
            {enviando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
