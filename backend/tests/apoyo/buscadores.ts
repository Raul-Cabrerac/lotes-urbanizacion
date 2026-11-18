import request from 'supertest';
import type { AppDePrueba } from './app';

export interface ProyectoPrueba {
  id: number;
  nombre: string;
  estado: string;
}

export interface LotePrueba {
  id: number;
  proyectoId: number;
  codigo: string;
  estado: string;
  precio: number;
}

export interface ClientePrueba {
  id: number;
  documento: string;
  nombreCompleto: string;
}

export interface ReservaPrueba {
  id: number;
  loteId: number;
  clienteId: number;
  estado: string;
  lote: { codigo: string };
}

export interface VentaPrueba {
  id: number;
  loteId: number;
  clienteId: number;
  estado: string;
  lote: { codigo: string };
  pagos: { id: number; estado: string; monto: number }[];
  cuotas: { id: number; numero: number; monto: number; estado: string }[];
  resumen: { totalPagado: number; saldoPendiente: number };
}

export async function buscarProyecto(app: AppDePrueba, token: string, nombre: string): Promise<ProyectoPrueba> {
  const res = await request(app.express).get('/api/proyectos').set('Authorization', `Bearer ${token}`).expect(200);
  const proyecto = (res.body as ProyectoPrueba[]).find((p) => p.nombre === nombre);
  if (!proyecto) throw new Error(`Proyecto no encontrado en pruebas: ${nombre}`);
  return proyecto;
}

export async function buscarLote(
  app: AppDePrueba,
  token: string,
  codigo: string,
  proyectoId = 1,
): Promise<LotePrueba> {
  const res = await request(app.express)
    .get(`/api/proyectos/${proyectoId}/lotes`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  const lote = (res.body as LotePrueba[]).find((l) => l.codigo === codigo);
  if (!lote) throw new Error(`Lote no encontrado en pruebas: ${codigo}`);
  return lote;
}

export async function buscarCliente(app: AppDePrueba, token: string, documento: string): Promise<ClientePrueba> {
  const res = await request(app.express)
    .get(`/api/clientes?q=${encodeURIComponent(documento)}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  const cliente = (res.body as ClientePrueba[]).find((c) => c.documento === documento);
  if (!cliente) throw new Error(`Cliente no encontrado en pruebas: ${documento}`);
  return cliente;
}

export async function buscarVentaDeLote(app: AppDePrueba, token: string, codigo: string): Promise<VentaPrueba> {
  const res = await request(app.express).get('/api/ventas').set('Authorization', `Bearer ${token}`).expect(200);
  const venta = (res.body as VentaPrueba[]).find((v) => v.lote.codigo === codigo);
  if (!venta) throw new Error(`Venta no encontrada en pruebas para lote: ${codigo}`);
  return venta;
}

export async function buscarReservaDeLote(app: AppDePrueba, token: string, codigo: string): Promise<ReservaPrueba> {
  const res = await request(app.express).get('/api/reservas').set('Authorization', `Bearer ${token}`).expect(200);
  const reserva = (res.body as ReservaPrueba[]).find((r) => r.lote.codigo === codigo);
  if (!reserva) throw new Error(`Reserva no encontrada en pruebas para lote: ${codigo}`);
  return reserva;
}
