import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api/api';
import { ApiError, mensajeDeError } from '../../api/http';
import { METODOS_PAGO, type LoteDetalle, type MetodoPago, type Modalidad } from '../../api/tipos';
import type { CuotaSimulada, Venta } from '../../api/tiposOperaciones';
import { Campo, MensajeError } from '../../componentes/Basicos';
import { Modal } from '../../componentes/Modal';
import { SelectorCliente } from '../../componentes/SelectorCliente';
import { bs, fecha, numeroOIndefinido, sumarMontos } from '../../utilidades/formato';

/** Registrar la venta de un lote, al contado o financiada con su plan de pagos (consigna, secciones 8 y 9). */
export function ModalVenta({
  lote,
  onCerrar,
  onVendido,
  onConflicto,
}: {
  lote: LoteDetalle;
  onCerrar: () => void;
  onVendido: (venta: Venta) => void;
  onConflicto: () => void;
}) {
  const reserva = lote.reservaActiva;
  const [clienteId, setClienteId] = useState<number | null>(reserva?.cliente.id ?? null);
  const [precio, setPrecio] = useState(String(lote.precio));
  const [modalidad, setModalidad] = useState<Modalidad>('FINANCIADO');
  const [cuotaInicial, setCuotaInicial] = useState(String(Math.round(lote.precio * 0.2)));
  const [numeroCuotas, setNumeroCuotas] = useState('12');
  const [fechaPrimeraCuota, setFechaPrimeraCuota] = useState('');
  const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO');
  const [plan, setPlan] = useState<CuotaSimulada[] | null>(null);
  const [errorPlan, setErrorPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const condiciones = () => ({
    modalidad,
    precioPactado: numeroOIndefinido(precio) as number,
    ...(modalidad === 'FINANCIADO'
      ? {
          cuotaInicial: numeroOIndefinido(cuotaInicial) ?? 0,
          numeroCuotas: numeroOIndefinido(numeroCuotas),
          fechaPrimeraCuota: fechaPrimeraCuota || undefined,
        }
      : {}),
  });

  // Vista previa del cronograma (la calcula el backend con las mismas reglas que al vender).
  useEffect(() => {
    const temporizador = setTimeout(async () => {
      try {
        setPlan(await api.ventas.simularPlan(condiciones()));
        setErrorPlan(null);
      } catch (err) {
        setPlan(null);
        setErrorPlan(mensajeDeError(err));
      }
    }, 300);
    return () => clearTimeout(temporizador);
  }, [precio, modalidad, cuotaInicial, numeroCuotas, fechaPrimeraCuota]);

  const vender = async (e: FormEvent) => {
    e.preventDefault();
    if (!clienteId) return setError('Seleccione un cliente.');
    setEnviando(true);
    setError(null);
    try {
      onVendido(await api.ventas.registrar({ loteId: lote.id, clienteId, metodoPago: metodo, ...condiciones() }));
    } catch (err) {
      setError(mensajeDeError(err));
      setEnviando(false);
      if (err instanceof ApiError && err.estado === 409) onConflicto();
    }
  };

  const cuotaACobrar = plan?.find((c) => c.numero === 0);
  const mensuales = plan?.filter((c) => c.numero > 0) ?? [];
  const filasVisibles = mensuales.length > 8 ? [...mensuales.slice(0, 5), null, ...mensuales.slice(-2)] : mensuales;

  return (
    <Modal titulo={`Vender lote ${lote.codigo}`} onCerrar={onCerrar} ancho="ancho" testid="modal-venta">
      <form onSubmit={vender} className="formulario">
        <div className="columnas-venta">
          <div className="formulario">
            <Campo etiqueta="Cliente comprador *">
              {reserva ? (
                <div className="caja caja-ambar" data-testid="venta-cliente-reserva">
                  {reserva.cliente.nombreCompleto} ({reserva.cliente.documento}) — tiene la reserva del lote
                </div>
              ) : (
                <SelectorCliente valor={clienteId} onCambiar={setClienteId} testid="venta-cliente" />
              )}
            </Campo>
            <Campo etiqueta="Precio pactado (Bs) *" ayuda={`Precio de lista: ${bs(lote.precio)}. Queda guardado en la venta aunque luego cambie el precio del lote.`}>
              <input type="number" min="0" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} required data-testid="venta-precio" />
            </Campo>
            <Campo etiqueta="Modalidad de pago">
              <div className="opciones">
                <label>
                  <input type="radio" checked={modalidad === 'CONTADO'} onChange={() => setModalidad('CONTADO')} data-testid="venta-contado" /> Al contado
                </label>
                <label>
                  <input type="radio" checked={modalidad === 'FINANCIADO'} onChange={() => setModalidad('FINANCIADO')} data-testid="venta-financiado" /> Financiado
                </label>
              </div>
            </Campo>
            {modalidad === 'FINANCIADO' && (
              <>
                <div className="fila-campos">
                  <Campo etiqueta="Cuota inicial (Bs)">
                    <input type="number" min="0" step="0.01" value={cuotaInicial} onChange={(e) => setCuotaInicial(e.target.value)} data-testid="venta-cuota-inicial" />
                  </Campo>
                  <Campo etiqueta="Número de cuotas *">
                    <input type="number" min="1" max="240" step="1" value={numeroCuotas} onChange={(e) => setNumeroCuotas(e.target.value)} required data-testid="venta-numero-cuotas" />
                  </Campo>
                </div>
                <Campo etiqueta="Vencimiento de la primera cuota" ayuda="Si se deja vacío: un mes después de hoy.">
                  <input type="date" value={fechaPrimeraCuota} onChange={(e) => setFechaPrimeraCuota(e.target.value)} data-testid="venta-primera-cuota" />
                </Campo>
              </>
            )}
            <Campo etiqueta={modalidad === 'CONTADO' ? 'Método del pago al contado' : 'Método de pago de la cuota inicial'}>
              <select value={metodo} onChange={(e) => setMetodo(e.target.value as MetodoPago)} data-testid="venta-metodo">
                {METODOS_PAGO.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Campo>
          </div>

          <div className="vista-plan" data-testid="venta-vista-plan">
            <h3>Plan de pagos</h3>
            <MensajeError mensaje={errorPlan} testid="venta-error-plan" />
            {plan && (
              <>
                {cuotaACobrar && (
                  <div className="caja caja-verde">
                    {cuotaACobrar.concepto}: <strong>{bs(cuotaACobrar.monto)}</strong> — se registra como pagada al confirmar la venta.
                  </div>
                )}
                {mensuales.length > 0 && (
                  <table className="tabla tabla-compacta">
                    <thead>
                      <tr>
                        <th>N°</th>
                        <th>Vence</th>
                        <th className="numero">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filasVisibles.map((c, i) =>
                        c ? (
                          <tr key={c.numero}>
                            <td>{c.numero}</td>
                            <td>{fecha(c.fechaVencimiento)}</td>
                            <td className="numero">{bs(c.monto)}</td>
                          </tr>
                        ) : (
                          <tr key={`puntos-${i}`}>
                            <td colSpan={3} className="texto-suave">
                              …
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                )}
                {mensuales.length > 0 && (
                  <p className="texto-suave pequeno">
                    {mensuales.length} cuotas mensuales · saldo a financiar {bs(sumarMontos(mensuales.map((c) => c.monto)))}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <MensajeError mensaje={error} testid="venta-error" />
        <div className="modal-pie">
          <button type="button" className="boton" onClick={onCerrar} data-testid="venta-cancelar">
            Cancelar
          </button>
          <button type="submit" className="boton boton-rojo" disabled={enviando || !plan} data-testid="venta-confirmar">
            {enviando ? 'Registrando...' : 'Confirmar venta'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
