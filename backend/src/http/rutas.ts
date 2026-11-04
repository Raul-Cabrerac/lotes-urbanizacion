/**
 * Rutas de la API REST. Cada ruta: autoriza por permiso, valida la forma de
 * los datos (zod) y delega en un servicio. No hay lógica de negocio aquí.
 */
import { Router } from 'express';
import type { Servicios } from '../contenedor';
import { autorizar, usuarioDe } from './middlewares/seguridad';
import { esquemas, leerId, parsear } from './validacion';

export function rutasAuth(s: Servicios): Router {
  const r = Router();
  r.post('/login', async (req, res) => {
    const { email, password } = parsear(esquemas.login, req.body);
    res.json(await s.auth.iniciarSesion(email, password));
  });
  return r;
}

export function rutasProyectos(s: Servicios): Router {
  const r = Router();
  r.get('/', autorizar('proyectos:ver'), async (req, res) => {
    res.json(await s.proyectos.listar(usuarioDe(req)));
  });
  r.post('/', autorizar('proyectos:gestionar'), async (req, res) => {
    res.status(201).json(await s.proyectos.crear(parsear(esquemas.proyecto, req.body)));
  });
  r.get('/:id', autorizar('proyectos:ver'), async (req, res) => {
    res.json(await s.proyectos.obtener(leerId(req.params.id), usuarioDe(req)));
  });
  r.put('/:id', autorizar('proyectos:gestionar'), async (req, res) => {
    res.json(await s.proyectos.actualizar(leerId(req.params.id), parsear(esquemas.proyectoEdicion, req.body)));
  });
  r.put('/:id/limite', autorizar('proyectos:gestionar'), async (req, res) => {
    res.json(await s.proyectos.definirLimite(leerId(req.params.id), parsear(esquemas.geometria, req.body).geometria ?? null));
  });
  r.post('/:id/publicar', autorizar('proyectos:gestionar'), async (req, res) => {
    res.json(await s.proyectos.publicar(leerId(req.params.id)));
  });

  // Lotes de un proyecto
  r.get('/:id/lotes', autorizar('lotes:ver'), async (req, res) => {
    const { q, ...filtros } = parsear(esquemas.filtrosLotes, req.query);
    res.json(await s.lotes.listar(leerId(req.params.id), { ...filtros, busqueda: q }, usuarioDe(req)));
  });
  r.post('/:id/lotes', autorizar('lotes:gestionar'), async (req, res) => {
    res.status(201).json(await s.lotes.crear(leerId(req.params.id), parsear(esquemas.lote, req.body)));
  });
  r.post('/:id/lotes/importar-kml', autorizar('lotes:gestionar'), async (req, res) => {
    res.status(201).json(await s.importacionKml.importar(leerId(req.params.id), parsear(esquemas.importarKml, req.body)));
  });
  return r;
}

export function rutasLotes(s: Servicios): Router {
  const r = Router();
  r.post('/analizar-geometria', autorizar('lotes:gestionar'), async (req, res) => {
    res.json(s.lotes.analizarGeometria(parsear(esquemas.geometria, req.body).geometria));
  });
  r.get('/:id', autorizar('lotes:ver'), async (req, res) => {
    res.json(await s.lotes.obtenerDetalle(leerId(req.params.id), usuarioDe(req)));
  });
  r.put('/:id', autorizar('lotes:gestionar'), async (req, res) => {
    res.json(await s.lotes.actualizar(leerId(req.params.id), parsear(esquemas.lote.partial(), req.body)));
  });
  r.patch('/:id/estado', autorizar('lotes:gestionar'), async (req, res) => {
    res.json(await s.lotes.cambiarEstado(leerId(req.params.id), parsear(esquemas.estadoLote, req.body).estado));
  });
  r.delete('/:id', autorizar('lotes:gestionar'), async (req, res) => {
    await s.lotes.eliminar(leerId(req.params.id));
    res.status(204).end();
  });
  return r;
}

