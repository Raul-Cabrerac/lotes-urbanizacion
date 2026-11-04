/** Avisos flotantes ("toasts") de éxito o error. */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { mensajeDeError } from '../api/http';

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

export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  const quitar = useCallback((id: number) => setAvisos((lista) => lista.filter((a) => a.id !== id)), []);
  const agregar = useCallback(
    (tipo: Aviso['tipo'], texto: string) => {
      const id = siguienteId++;
      setAvisos((lista) => [...lista, { id, tipo, texto }]);
      setTimeout(() => quitar(id), tipo === 'error' ? 8000 : 4000);
    },
    [quitar],
  );

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
      <div className="avisos" aria-live="polite">
        {avisos.map((aviso) => (
          <div
            key={aviso.id}
            className={`aviso aviso-${aviso.tipo}`}
            data-testid={`aviso-${aviso.tipo}`}
            onClick={() => quitar(aviso.id)}
          >
            {aviso.texto.split('\n').map((linea, i) => (
              <div key={i}>{linea}</div>
            ))}
          </div>
        ))}
      </div>
    </Contexto.Provider>
  );
}

export function useAvisos(): ContextoAvisos {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useAvisos debe usarse dentro de <ProveedorAvisos>');
  return contexto;
}
