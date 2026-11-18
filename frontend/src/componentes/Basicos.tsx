/** Componentes pequeños reutilizables. */
import type { InputHTMLAttributes, ReactNode } from 'react';
import { ASPECTO_ESTADO, estiloEstado, type Estado } from '../utilidades/estados';
import { Icono } from './Icono';

/**
 * Estado con su color. El texto queda en el DOM tal cual el enum ('DISPONIBLE': las pruebas lo
 * leen así) y estilos.css lo muestra como 'Disponible'.
 */
export function Insignia({ estado, testid }: { estado: Estado; testid?: string }) {
  const { tono } = ASPECTO_ESTADO[estado];
  return (
    <span
      className={`insignia insignia-${tono}`}
      style={estiloEstado(estado)}
      data-testid={testid}
      data-estado={estado}
    >
      {estado}
    </span>
  );
}

/** Indicador de carga: un <progress> sin valor es "indeterminado" para los lectores de pantalla. */
export function Cargando() {
  return (
    <div className="cargando">
      <progress className="spinner" aria-label="Cargando…" />
      <span aria-hidden="true">Cargando…</span>
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

/**
 * Envoltorio de una tabla: si no entra a lo ancho se desplaza, y con el teclado se puede
 * llegar a él para desplazarla. Por debajo de 40rem cada fila se muestra como ficha
 * (cada <td> lleva su `data-etiqueta`).
 */
export function ContenedorTabla({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="tabla-contenedor" role="region" aria-label={etiqueta} tabIndex={0}>
      {children}
    </div>
  );
}

/** Campo de texto para buscar, con la lupa adentro. */
export function CampoBusqueda({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={`buscador ${className ?? ''}`}>
      <Icono nombre="buscar" />
      <input type="search" {...props} />
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
