/**
 * npm run db:reset
 * Deja la base de DATABASE_URL (tu rama de Neon) como recién creada: borra todas las tablas,
 * vuelve a crear el esquema con las migraciones y carga los datos de demostración.
 */
import { config } from '../src/config';
import { esEnMemoria, recrearEsquema } from '../src/infraestructura/bd/baseDeDatos';
import { cargarDatosDemo, USUARIOS_DEMO } from '../src/infraestructura/bd/datosDemo';
import { abrirPostgresNeon } from '../src/infraestructura/bd/postgresNeon';
import { RelojSistema } from '../src/infraestructura/reloj';

async function reiniciar() {
  if (esEnMemoria(config.bdUrl)) {
    throw new Error('Falta DATABASE_URL en .env.local: no hay ninguna base de Neon que reiniciar.');
  }

  console.info('• Conectando con PostgreSQL (Neon)...');
  // Conexión directa (sin pooler), como recomienda Neon para cambios de esquema. Se abre sin
  // aplicar migraciones: si la base tiene tablas de otra versión, migrar fallaría.
  const bd = abrirPostgresNeon(config.bdUrlDirecta || config.bdUrl);
  try {
    console.info('• Borrando las tablas y creando el esquema desde las migraciones...');
    await recrearEsquema(bd);
    console.info('• Cargando los datos de demostración...');
    await cargarDatosDemo(bd, new RelojSistema().ahora());
  } finally {
    await bd.cerrar();
  }

  console.info('✔ Listo. Usuarios de demostración:');
  for (const { rol, email, password } of USUARIOS_DEMO) {
    console.info(`  ${rol.padEnd(8)} ${email.padEnd(20)} ${password}`);
  }
}

reiniciar().catch((error: unknown) => {
  console.error('✖', error instanceof Error ? error.message : error);
  process.exit(1);
});
