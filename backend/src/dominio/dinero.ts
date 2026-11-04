/**
 * Utilidades de dinero (bolivianos con 2 decimales).
 *
 * Los números decimales en JavaScript tienen errores de redondeo
 * (0.1 + 0.2 = 0.30000000000000004). Por eso todas las operaciones se hacen
 * en CENTAVOS (enteros) y el resultado se devuelve en bolivianos.
 */

const aCentavos = (monto: number): number => Math.round(monto * 100);
const aBolivianos = (centavos: number): number => centavos / 100;

/** Redondea un monto a 2 decimales. */
export function redondear(monto: number): number {
  return aBolivianos(aCentavos(monto));
}

/** Suma montos sin errores de redondeo. */
export function sumar(...montos: number[]): number {
  return aBolivianos(montos.reduce((total, monto) => total + aCentavos(monto), 0));
}

/** Resta b de a sin errores de redondeo. */
export function restar(a: number, b: number): number {
  return aBolivianos(aCentavos(a) - aCentavos(b));
}

/** Compara dos montos a nivel de centavos: negativo si a < b, 0 si son iguales, positivo si a > b. */
export function comparar(a: number, b: number): number {
  return aCentavos(a) - aCentavos(b);
}

/** Monto máximo aceptado (mil millones de bolivianos): evita valores absurdos. */
export const MONTO_MAXIMO = 999_999_999.99;

/** true si el número tiene como máximo 2 decimales (centavos). */
export function tieneHastaDosDecimales(monto: number): boolean {
  return Math.abs(monto * 100 - Math.round(monto * 100)) < 1e-6;
}

/** Un monto válido es un número finito de al menos 1 centavo, hasta MONTO_MAXIMO y con máximo 2 decimales. */
export function esMontoValido(monto: unknown): monto is number {
  return (
    typeof monto === 'number' &&
    Number.isFinite(monto) &&
    aCentavos(monto) >= 1 &&
    monto <= MONTO_MAXIMO &&
    tieneHastaDosDecimales(monto)
  );
}

/**
 * Divide un total en `partes` montos iguales. Los centavos que sobran de la
 * división se suman a la última parte, así la suma siempre es exactamente el total.
 * Ej.: dividirEnPartes(100, 3) => [33.33, 33.33, 33.34]
 */
export function dividirEnPartes(total: number, partes: number): number[] {
  if (!Number.isInteger(partes) || partes < 1) {
    throw new RangeError('La cantidad de partes debe ser un entero mayor o igual a 1.');
  }
  const totalCentavos = aCentavos(total);
  const base = Math.floor(totalCentavos / partes);
  const sobrante = totalCentavos - base * partes;
  return Array.from({ length: partes }, (_, i) =>
    aBolivianos(i === partes - 1 ? base + sobrante : base),
  );
}
