/**
 * Fechas de calendario en formato 'AAAA-MM-DD' (sin hora ni zona horaria).
 *
 * Los vencimientos (de reservas y cuotas) son fechas de calendario. Guardarlas
 * como texto ISO evita errores de zona horaria y permite compararlas como
 * strings: '2026-01-31' < '2026-02-01'.
 */
export type FechaISO = string;

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

const dosDigitos = (n: number): string => String(n).padStart(2, '0');

/** true si el valor es una fecha real con formato AAAA-MM-DD (rechaza p. ej. 2026-02-30). */
export function esFechaISO(valor: unknown): valor is FechaISO {
  if (typeof valor !== 'string' || !FORMATO_FECHA.test(valor)) return false;
  const [anio, mes, dia] = valor.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia
  );
}

/** Convierte un Date a 'AAAA-MM-DD' usando la zona horaria local del servidor. */
export function aFechaISO(fecha: Date): FechaISO {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

/**
 * Suma meses a una fecha. Si el día no existe en el mes destino se usa el
 * último día de ese mes: 2026-01-31 + 1 mes = 2026-02-28.
 */
export function sumarMeses(fecha: FechaISO, meses: number): FechaISO {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const indiceMes = mes - 1 + meses;
  const anioDestino = anio + Math.floor(indiceMes / 12);
  const mesDestino = ((indiceMes % 12) + 12) % 12; // 0..11
  const ultimoDiaDelMes = new Date(Date.UTC(anioDestino, mesDestino + 1, 0)).getUTCDate();
  return `${anioDestino}-${dosDigitos(mesDestino + 1)}-${dosDigitos(Math.min(dia, ultimoDiaDelMes))}`;
}

/** Suma (o resta, con números negativos) días a una fecha. */
export function sumarDias(fecha: FechaISO, dias: number): FechaISO {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const resultado = new Date(Date.UTC(anio, mes - 1, dia + dias));
  return `${resultado.getUTCFullYear()}-${dosDigitos(resultado.getUTCMonth() + 1)}-${dosDigitos(resultado.getUTCDate())}`;
}
