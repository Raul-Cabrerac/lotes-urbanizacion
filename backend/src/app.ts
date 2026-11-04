/**
 * Crea la aplicación Express SIN ponerla a escuchar en un puerto.
 * Así los tests de integración pueden usarla directamente (por ejemplo con
 * Supertest: request(crearApp(servicios)).get('/api/proyectos')...).
 */
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import type { Servicios } from './contenedor';
import { manejadorErrores } from './http/middlewares/manejadorErrores';
import { autenticar, usuarioDe } from './http/middlewares/seguridad';
import {
  rutasAuth,
  rutasClientes,
  rutasLotes,
  rutasPagos,
  rutasPortal,
  rutasProyectos,
  rutasReportes,
  rutasReservas,
  rutasUsuarios,
  rutasVentas,
} from './http/rutas';

export interface OpcionesApp {
  /**
   * Solo en modo pruebas (ENTORNO=pruebas): si se pasa, se habilita POST /api/pruebas/reiniciar,
   * que vuelve a los datos de demostración. Lo usan los E2E antes de cada prueba.
   */
  reiniciarDatos?: () => Promise<void>;
}

export function crearApp(servicios: Servicios, opciones: OpcionesApp = {}): Express {
  const app = express();
  app.use(express.json({ limit: '5mb' })); // los KML pueden ser grandes

  app.get('/api/salud', (_req, res) => {
    res.json({ estado: 'ok' });
  });

  const { reiniciarDatos } = opciones;
  if (reiniciarDatos) {
    app.post('/api/pruebas/reiniciar', async (_req, res) => {
      await reiniciarDatos();
      res.json({ estado: 'datos de demostración restaurados' });
    });
  }

  // Rutas públicas
  app.use('/api/auth', rutasAuth(servicios));

  // A partir de aquí todo requiere sesión iniciada
  const api = express.Router();
  api.use(autenticar(servicios.auth));
  api.use(async (_req: Request, _res: Response, next: NextFunction) => {
    // Las reservas vencidas se procesan antes de cada consulta: así el mapa y
    // los listados siempre muestran el estado real de los lotes.
    await servicios.reservas.procesarVencidas();
    next();
  });
  api.get('/auth/yo', (req, res) => {
    res.json(usuarioDe(req));
  });
  api.use('/proyectos', rutasProyectos(servicios));
  api.use('/lotes', rutasLotes(servicios));
  api.use('/clientes', rutasClientes(servicios));
  api.use('/reservas', rutasReservas(servicios));
  api.use('/ventas', rutasVentas(servicios));
  api.use('/pagos', rutasPagos(servicios));
  api.use('/usuarios', rutasUsuarios(servicios));
  api.use('/portal', rutasPortal(servicios));
  api.use('/reportes', rutasReportes(servicios));
  app.use('/api', api);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { codigo: 'RUTA_NO_ENCONTRADA', mensaje: 'La ruta solicitada no existe.' } });
  });
  app.use(manejadorErrores);
  return app;
}
