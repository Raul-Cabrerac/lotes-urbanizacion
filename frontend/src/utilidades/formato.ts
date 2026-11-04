/** Formatos de presentación (moneda en bolivianos, fechas y superficies). */

const formatoNumero = (decimales: number) =>
  new Intl.NumberFormat('es-BO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

/** 75000 -> "Bs 75.000"; 33.5 -> "Bs 33,50" */
export function bs(monto: number): string {
  return `Bs ${formatoNumero(Number.isInteger(monto) ? 0 : 2).format(monto)}`;
}

/** 360 -> "360 m²"; 359.99 -> "359,99 m²" */
export function m2(superficie: number): string {
  return `${formatoNumero(Number.isInteger(superficie) ? 0 : 2).format(superficie)} m²`;
}

/** '2026-10-27' o fecha ISO completa -> '27/10/2026' */
export function fecha(valor: string | null | undefined): string {
  if (!valor) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [anio, mes, dia] = valor.split('-');
    return `${dia}/${mes}/${anio}`;
  }
  return new Date(valor).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Fecha y hora: '27/10/2026 14:05' */
export function fechaHora(valor: string | null | undefined): string {
  if (!valor) return '—';
  const d = new Date(valor);
  return `${fecha(valor)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Fecha de hoy + n días en formato 'AAAA-MM-DD' (para inputs de tipo date). */
export function fechaEnDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Convierte el texto de un input numérico: '' -> undefined. */
export function numeroOIndefinido(texto: string): number | undefined {
  if (texto.trim() === '') return undefined;
  const numero = Number(texto.replace(',', '.'));
  return Number.isFinite(numero) ? numero : NaN;
}

export const NOMBRE_ROL = { ADMIN: 'Administrador', ASESOR: 'Asesor comercial', CLIENTE: 'Cliente' } as const;

/** Suma montos en centavos para evitar errores de redondeo (0.1 + 0.2). */
export function sumarMontos(montos: number[]): number {
  return montos.reduce((total, monto) => total + Math.round(monto * 100), 0) / 100;
}
