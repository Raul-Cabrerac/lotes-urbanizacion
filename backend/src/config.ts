/**
 * Configuración leída de variables de entorno.
 *
 * Se cargan, si existen, `.env.local` y `.env` de la raíz del repositorio: ahí escriben
 * `neon deploy` y `neon env pull` la conexión a Neon. Una variable que ya está definida en el
 * entorno gana sobre los archivos; así `npm run dev:pruebas` fuerza la base en memoria.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RAIZ_DEL_REPOSITORIO = fileURLToPath(new URL('../../', import.meta.url));

for (const archivo of ['.env.local', '.env']) {
  const ruta = RAIZ_DEL_REPOSITORIO + archivo;
  if (existsSync(ruta)) process.loadEnvFile(ruta); // lector de .env incorporado en Node
}

/** Valor de una variable de entorno; si no existe o está vacía, el valor por defecto. */
const variable = (nombre: string, porDefecto = ''): string =>
  process.env[nombre]?.trim() || porDefecto;

export type Entorno = 'desarrollo' | 'pruebas';

const entorno: Entorno = variable('ENTORNO') === 'pruebas' ? 'pruebas' : 'desarrollo';

export const config = {
  puerto: Number(variable('PUERTO', '3000')),
  jwtSecreto: variable('JWT_SECRETO', 'secreto-solo-para-desarrollo'),
  jwtExpiraEn: variable('JWT_EXPIRA_EN', '8h'),
  /** Conexión a PostgreSQL con pooler (Neon). Vacía o "memoria": PostgreSQL en memoria. */
  bdUrl: variable('DATABASE_URL'),
  /** Conexión directa, sin pooler, para aplicar las migraciones. */
  bdUrlDirecta: variable('DATABASE_URL_UNPOOLED'),
  /** En "pruebas" se habilita POST /api/pruebas/reiniciar para los E2E. */
  entorno,
};
