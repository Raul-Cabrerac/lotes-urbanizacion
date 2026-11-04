/** Componentes pequeños reutilizables. */
import type { ReactNode } from 'react';
import type { EstadoCuota, EstadoLote, EstadoPago, EstadoProyecto, EstadoReserva, EstadoVenta } from '../api/tipos';

type Estado = EstadoLote | EstadoProyecto | EstadoReserva | EstadoVenta | EstadoCuota | EstadoPago;

/** Color de cada estado (clases definidas en estilos.css). */
const TONO: Record<Estado, string> = {
  DISPONIBLE: 'verde',
  RESERVADO: 'ambar',
  VENDIDO: 'rojo',
  BLOQUEADO: 'gris',
  BORRADOR: 'gris',
  PUBLICADO: 'verde',
  ACTIVA: 'ambar',
  CANCELADA: 'gris',
  VENCIDA: 'rojo',
  CONVERTIDA: 'azul',
  VIGENTE: 'verde',
  ANULADA: 'gris',
  PENDIENTE: 'ambar',
  PAGADA: 'verde',
  VALIDO: 'verde',
  ANULADO: 'gris',
};

export function Insignia({ estado, testid }: { estado: Estado; testid?: string }) {
  return (
    <span className={`insignia insignia-${TONO[estado]}`} data-testid={testid} data-estado={estado}>
      {estado}
    </span>
  );
}

export function Cargando({ texto = 'Cargando...' }: { texto?: string }) {
  return (
    <div className="cargando" role="status">
      <span className="spinner" /> {texto}
    </div>
  );
}

export function MensajeError({ mensaje, testid = 'mensaje-error' }: { mensaje: string | null; testid?: string }) {
  if (!mensaje) return null;
  return (
    <div className="alerta alerta-error" role="alert" data-testid={testid}>
      {mensaje.split('\n').map((linea, i) => (
        <div key={i}>{linea}</div>
      ))}
    </div>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return <div className="vacio">{children}</div>;
}

/** Etiqueta + control de formulario. */
export function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: ReactNode }) {
  return (
    <label className="campo">
      <span className="campo-etiqueta">{etiqueta}</span>
      {children}
      {ayuda && <span className="campo-ayuda">{ayuda}</span>}
    </label>
  );
}

/** Dato de solo lectura: etiqueta arriba, valor abajo. */
export function Dato({ etiqueta, children, testid }: { etiqueta: string; children: ReactNode; testid?: string }) {
  return (
    <div className="dato">
      <div className="dato-etiqueta">{etiqueta}</div>
      <div className="dato-valor" data-testid={testid}>
        {children}
      </div>
    </div>
  );
}

export function Encabezado({ titulo, subtitulo, children }: { titulo: string; subtitulo?: ReactNode; children?: ReactNode }) {
  return (
    <div className="encabezado-pagina">
      <div>
        <h1>{titulo}</h1>
        {subtitulo && <p className="texto-suave">{subtitulo}</p>}
      </div>
      {children && <div className="acciones">{children}</div>}
    </div>
  );
}
