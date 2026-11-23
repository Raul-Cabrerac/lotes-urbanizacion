/**
 * Conversiones de tipos de PostgreSQL que esperan el dominio y los repositorios: DATE como texto
 * 'AAAA-MM-DD' (sin zona horaria) y NUMERIC o BIGINT como number. Las aplican las dos bases, Neon
 * (postgresNeon.ts) y en memoria (postgresEnMemoria.ts), para que el mismo SQL devuelva lo mismo.
 */
const OID = { INT8: 20, DATE: 1082, NUMERIC: 1700 } as const;

export const CONVERSIONES_TIPOS: Record<number, (valor: string) => unknown> = {
  [OID.DATE]: (valor) => valor,
  [OID.NUMERIC]: (valor) => Number(valor),
  [OID.INT8]: (valor) => Number(valor),
};
