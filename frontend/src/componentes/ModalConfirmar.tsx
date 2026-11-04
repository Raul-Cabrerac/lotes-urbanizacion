import { useState, type FormEvent, type ReactNode } from 'react';
import { mensajeDeError } from '../api/http';
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
  onCerrar: () => void;
  testid?: string;
}

/** Confirmación de una acción (opcionalmente pidiendo un motivo). Muestra el error si la API lo rechaza. */
export function ModalConfirmar({ titulo, mensaje, textoConfirmar, peligro, motivo, onConfirmar, onCerrar, testid }: Props) {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const confirmar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await onConfirmar(texto);
    } catch (err) {
      setError(mensajeDeError(err));
      setEnviando(false);
    }
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
            {enviando ? 'Procesando...' : textoConfirmar}
          </button>
        </div>
      </form>
    </Modal>
  );
}
