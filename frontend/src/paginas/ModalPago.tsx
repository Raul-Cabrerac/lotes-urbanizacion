import { useState, type FormEvent } from 'react';
import { api } from '../api/api';
import { METODO_PAGO_POR_DEFECTO, METODOS_PAGO, type MetodoPago } from '../dominio';
import type { Cuota, Venta } from '../api/tiposOperaciones';
import { Campo, MensajeError } from '../componentes/Basicos';
import { Modal } from '../componentes/Modal';
import { bs, fecha } from '../utilidades/formato';
import { useEnvio } from '../utilidades/useEnvio';

interface Props {
  venta: Venta;
  cuota: Cuota;
  onCerrar: () => void;
  /** Recibe la venta actualizada (cuotas, pagos y saldo recalculados por el servidor). */
  onPagado: (venta: Venta) => void;
  /** Otra operación cerró/pagó la venta o cuota mientras tanto: refresca la vista padre. */
  onConflicto?: () => void;
}

/** Registro de un pago de una cuota (consigna §9). El monto propuesto es lo pendiente de la cuota. */
export function ModalPago({ venta, cuota, onCerrar, onPagado, onConflicto }: Props) {
  const [monto, setMonto] = useState(String(cuota.montoPendiente));
  const [metodo, setMetodo] = useState<MetodoPago>(METODO_PAGO_POR_DEFECTO);
  const [referencia, setReferencia] = useState('');
  const { enviar, enviando, error } = useEnvio({ alConflicto: onConflicto });

  const registrar = (e: FormEvent) => {
    e.preventDefault();
    const datos = { cuotaId: cuota.id, monto: Number(monto), metodo, referencia };
    void enviar(async () => onPagado(await api.ventas.registrarPago(venta.id, datos)));
  };

  return (
    <Modal titulo={`Registrar pago · ${cuota.concepto}`} onCerrar={onCerrar} testid="modal-pago">
      <form onSubmit={registrar} className="formulario">
        <div className="caja caja-gris">
          Lote {venta.lote.codigo} · {cuota.concepto} vence el {fecha(cuota.fechaVencimiento)} · pendiente{' '}
          <strong>{bs(cuota.montoPendiente)}</strong>
          <div className="texto-suave pequeno">Saldo de la venta: {bs(venta.resumen.saldoPendiente)}</div>
        </div>
        <div className="fila-campos">
          <Campo etiqueta="Monto (Bs) *" ayuda="Puede ser un pago parcial.">
            <input
              type="number"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
              data-testid="pago-monto"
            />
          </Campo>
          <Campo etiqueta="Método">
            <select
              value={metodo}
              onChange={(e) => setMetodo(e.target.value as MetodoPago)}
              data-testid="pago-metodo"
            >
              {METODOS_PAGO.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Campo>
        </div>
        <Campo etiqueta="Referencia / comprobante">
          <input
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            placeholder="Ej.: N° de transferencia"
            data-testid="pago-referencia"
          />
        </Campo>
        <MensajeError mensaje={error} testid="pago-error" />
        <div className="modal-pie">
          <button type="button" className="boton" onClick={onCerrar} data-testid="pago-cancelar">
            Cancelar
          </button>
          <button type="submit" className="boton boton-primario" disabled={enviando} data-testid="pago-confirmar">
            {enviando ? 'Registrando…' : 'Registrar pago'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