export function rutasClientes(s: Servicios): Router {
  const r = Router();
  r.get('/', autorizar('clientes:ver'), async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    res.json(await s.clientes.listar(q));
  });
  r.post('/', autorizar('clientes:gestionar'), async (req, res) => {
    res.status(201).json(await s.clientes.crear(parsear(esquemas.cliente, req.body)));
  });
  r.get('/:id', autorizar('clientes:ver'), async (req, res) => {
    res.json(await s.clientes.obtener(leerId(req.params.id), usuarioDe(req)));
  });
  r.put('/:id', autorizar('clientes:gestionar'), async (req, res) => {
    res.json(await s.clientes.actualizar(leerId(req.params.id), parsear(esquemas.clienteEdicion, req.body)));
  });
  return r;
}

export function rutasReservas(s: Servicios): Router {
  const r = Router();
  r.get('/', autorizar('reservas:ver'), async (req, res) => {
    res.json(await s.reservas.listar(parsear(esquemas.filtrosReservas, req.query)));
  });
  r.post('/', autorizar('reservas:gestionar'), async (req, res) => {
    res.status(201).json(await s.reservas.crear(parsear(esquemas.reserva, req.body), usuarioDe(req)));
  });
  r.get('/:id', autorizar('reservas:ver'), async (req, res) => {
    res.json(await s.reservas.obtener(leerId(req.params.id)));
  });
  r.post('/:id/cancelar', autorizar('reservas:gestionar'), async (req, res) => {
    const { motivo } = parsear(esquemas.motivoOpcional, req.body);
    res.json(await s.reservas.cancelar(leerId(req.params.id), motivo, usuarioDe(req)));
  });
  return r;
}

export function rutasVentas(s: Servicios): Router {
  const r = Router();
  r.get('/', autorizar('ventas:ver'), async (req, res) => {
    res.json(await s.ventas.listar(parsear(esquemas.filtrosVentas, req.query), usuarioDe(req)));
  });
  r.post('/simular-plan', autorizar('ventas:registrar'), async (req, res) => {
    res.json(s.ventas.simularPlan(parsear(esquemas.simulacionPlan, req.body)));
  });
  r.post('/', autorizar('ventas:registrar'), async (req, res) => {
    res.status(201).json(await s.ventas.registrar(parsear(esquemas.venta, req.body), usuarioDe(req)));
  });
  r.get('/:id', autorizar('ventas:ver'), async (req, res) => {
    res.json(await s.ventas.obtener(leerId(req.params.id), usuarioDe(req)));
  });
  r.post('/:id/anular', autorizar('ventas:anular'), async (req, res) => {
    const { motivo } = parsear(esquemas.motivo, req.body);
    res.json(await s.ventas.anular(leerId(req.params.id), motivo, usuarioDe(req)));
  });
  r.post('/:id/pagos', autorizar('pagos:registrar'), async (req, res) => {
    res.status(201).json(await s.pagos.registrar(leerId(req.params.id), parsear(esquemas.pago, req.body), usuarioDe(req)));
  });
  return r;
}

export function rutasPagos(s: Servicios): Router {
  const r = Router();
  r.post('/:id/anular', autorizar('pagos:anular'), async (req, res) => {
    const { motivo } = parsear(esquemas.motivo, req.body);
    res.json(await s.pagos.anular(leerId(req.params.id), motivo, usuarioDe(req)));
  });
  return r;
}

export function rutasUsuarios(s: Servicios): Router {
  const r = Router();
  r.use(autorizar('usuarios:gestionar'));
  r.get('/', async (_req, res) => {
    res.json(await s.usuarios.listar());
  });
  r.post('/', async (req, res) => {
    res.status(201).json(await s.usuarios.crear(parsear(esquemas.usuario, req.body)));
  });
  r.patch('/:id', async (req, res) => {
    const { activo } = parsear(esquemas.estadoUsuario, req.body);
    res.json(await s.usuarios.cambiarActivo(leerId(req.params.id), activo, usuarioDe(req)));
  });
  return r;
}

export function rutasPortal(s: Servicios): Router {
  const r = Router();
  r.get('/mis-operaciones', autorizar('portal:ver'), async (req, res) => {
    res.json(await s.portal.misOperaciones(usuarioDe(req)));
  });
  return r;
}

export function rutasReportes(s: Servicios): Router {
  const r = Router();
  r.get('/resumen', autorizar('reportes:ver'), async (_req, res) => {
    res.json(await s.reportes.resumenGeneral());
  });
  return r;
}
