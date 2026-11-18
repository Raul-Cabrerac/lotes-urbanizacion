/**
 * Íconos de línea (SVG en el propio código, sin dependencias). Todos usan `currentColor`, así
 * que toman el color del texto que los rodea. Son decorativos: el texto del botón o un
 * aria-label dice qué hace el control.
 */
import type { ReactNode } from 'react';

const TRAZOS = {
  mas: <path d="M12 5v14M5 12h14" />,
  cerrar: <path d="M18 6 6 18M6 6l12 12" />,
  volver: <path d="m15 18-6-6 6-6" />,
  flecha: <path d="M5 12h14m-6-6 6 6-6 6" />,
  abajo: <path d="m6 9 6 6 6-6" />,
  buscar: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  actualizar: (
    <>
      <path d="M20 12a8 8 0 1 1-2.34-5.66L20 8.5" />
      <path d="M20 3.5v5h-5" />
    </>
  ),
  poligono: (
    <>
      <path d="M6 7.5 13 4l6 5.5-2.5 9h-9L4.5 12Z" />
      <circle cx="13" cy="4" r="1.6" fill="currentColor" />
      <circle cx="19" cy="9.5" r="1.6" fill="currentColor" />
      <circle cx="16.5" cy="18.5" r="1.6" fill="currentColor" />
    </>
  ),
  perimetro: (
    <path d="M4 7V5a1 1 0 0 1 1-1h2M11 4h2M17 4h2a1 1 0 0 1 1 1v2M20 11v2M20 17v2a1 1 0 0 1-1 1h-2M13 20h-2M7 20H5a1 1 0 0 1-1-1v-2M4 13v-2" />
  ),
  importar: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5M12 17v-6m-3 3 3-3 3 3" />
    </>
  ),
  descargar: <path d="M12 4v11m-5-5 5 5 5-5M5 20h14" />,
  ubicacion: (
    <>
      <path d="M19 10c0 5-7 11-7 11s-7-6-7-11a7 7 0 0 1 14 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  salir: <path d="M9 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3M16 16l4-4-4-4M20 12H10" />,
  candado: (
    <>
      <rect x="4.5" y="11" width="15" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  brujula: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5Z" />
    </>
  ),
  deshacer: <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />,
  listo: <path d="M20 6 9 17l-5-5" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4.5M12 8h.01" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type NombreIcono = keyof typeof TRAZOS;

export function Icono({ nombre, tamano = 16 }: { nombre: NombreIcono; tamano?: number }) {
  return (
    <svg
      className="icono"
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {TRAZOS[nombre]}
    </svg>
  );
}

/** Marca de la aplicación: un terreno dividido en lotes, uno de ellos destacado. */
export function Marca({ tamano = 28 }: { tamano?: number }) {
  return (
    <svg className="marca-logo" width={tamano} height={tamano} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="var(--marca)" />
      <rect x="16" y="16" width="8" height="8" fill="var(--marca-detalle)" />
      <path d="M8 8h16v16H8zM16 8v16M8 16h16M12 16v8" fill="none" stroke="#fff" strokeOpacity=".9" strokeWidth="1.5" />
    </svg>
  );
}
