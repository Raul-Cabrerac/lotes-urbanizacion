import { api } from '../../api/api';
import type { LoteDetalle } from '../../api/tipos';
import { ModalConfirmar } from '../../componentes/ModalConfirmar';
import { ModalCancelarReserva } from '../ModalCancelarReserva';
import { ModalLote } from './ModalLote';
import { ModalReserva } from './ModalReserva';
import { ModalVenta } from './ModalVenta';

export type DialogoLote = 'reservar' | 'vender' | 'cancelar-reserva' | 'editar-lote' | 'eliminar-lote';

interface Props {
  dialogo: DialogoLote;
  lote: LoteDetalle;
  /** La reserva activa del lote cuando se abrió el diálogo (la que se cancela). */
  reserva: LoteDetalle['reservaActiva'];
  sugerencias: { etapas: string[]; manzanos: string[] };
  onCerrar: () => void;
  /** La operación salió bien: se muestra el mensaje y se vuelven a pedir los datos al servidor. */
  onTerminado: (mensaje: string) => Promise<void>;
  /** El lote se eliminó: se muestra el mensaje y se cierra su panel. */
  onEliminado: (mensaje: string) => Promise<void>;
  /** Otro usuario cambió el lote mientras tanto (409): hay que refrescar el mapa. */
  onConflicto: () => Promise<void>;
}

/** Diálogos de las operaciones sobre el lote seleccionado y el mensaje de cada una al terminar. */
export function DialogosLote({
  dialogo,
  lote,
  reserva,
  sugerencias,
  onCerrar,
  onTerminado,
  onEliminado,
  onConflicto,
}: Props) {
  switch (dialogo) {
    case 'reservar':
      return (
        <ModalReserva
          lote={lote}
          onCerrar={onCerrar}
          onConflicto={onConflicto}
          onReservado={(r) =>
            onTerminado(`Lote ${lote.codigo} reservado para ${r.cliente.nombreCompleto}.`)
          }
        />
      );
    case 'vender':
      return (
        <ModalVenta
          lote={lote}
          onCerrar={onCerrar}
          onConflicto={onConflicto}
          onVendido={(v) =>
            onTerminado(`Venta registrada: lote ${lote.codigo} vendido a ${v.cliente.nombreCompleto}.`)
          }
        />
      );
    case 'cancelar-reserva':
      if (!reserva) return null;
      return (
        <ModalCancelarReserva
          codigoLote={lote.codigo}
          reserva={reserva}
          testid="modal-cancelar-reserva"
          onCerrar={onCerrar}
          onConflicto={onConflicto}
          onCancelada={onTerminado}
        />
      );
    case 'editar-lote':
      return (
        <ModalLote
          proyectoId={lote.proyecto.id}
          lote={lote}
          sugerencias={sugerencias}
          onCerrar={onCerrar}
          onGuardado={(guardado) => onTerminado(`Lote ${guardado.codigo} actualizado.`)}
        />
      );
    case 'eliminar-lote':
      return (
        <ModalConfirmar
          titulo={`Eliminar lote ${lote.codigo}`}
          mensaje="El lote se eliminará del proyecto. Solo es posible si nunca tuvo reservas ni ventas."
          textoConfirmar="Eliminar"
          peligro
          testid="modal-eliminar-lote"
          onCerrar={onCerrar}
          onConflicto={onConflicto}
          onConfirmar={async () => {
            await api.lotes.eliminar(lote.id);
            await onEliminado(`Lote ${lote.codigo} eliminado.`);
          }}
        />
      );
  }
}
