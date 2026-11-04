import { useState, type FormEvent } from 'react';
import { api } from '../../api/api';
import { ApiError, mensajeDeError } from '../../api/http';
import type { LoteDetalle } from '../../api/tipos';
import type { Reserva } from '../../api/tiposOperaciones';
import { Campo, MensajeError } from '../../componentes/Basicos';
import { Modal } from '../../componentes/Modal';
import { SelectorCliente } from '../../componentes/SelectorCliente';
import { bs, fechaEnDias, m2 } from '../../utilidades/formato';

/** Registrar la reserva de un lote DISPONIBLE (consigna, sección 7). */
export function ModalReserva({
  lote,
  onCerrar,
  onReservado,
  onConflicto,
}: {
  lote: LoteDetalle;
  onCerrar: () => void;
  onReservado: (reserva: Reserva) => void;
  /** Otro usuario reservó/vendió el lote mientras tanto: hay que refrescar el mapa. */
  onConflicto: () => void;
}) {
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [fechaVencimiento, setFechaVencimiento] = useState(fechaEnDias(7));
  const [observacion, setObservacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const reservar = async (e: FormEvent) => {
    e.preventDefault();
    if (!clienteId) return setError('Seleccione un cliente.');
    setEnviando(true);
    setError(null);
    try {
      onReservado(await api.reservas.crear({ loteId: lote.id, clienteId, fechaVencimiento: fechaVencimiento || null, observacion }));
    } catch (err) {
      setError(mensajeDeError(err));
      setEnviando(false);
      if (err instanceof ApiError && err.estado === 409) onConflicto();
    }
  };

  return (
    <Modal titulo={`Reservar lote ${lote.codigo}`} onCerrar={onCerrar} testid="modal-reserva">
      <form onSubmit={reservar} className="formulario">
        <div className="caja caja-gris">
          <strong>{lote.codigo}</strong> · {lote.proyecto.nombre} · {m2(lote.superficieM2)} · {bs(lote.precio)}
        </div>
        <Campo etiqueta="Cliente *">
          <SelectorCliente valor={clienteId} onCambiar={setClienteId} testid="reserva-cliente" />
        </Campo>
        <div className="fila-campos">
          <Campo etiqueta="Fecha de vencimiento" ayuda="Opcional. Al vencer, el lote vuelve a quedar disponible.">
            <input
              type="date"
              value={fechaVencimiento}
              min={fechaEnDias(0)}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              data-testid="reserva-vencimiento"
            />
          </Campo>
        </div>
        <Campo etiqueta="Observación">
          <textarea rows={2} value={observacion} onChange={(e) => setObservacion(e.target.value)} data-testid="reserva-observacion" />
        </Campo>
        <MensajeError mensaje={error} testid="reserva-error" />
        <div className="modal-pie">
          <button type="button" className="boton" onClick={onCerrar} data-testid="reserva-cancelar">
            Cancelar
          </button>
          <button type="submit" className="boton boton-ambar" disabled={enviando} data-testid="reserva-confirmar">
            {enviando ? 'Reservando...' : 'Confirmar reserva'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
