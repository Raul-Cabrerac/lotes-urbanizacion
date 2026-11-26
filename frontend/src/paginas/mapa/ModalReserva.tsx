import { useState, type FormEvent } from 'react';
import { api } from '../../api/api';
import type { LoteDetalle } from '../../api/tipos';
import type { Reserva } from '../../api/tiposOperaciones';
import { Campo, MensajeError } from '../../componentes/Basicos';
import { Modal } from '../../componentes/Modal';
import { SelectorCliente } from '../../componentes/SelectorCliente';
import {
  anticipoMinimo,
  METODO_PAGO_POR_DEFECTO,
  METODOS_PAGO,
  PORCENTAJE_MINIMO_ANTICIPO,
  type MetodoPago,
} from '../../dominio';
import { fechaEnDias } from '../../utilidades/entradas';
import { bs, m2 } from '../../utilidades/formato';
import { useEnvio } from '../../utilidades/useEnvio';

/**
 * Plazo que propone el formulario al reservar. Es una sugerencia, no una regla: el backend acepta
 * cualquier fecha futura (docs/DECISIONES.md §15).
 */
const DIAS_RESERVA_SUGERIDOS = 7;

/** Registrar la reserva de un lote DISPONIBLE, con el anticipo que la respalda (consigna, sección 7). */
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
  const [fechaVencimiento, setFechaVencimiento] = useState(fechaEnDias(DIAS_RESERVA_SUGERIDOS));
  const [observacion, setObservacion] = useState('');
  // El formulario propone el anticipo mínimo: el 10 % del precio del lote (docs/DECISIONES.md §18).
  const minimo = anticipoMinimo(lote.precio);
  const [anticipo, setAnticipo] = useState(String(minimo));
  const [metodo, setMetodo] = useState<MetodoPago>(METODO_PAGO_POR_DEFECTO);
  const { enviar, enviando, error, setError } = useEnvio({ alConflicto: onConflicto });

  const reservar = (e: FormEvent) => {
    e.preventDefault();
    if (!clienteId) return setError('Seleccione un cliente.');
    const datos = {
      loteId: lote.id,
      clienteId,
      fechaVencimiento: fechaVencimiento || null,
      observacion,
      anticipo: Number(anticipo),
      metodoAnticipo: metodo,
    };
    void enviar(async () => onReservado(await api.reservas.crear(datos)));
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
          <Campo
            etiqueta="Anticipo (Bs) *"
            ayuda={`Mínimo el ${PORCENTAJE_MINIMO_ANTICIPO} % del precio: ${bs(minimo)}. Se descuenta al vender.`}
          >
            <input
              type="number"
              step="0.01"
              value={anticipo}
              onChange={(e) => setAnticipo(e.target.value)}
              required
              data-testid="reserva-anticipo"
            />
          </Campo>
          <Campo etiqueta="Método de pago">
            <select value={metodo} onChange={(e) => setMetodo(e.target.value as MetodoPago)} data-testid="reserva-metodo">
              {METODOS_PAGO.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Campo>
        </div>
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
          <button type="submit" className="boton boton-primario" disabled={enviando} data-testid="reserva-confirmar">
            {enviando ? 'Reservando…' : 'Confirmar reserva'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
