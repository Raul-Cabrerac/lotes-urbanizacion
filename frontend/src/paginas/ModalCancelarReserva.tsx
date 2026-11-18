import { api } from '../api/api';
import { ModalConfirmar } from '../componentes/ModalConfirmar';

interface Props {
  codigoLote: string;
  reserva: { id: number; cliente: { nombreCompleto: string } };
  /** 'modal-cancelar-reserva' desde el mapa, 'modal-confirmar' desde la lista de reservas. */
  testid: string;
  onCerrar: () => void;
  /** La reserva se canceló: recibe el mensaje para el aviso. */
  onCancelada: (mensaje: string) => Promise<void> | void;
  /** Otro usuario cerró la reserva mientras tanto (409). */
  onConflicto: () => void;
}

/** Cancelar una reserva activa: el lote vuelve a quedar DISPONIBLE (consigna, sección 7). */
export function ModalCancelarReserva({ codigoLote, reserva, testid, onCerrar, onCancelada, onConflicto }: Props) {
  return (
    <ModalConfirmar
      titulo={`Cancelar reserva del lote ${codigoLote}`}
      mensaje={`La reserva de ${reserva.cliente.nombreCompleto} se cancelará y el lote volverá a estar DISPONIBLE.`}
      motivo={{ etiqueta: 'Motivo', obligatorio: false }}
      textoConfirmar="Cancelar reserva"
      peligro
      testid={testid}
      onCerrar={onCerrar}
      onConflicto={onConflicto}
      onConfirmar={async (motivo) => {
        await api.reservas.cancelar(reserva.id, motivo);
        await onCancelada(`Reserva cancelada: el lote ${codigoLote} está disponible.`);
      }}
    />
  );
}
