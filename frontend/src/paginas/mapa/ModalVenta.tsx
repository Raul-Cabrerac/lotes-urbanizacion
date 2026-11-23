import { useState, type FormEvent } from 'react';
import { api } from '../../api/api';
import type { LoteDetalle } from '../../api/tipos';
import {
  MAX_CUOTAS,
  METODO_PAGO_POR_DEFECTO,
  METODOS_PAGO,
  NUMERO_CUOTA_AL_FIRMAR,
  operacionesDelLote,
  sumar,
  type MetodoPago,
  type ModalidadPago,
} from '../../dominio';
import type { Venta } from '../../api/tiposOperaciones';
import { Campo, MensajeError } from '../../componentes/Basicos';
import { Modal } from '../../componentes/Modal';
import { SelectorCliente } from '../../componentes/SelectorCliente';
import { numeroOIndefinido } from '../../utilidades/entradas';
import { ETIQUETA_MODALIDAD } from '../../utilidades/estados';
import { bs, fecha } from '../../utilidades/formato';
import { useDatos } from '../../utilidades/useDatos';
import { useEnvio } from '../../utilidades/useEnvio';
import { useValorDiferido } from '../../utilidades/useValorDiferido';

/**
 * Condiciones que propone el formulario de venta. Son sugerencias, no reglas: el backend acepta
 * cualquier cuota inicial y número de cuotas válidos (docs/DECISIONES.md §15).
 */
const MODALIDAD_SUGERIDA: ModalidadPago = 'FINANCIADO';
const PORCENTAJE_CUOTA_INICIAL_SUGERIDA = 0.2;
const CUOTAS_SUGERIDAS = 12;

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
  // Si el lote está reservado, el comprador es quien tiene la reserva (también si la reserva
  // apareció al refrescar tras un 409).
  const [clienteElegido, setClienteElegido] = useState<number | null>(reserva?.cliente.id ?? null);
  const clienteId = reserva ? reserva.cliente.id : clienteElegido;
  const [precio, setPrecio] = useState(String(lote.precio));
  const [modalidad, setModalidad] = useState<ModalidadPago>(MODALIDAD_SUGERIDA);
  const [cuotaInicial, setCuotaInicial] = useState(String(Math.round(lote.precio * PORCENTAJE_CUOTA_INICIAL_SUGERIDA)));
  const [numeroCuotas, setNumeroCuotas] = useState(String(CUOTAS_SUGERIDAS));
  const [fechaPrimeraCuota, setFechaPrimeraCuota] = useState('');
  const [metodo, setMetodo] = useState<MetodoPago>(METODO_PAGO_POR_DEFECTO);
  const { enviar, enviando, error, setError } = useEnvio({ alConflicto: onConflicto });

  const condiciones = {
    modalidad,
    precioPactado: numeroOIndefinido(precio) as number,
    ...(modalidad === 'FINANCIADO'
      ? {
          cuotaInicial: numeroOIndefinido(cuotaInicial) ?? 0,
          numeroCuotas: numeroOIndefinido(numeroCuotas),
          fechaPrimeraCuota: fechaPrimeraCuota || undefined,
        }
      : {}),
  };

  // Vista previa del cronograma (la calcula el backend con las mismas reglas que al vender), cuando
  // el usuario deja de escribir. Solo se muestra si corresponde a las condiciones actuales.
  const clavePlan = JSON.stringify(condiciones);
  const claveSimulada = useValorDiferido(clavePlan);
  const simulacion = useDatos(
    () => api.ventas.simularPlan(JSON.parse(claveSimulada) as typeof condiciones),
    [claveSimulada],
  );
  const alDia = clavePlan === claveSimulada && !simulacion.cargando && !simulacion.error;
  const plan = alDia ? simulacion.datos : null;

  const vender = (e: FormEvent) => {
    e.preventDefault();
    if (!clienteId) return setError('Seleccione un cliente.');
    void enviar(async () =>
      onVendido(await api.ventas.registrar({ loteId: lote.id, clienteId, metodoPago: metodo, ...condiciones })),
    );
  };

  const cuotaACobrar = plan?.find((c) => c.numero === NUMERO_CUOTA_AL_FIRMAR);
  const mensuales = plan?.filter((c) => c.numero !== NUMERO_CUOTA_AL_FIRMAR) ?? [];
  const filasVisibles = mensuales.length > 8 ? [...mensuales.slice(0, 5), null, ...mensuales.slice(-2)] : mensuales;

  return (
    <Modal titulo={`Vender lote ${lote.codigo}`} onCerrar={onCerrar} ancho testid="modal-venta">
      <form onSubmit={vender} className="formulario">
        <div className="columnas-venta">
          <div className="formulario">
            <Campo etiqueta="Cliente comprador *">
              {reserva ? (
                <div className="caja caja-ambar" data-testid="venta-cliente-reserva">
                  {reserva.cliente.nombreCompleto} ({reserva.cliente.documento}) — tiene la reserva del lote
                </div>
              ) : (
                <SelectorCliente valor={clienteId} onCambiar={setClienteElegido} testid="venta-cliente" />
              )}
            </Campo>
            <Campo etiqueta="Precio pactado (Bs) *" ayuda={`Precio de lista: ${bs(lote.precio)}. Queda guardado en la venta aunque luego cambie el precio del lote.`}>
              <input type="number" min="0" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} required data-testid="venta-precio" />
            </Campo>
            <Campo etiqueta="Modalidad de pago">
              <div className="opciones">
                <label>
                  <input type="radio" checked={modalidad === 'CONTADO'} onChange={() => setModalidad('CONTADO')} data-testid="venta-contado" /> {ETIQUETA_MODALIDAD.CONTADO}
                </label>
                <label>
                  <input type="radio" checked={modalidad === 'FINANCIADO'} onChange={() => setModalidad('FINANCIADO')} data-testid="venta-financiado" /> {ETIQUETA_MODALIDAD.FINANCIADO}
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
                    <input type="number" min="1" max={MAX_CUOTAS} step="1" value={numeroCuotas} onChange={(e) => setNumeroCuotas(e.target.value)} required data-testid="venta-numero-cuotas" />
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
            <MensajeError mensaje={simulacion.error} testid="venta-error-plan" />
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
                    {mensuales.length} cuotas mensuales · saldo a financiar {bs(sumar(...mensuales.map((c) => c.monto)))}
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
          <button
            type="submit"
            className="boton boton-primario"
            disabled={enviando || !plan || !operacionesDelLote(lote, lote.proyecto.estado).vender}
            data-testid="venta-confirmar"
          >
            {enviando ? 'Registrando…' : 'Confirmar venta'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
