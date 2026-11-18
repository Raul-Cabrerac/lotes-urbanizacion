import { useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api/api';
import { admite, ESTADOS_RESERVA, OPERACIONES_RESERVA, type EstadoReserva } from '../dominio';
import type { Reserva } from '../api/tiposOperaciones';
import { useSesion } from '../auth/Sesion';
import { useAvisos } from '../componentes/Avisos';
import { Cargando, ContenedorTabla, Encabezado, MensajeError } from '../componentes/Basicos';
import { TablaReservas } from '../componentes/TablasOperaciones';
import { ASPECTO_ESTADO } from '../utilidades/estados';
import { useDatos } from '../utilidades/useDatos';
import { ModalCancelarReserva } from './ModalCancelarReserva';

/** Lugar de cada estado en las pestañas: un estado nuevo en ESTADOS_RESERVA no compila hasta tener el suyo. */
const ORDEN_PESTANAS: Record<EstadoReserva, number> = { ACTIVA: 0, VENCIDA: 1, CANCELADA: 2, CONVERTIDA: 3 };
const PESTANAS: (EstadoReserva | '')[] = [
  ...[...ESTADOS_RESERVA].sort((a, b) => ORDEN_PESTANAS[a] - ORDEN_PESTANAS[b]),
  '', // todas
];

/** Consulta de reservas activas y vencidas (consigna, sección 10). */
export function Reservas() {
  const { puede } = useSesion();
  const avisos = useAvisos();
  const [estado, setEstado] = useState<EstadoReserva | ''>('ACTIVA');
  const { datos: reservas, error, cargando, recargar } = useDatos(() => api.reservas.listar({ estado }), [estado]);
  const [cancelando, setCancelando] = useState<Reserva | null>(null);

  return (
    <div className="pagina">
      <Encabezado titulo="Reservas" subtitulo="Las reservas vencidas liberan su lote automáticamente." />
      <div className="pestanas" role="group" aria-label="Filtrar reservas por estado">
        {PESTANAS.map((p) => (
          <button
            key={p || 'TODAS'}
            type="button"
            className="pestana"
            aria-pressed={estado === p}
            onClick={() => setEstado(p)}
            data-testid={`pestana-reservas-${p || 'TODAS'}`}
          >
            {p ? ASPECTO_ESTADO[p].plural : 'Todas'}
          </button>
        ))}
      </div>
      <MensajeError mensaje={error} />
      {cargando && !reservas && <Cargando />}
      {reservas && (
        <ContenedorTabla etiqueta="Reservas">
          <TablaReservas
            reservas={reservas}
            acciones={(r) => (
              <span className="acciones-fila">
                <Link
                  className="boton boton-chico"
                  to={`/proyectos/${r.lote.proyecto.id}?lote=${r.loteId}`}
                  data-testid={`ver-en-mapa-${r.lote.codigo}`}
                >
                  Ver en mapa
                </Link>
                {admite(OPERACIONES_RESERVA.cancelar, r.estado) && puede('reservas:gestionar') && (
                  <button type="button" className="boton boton-chico" onClick={() => setCancelando(r)} data-testid={`cancelar-reserva-${r.lote.codigo}`}>
                    Cancelar
                  </button>
                )}
              </span>
            )}
          />
        </ContenedorTabla>
      )}

      {cancelando && (
        <ModalCancelarReserva
          codigoLote={cancelando.lote.codigo}
          reserva={cancelando}
          testid="modal-confirmar"
          onCerrar={() => setCancelando(null)}
          onConflicto={() => void recargar()}
          onCancelada={async (mensaje) => {
            setCancelando(null);
            avisos.exito(mensaje);
            await recargar();
          }}
        />
      )}
    </div>
  );
}
