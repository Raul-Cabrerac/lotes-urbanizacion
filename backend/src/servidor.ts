/**
 * Punto de entrada: abre la base de datos, crea los servicios y levanta la API.
 * Si la base está vacía (recién creada) carga los datos de demostración.
 */
import { crearApp } from './app';
import { config } from './config';
import { crearContenedor } from './contenedor';
import { abrirBaseDeDatos, esEnMemoria } from './infraestructura/bd/baseDeDatos';
import { baseSinDatos, cargarDatosDemo, reiniciarDatosDemo } from './infraestructura/bd/datosDemo';
import { RelojSistema } from './infraestructura/reloj';

async function iniciar() {
  const enMemoria = esEnMemoria(config.bdUrl);
  if (enMemoria && config.entorno !== 'pruebas') {
    console.warn('⚠ Falta DATABASE_URL en .env.local: se usa una base EN MEMORIA y los datos se pierden al cerrar.');
  }

  const bd = await abrirBaseDeDatos({ url: config.bdUrl, urlDirecta: config.bdUrlDirecta });
  const reloj = new RelojSistema();
  if (await baseSinDatos(bd)) {
    console.info('• Base vacía: cargando datos de demostración...');
    await cargarDatosDemo(bd, reloj.ahora());
  }

  const servicios = crearContenedor({ bd, jwtSecreto: config.jwtSecreto, jwtExpiraEn: config.jwtExpiraEn, reloj });
  // Solo en modo pruebas (E2E): una ruta para volver a los datos demo antes de cada prueba.
  const reiniciarDatos = config.entorno === 'pruebas' ? () => reiniciarDatosDemo(bd, reloj.ahora()) : undefined;

  const servidor = crearApp(servicios, { reiniciarDatos }).listen(config.puerto, () => {
    const base = enMemoria ? 'PostgreSQL en memoria' : 'PostgreSQL (Neon)';
    console.info(`✔ API lista en http://localhost:${config.puerto}/api  ·  base: ${base}  ·  modo: ${config.entorno}`);
  });

  let cerrando = false;
  const cerrar = async () => {
    if (cerrando) return;
    cerrando = true;
    servidor.close();
    await bd.cerrar();
    process.exit(0);
  };
  process.on('SIGINT', cerrar);
  process.on('SIGTERM', cerrar);
}

/** PostgreSQL responde 42P07 cuando una tabla ya existe: la base tiene el esquema de otra versión. */
const TABLA_YA_EXISTE = '42P07';

iniciar().catch((error: unknown) => {
  console.error('✖ No se pudo iniciar la API:', error instanceof Error ? error.message : error);
  if (error instanceof Error && 'code' in error && error.code === TABLA_YA_EXISTE) {
    console.error('  Tu base tiene tablas de una versión anterior del proyecto. Para recrearla');
    console.error('  (borra sus datos y carga los datos demo) ejecuta: npm run db:reset');
  }
  process.exit(1);
});
