/** Avisos flotantes ("toasts") de éxito o error. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { mensajeDeError } from '../api/http';
import { Icono } from './Icono';

interface Aviso {
  id: number;
  tipo: 'exito' | 'error';
  texto: string;
}

interface ContextoAvisos {
  exito(texto: string): void;
  error(errorOTexto: unknown): void;
}

const Contexto = createContext<ContextoAvisos | null>(null);
let siguienteId = 1;

const DURACION = { exito: 5000, error: 9000 } as const;

/** ariaNotify() anuncia el texto sin depender de una región "live" (si el navegador lo tiene). */
type DocumentoConAnuncios = Document & { ariaNotify?: (texto: string) => void };
const documento = document as DocumentoConAnuncios;
const SOPORTA_ARIA_NOTIFY = typeof documento.ariaNotify === 'function';

export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const region = useRef<HTMLDivElement>(null);
  // Dónde estaba el foco cuando apareció cada aviso, para devolverlo si se cierra con el teclado.
  const focoPrevio = useRef(new Map<number, HTMLElement>());

  // La región va en la capa superior (popover manual): ningún z-index del mapa la tapa y no se
  // cierra sola al hacer clic en otra parte.
  useEffect(() => {
    const elemento = region.current;
    if (elemento && 'showPopover' in elemento && !elemento.matches(':popover-open')) elemento.showPopover();
  }, []);

  const quitar = useCallback((id: number) => {
    focoPrevio.current.delete(id);
    setAvisos((lista) => lista.filter((a) => a.id !== id));
  }, []);

  const agregar = useCallback((tipo: Aviso['tipo'], texto: string) => {
    const id = siguienteId++;
    if (document.activeElement instanceof HTMLElement) focoPrevio.current.set(id, document.activeElement);
    setAvisos((lista) => [...lista, { id, tipo, texto }]);
    if (SOPORTA_ARIA_NOTIFY) documento.ariaNotify?.(texto);
  }, []);

  /** Cierre con el botón: el foco pasa al aviso siguiente o vuelve a donde estaba. */
  const cerrarConBoton = (id: number) => {
    const botones = [...(region.current?.querySelectorAll<HTMLButtonElement>('.aviso .boton-icono') ?? [])];
    const indice = botones.findIndex((b) => b.dataset.aviso === String(id));
    const siguiente = botones[indice + 1] ?? botones[indice - 1];
    const volverA = focoPrevio.current.get(id);
    quitar(id);
    if (siguiente) siguiente.focus();
    else if (volverA?.isConnected) volverA.focus();
  };

  const valor = useMemo<ContextoAvisos>(
    () => ({
      exito: (texto) => agregar('exito', texto),
      error: (e) => agregar('error', typeof e === 'string' ? e : mensajeDeError(e)),
    }),
    [agregar],
  );

  return (
    <Contexto.Provider value={valor}>
      {children}
      <div
        ref={region}
        className="avisos"
        role="region"
        aria-label="Avisos"
        aria-live={SOPORTA_ARIA_NOTIFY ? undefined : 'polite'}
        popover="manual"
      >
        {avisos.map((aviso) => (
          <TarjetaAviso key={aviso.id} aviso={aviso} onVencido={quitar} onCerrar={cerrarConBoton} />
        ))}
      </div>
    </Contexto.Provider>
  );
}

/** Un aviso. Se va solo al cumplir su tiempo, salvo que el foco esté en él: entonces espera a que salga. */
function TarjetaAviso({
  aviso,
  onVencido,
  onCerrar,
}: {
  aviso: Aviso;
  onVencido: (id: number) => void;
  onCerrar: (id: number) => void;
}) {
  const elemento = useRef<HTMLDivElement>(null);
  const [vencido, setVencido] = useState(false);

  useEffect(() => {
    const temporizador = setTimeout(() => setVencido(true), DURACION[aviso.tipo]);
    return () => clearTimeout(temporizador);
  }, [aviso.tipo]);

  useEffect(() => {
    if (vencido && !elemento.current?.contains(document.activeElement)) onVencido(aviso.id);
  }, [vencido, aviso.id, onVencido]);

  return (
    <div
      ref={elemento}
      className={`aviso aviso-${aviso.tipo}`}
      data-testid={`aviso-${aviso.tipo}`}
      onBlur={(e) => {
        if (vencido && !e.currentTarget.contains(e.relatedTarget)) onVencido(aviso.id);
      }}
    >
      <div className="aviso-texto">
        {aviso.texto.split('\n').map((linea, i) => (
          <div key={i}>{linea}</div>
        ))}
      </div>
      <button
        type="button"
        className="boton-icono"
        onClick={() => onCerrar(aviso.id)}
        aria-label="Cerrar aviso"
        data-aviso={aviso.id}
      >
        <Icono nombre="cerrar" />
      </button>
    </div>
  );
}

export function useAvisos(): ContextoAvisos {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useAvisos debe usarse dentro de <ProveedorAvisos>');
  return contexto;
}
