import { useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api/api';
import type { EstadoReserva } from '../api/tipos';
import type { Reserva } from '../api/tiposOperaciones';
import { useSesion } from '../auth/Sesion';
import { useAvisos } from '../componentes/Avisos';
import { Cargando, Encabezado, MensajeError } from '../componentes/Basicos';
import { ModalConfirmar } from '../componentes/ModalConfirmar';
import { TablaReservas } from '../componentes/TablasOperaciones';
import { useDatos } from '../utilidades/useDatos';

const PESTANAS: { estado: EstadoReserva | ''; texto: string }[] = [
  { estado: 'ACTIVA', texto: 'Activas' },
  { estado: 'VENCIDA', texto: 'Vencidas' },
  { estado: 'CANCELADA', texto: 'Canceladas' },
  { estado: 'CONVERTIDA', texto: 'Convertidas en venta' },
  { estado: '', texto: 'Todas' },
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
      <div className="pestanas">
        {PESTANAS.map((p) => (
          <button
            key={p.texto}
            className={`pestana ${estado === p.estado ? 'activa' : ''}`}
            onClick={() => setEstado(p.estado)}
            data-testid={`pestana-reservas-${p.estado || 'TODAS'}`}
          >
            {p.texto}
          </button>
        ))}
      </div>
      <MensajeError mensaje={error} />
      {cargando && !reservas && <Cargando />}
      {reservas && (
        <div className="tarjeta sin-relleno">
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
                {r.estado === 'ACTIVA' && puede('reservas:gestionar') && (
                  <button className="boton boton-chico" onClick={() => setCancelando(r)} data-testid={`cancelar-reserva-${r.lote.codigo}`}>
                    Cancelar
                  </button>
                )}
              </span>
            )}
          />
        </div>
      )}

      {cancelando && (
        <ModalConfirmar
          titulo={`Cancelar reserva del lote ${cancelando.lote.codigo}`}
          mensaje={`La reserva de ${cancelando.cliente.nombreCompleto} se cancelará y el lote volverá a estar DISPONIBLE.`}
          motivo={{ etiqueta: 'Motivo', obligatorio: false }}
          textoConfirmar="Cancelar reserva"
          peligro
          onCerrar={() => setCancelando(null)}
          onConfirmar={async (motivo) => {
            await api.reservas.cancelar(cancelando.id, motivo);
            setCancelando(null);
            avisos.exito(`Reserva cancelada: el lote ${cancelando.lote.codigo} está disponible.`);
            await recargar();
          }}
        />
      )}
    </div>
  );
}
