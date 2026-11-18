/**
 * Plano de una urbanización (decorativo) para la pantalla de inicio de sesión: manzanos con sus
 * lotes, coloreados con los mismos tonos de estado que el mapa real. Es determinista: siempre
 * se dibuja igual, sin azar.
 */
import type { EstadoLote } from '../api/tipos';
import { COLOR_ESTADO } from './mapa/colores';

const COLUMNAS = 5;
const FILAS = 7;
const LOTES_POR_FILA = 5;
const ANCHO_MANZANO = 220;
const ALTO_MANZANO = 150;
const CALLE = 36;

/** Estado de cada lote según su posición; la mayoría queda sin pintar, como en un proyecto real. */
function estadoDe(indice: number): EstadoLote | null {
  const n = (indice * 37 + 11) % 23;
  if (n < 5) return 'DISPONIBLE';
  if (n < 7) return 'RESERVADO';
  if (n < 10) return 'VENDIDO';
  if (n === 10) return 'BLOQUEADO';
  return null;
}

export function PlanoLotes() {
  const anchoLote = ANCHO_MANZANO / LOTES_POR_FILA;
  const altoLote = ALTO_MANZANO / 2;
  const lotes: { x: number; y: number; estado: EstadoLote | null; orden: number }[] = [];
  let indice = 0;
  for (let fila = 0; fila < FILAS; fila++) {
    for (let columna = 0; columna < COLUMNAS; columna++) {
      const x0 = -240 + columna * (ANCHO_MANZANO + CALLE);
      const y0 = -200 + fila * (ALTO_MANZANO + CALLE);
      for (let k = 0; k < LOTES_POR_FILA * 2; k++) {
        const x = x0 + (k % LOTES_POR_FILA) * anchoLote;
        const y = y0 + Math.floor(k / LOTES_POR_FILA) * altoLote;
        lotes.push({ x, y, estado: estadoDe(indice), orden: fila * COLUMNAS + columna });
        indice++;
      }
    }
  }

  return (
    <svg viewBox="0 0 800 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <g transform="rotate(-14 400 500)">
        {lotes.map((lote, i) => (
          <rect
            key={i}
            className="plano-lote"
            style={{ ['--orden' as string]: lote.orden }}
            x={lote.x}
            y={lote.y}
            width={anchoLote}
            height={altoLote}
            fill={lote.estado ? COLOR_ESTADO[lote.estado] : 'rgb(255 255 255 / 0.04)'}
            fillOpacity={lote.estado ? 0.78 : 1}
            stroke="rgb(255 255 255 / 0.22)"
            strokeWidth="1"
          />
        ))}
        <rect
          x={16 - 14}
          y={172 - 14}
          width={2 * ANCHO_MANZANO + CALLE + 28 + 256}
          height={3 * ALTO_MANZANO + 2 * CALLE + 28}
          fill="none"
          stroke="rgb(255 255 255 / 0.45)"
          strokeWidth="1.5"
          strokeDasharray="6 7"
          rx="4"
        />
      </g>
    </svg>
  );
}
