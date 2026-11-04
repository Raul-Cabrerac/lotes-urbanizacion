import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  pie?: ReactNode;
  ancho?: 'normal' | 'ancho';
  testid?: string;
}

/**
 * Ventana modal. Se dibuja en <body> (portal) para poder abrir un modal encima
 * de otro (p. ej. "Nuevo cliente" desde la reserva). Escape cierra solo el de arriba.
 */
export function Modal({ titulo, onCerrar, children, pie, ancho = 'normal', testid }: Props) {
  const fondo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      const abiertos = document.querySelectorAll('.modal-fondo');
      if (e.key === 'Escape' && abiertos[abiertos.length - 1] === fondo.current) onCerrar();
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [onCerrar]);

  return createPortal(
    <div
      ref={fondo}
      className="modal-fondo"
      onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}
      // Un formulario dentro de este modal no debe disparar el formulario del modal de abajo.
      onSubmit={(e) => e.stopPropagation()}
    >
      <div className={`modal modal-${ancho}`} role="dialog" aria-modal="true" aria-label={titulo} data-testid={testid}>
        <div className="modal-cabecera">
          <h2>{titulo}</h2>
          <button type="button" className="boton-icono" onClick={onCerrar} aria-label="Cerrar" data-testid="modal-cerrar">
            ×
          </button>
        </div>
        <div className="modal-cuerpo">{children}</div>
        {pie && <div className="modal-pie">{pie}</div>}
      </div>
    </div>,
    document.body,
  );
}
