import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icono } from './Icono';

interface Props {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  pie?: ReactNode;
  ancho?: 'normal' | 'ancho';
  testid?: string;
}

const SOPORTA_CLOSEDBY = typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype;
const PRIMER_CONTROL = 'input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled)';

/** ¿El puntero quedó fuera del recuadro del diálogo (es decir, sobre el fondo)? */
function fuera(evento: PointerEvent, dialogo: HTMLDialogElement): boolean {
  const r = dialogo.getBoundingClientRect();
  return evento.clientX < r.left || evento.clientX > r.right || evento.clientY < r.top || evento.clientY > r.bottom;
}

/**
 * Ventana modal sobre `<dialog>` nativo, abierta con showModal(): el navegador se encarga de
 * dejar inerte la página de atrás, atrapar el foco, cerrar con Escape y apilar un modal encima
 * de otro (p. ej. "Nuevo cliente" desde la reserva). Se dibuja en <body> (portal) para que el
 * formulario de un modal nunca quede dentro del formulario de otro.
 */
export function Modal({ titulo, onCerrar, children, pie, ancho = 'normal', testid }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const previo = useRef<HTMLElement | null>(null);
  const idTitulo = useId();

  useEffect(() => {
    const elemento = dialogo.current;
    if (!elemento) return;
    if (!elemento.open) {
      previo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      elemento.setAttribute('closedby', 'any'); // Escape y clic en el fondo
      elemento.showModal();
      // Foco inicial: el primer campo, o el botón seguro ("Volver") en una confirmación.
      elemento.querySelector<HTMLElement>(`.modal-cuerpo :is(${PRIMER_CONTROL})`)?.focus();
    }

    // Clic en el fondo: closedby="any" lo resuelve solo; donde no existe (Safari), se imita.
    let presionoFuera = false;
    const alPresionar = (e: PointerEvent) => (presionoFuera = fuera(e, elemento));
    const alSoltar = (e: PointerEvent) => {
      if (presionoFuera && fuera(e, elemento)) elemento.close();
    };
    if (!SOPORTA_CLOSEDBY) {
      elemento.addEventListener('pointerdown', alPresionar);
      elemento.addEventListener('pointerup', alSoltar);
    }
    return () => {
      elemento.removeEventListener('pointerdown', alPresionar);
      elemento.removeEventListener('pointerup', alSoltar);
      // Si el modal se quitó sin cerrarse (p. ej. al guardar), el foco vuelve a quien lo abrió.
      if (!elemento.isConnected) previo.current?.focus();
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogo}
      className={`modal modal-${ancho}`}
      aria-labelledby={idTitulo}
      data-testid={testid}
      // Escape o un clic en el fondo cierran el <dialog>; el estado de React lo sigue. React
      // propaga "close" por el árbol: el de un modal anidado no debe cerrar también este.
      onClose={(e) => e.target === e.currentTarget && onCerrar()}
      // Un formulario dentro de este modal no debe disparar el formulario del modal de abajo.
      onSubmit={(e) => e.stopPropagation()}
    >
      <div className="modal-cabecera">
        <h2 id={idTitulo}>{titulo}</h2>
        <button type="button" className="boton-icono" onClick={onCerrar} aria-label="Cerrar" data-testid="modal-cerrar">
          <Icono nombre="cerrar" tamano={18} />
        </button>
      </div>
      <div className="modal-cuerpo">{children}</div>
      {pie && <div className="modal-pie">{pie}</div>}
    </dialog>,
    document.body,
  );
}
