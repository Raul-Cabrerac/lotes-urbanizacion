import { api } from '../../api/api';
import type { LoteDetalle } from '../../api/tipos';
import { ModalConfirmar } from '../../componentes/ModalConfirmar';
import { ModalLote } from './ModalLote';
import { ModalReserva } from './ModalReserva';
import { ModalVenta } from './ModalVenta';

export type DialogoLote = 'reservar' | 'vender' | 'cancelar-reserva' | 'editar-lote' | 'eliminar-lote';

interface Props {
  dialogo: DialogoLote;
  lote: LoteDetalle;
  sugerencias: { etapas: string[]; manzanos: string[] };
  onCerrar: () => void;
  /** La operación salió bien: se muestra el mensaje y se vuelven a pedir los datos al servidor. */
  onTerminado: (mensaje: string, deseleccionar?: boolean) => Promise<void>;
  /** Otro usuario cambió el lote mientras tanto: hay que refrescar el mapa. */
  onConflicto: () => Promise<void>;
}

/** Diálogos de las operaciones sobre el lote seleccionado. */
export function DialogosLote({ dialogo, lote, sugerencias, onCerrar, onTerminado, onConflicto }: Props) {
  const reserva = lote.reservaActiva;

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
        <ModalConfirmar
          titulo={`Cancelar reserva del lote ${lote.codigo}`}
          mensaje={`La reserva de ${reserva.cliente.nombreCompleto} se cancelará y el lote volverá a estar DISPONIBLE.`}
          motivo={{ etiqueta: 'Motivo', obligatorio: false }}
          textoConfirmar="Cancelar reserva"
          peligro
          testid="modal-cancelar-reserva"
          onCerrar={onCerrar}
          onConfirmar={async (motivo) => {
            await api.reservas.cancelar(reserva.id, motivo);
            await onTerminado(`Reserva cancelada: el lote ${lote.codigo} está disponible.`);
          }}
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
          onConfirmar={async () => {
            await api.lotes.eliminar(lote.id);
            await onTerminado(`Lote ${lote.codigo} eliminado.`, true);
          }}
        />
      );
  }
}
