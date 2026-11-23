/** Formatos de presentación (moneda en bolivianos, fechas, superficies y cantidades). */

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

/** 1 -> "1 cuota vencida"; 3 -> "3 cuotas vencidas" */
export function plural(cantidad: number, singular: string, enPlural: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : enPlural}`;
}
