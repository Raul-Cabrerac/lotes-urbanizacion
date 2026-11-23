import { useState, type FormEvent, type ReactNode } from 'react';
import { useEnvio } from '../utilidades/useEnvio';
import { Campo, MensajeError } from './Basicos';
import { Modal } from './Modal';

interface Props {
  titulo: string;
  mensaje: ReactNode;
  textoConfirmar: string;
  peligro?: boolean;
  /** Si se indica, se pide un motivo (texto) antes de confirmar. */
  motivo?: { etiqueta: string; obligatorio: boolean };
  onConfirmar: (motivo: string) => Promise<void>;
  /** Otro usuario cambió los datos mientras tanto (409): hay que volver a pedirlos. */
  onConflicto?: () => void;
  onCerrar: () => void;
  testid?: string;
}

/** Confirmación de una acción (opcionalmente pidiendo un motivo). Muestra el error si la API lo rechaza. */
export function ModalConfirmar({
  titulo,
  mensaje,
  textoConfirmar,
  peligro,
  motivo,
  onConfirmar,
  onConflicto,
  onCerrar,
  testid,
}: Props) {
  const [texto, setTexto] = useState('');
  const { enviar, enviando, error } = useEnvio({ alConflicto: onConflicto });

  const confirmar = (e: FormEvent) => {
    e.preventDefault();
    void enviar(() => onConfirmar(texto));
  };

  return (
    <Modal titulo={titulo} onCerrar={onCerrar} testid={testid ?? 'modal-confirmar'}>
      <form onSubmit={confirmar} className="formulario">
        <div>{mensaje}</div>
        {motivo && (
          <Campo etiqueta={motivo.etiqueta + (motivo.obligatorio ? ' *' : '')}>
            <textarea
              rows={2}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              required={motivo.obligatorio}
              data-testid="confirmar-motivo"
            />
          </Campo>
        )}
        <MensajeError mensaje={error} />
        <div className="modal-pie">
          <button type="button" className="boton" onClick={onCerrar} data-testid="confirmar-cancelar">
            Volver
          </button>
          <button
            type="submit"
            className={`boton ${peligro ? 'boton-peligro' : 'boton-primario'}`}
            disabled={enviando}
            data-testid="confirmar-aceptar"
          >
            {enviando ? 'Procesando…' : textoConfirmar}
          </button>
        </div>
      </form>
    </Modal>
  );
}
