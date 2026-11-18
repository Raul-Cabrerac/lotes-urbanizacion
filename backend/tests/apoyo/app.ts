import request from 'supertest';
import { crearApp } from '../../src/app';
import { crearContenedor } from '../../src/contenedor';
import { abrirBaseDeDatos, type BaseDeDatos } from '../../src/infraestructura/bd/baseDeDatos';
import { cargarDatosDemo } from '../../src/infraestructura/bd/datosDemo';
import { RelojFijo } from '../../src/infraestructura/reloj';

export const HOY = new Date('2026-03-15T12:00:00');

export interface OpcionesAppPrueba {
  hoy?: Date;
  conDatosDemo?: boolean;
  envolverBd?: (bd: BaseDeDatos) => BaseDeDatos;
}

/** Base en memoria + datos demo + app Express lista para Supertest. */
export async function crearAppDePrueba(opciones: OpcionesAppPrueba = {}) {
  const hoy = opciones.hoy ?? HOY;
  const bdReal = await abrirBaseDeDatos();
  if (opciones.conDatosDemo !== false) await cargarDatosDemo(bdReal, hoy);
  const bd = opciones.envolverBd ? opciones.envolverBd(bdReal) : bdReal;
  const reloj = new RelojFijo(hoy);
  const servicios = crearContenedor({
    bd,
    jwtSecreto: 'pruebas',
    jwtExpiraEn: '1h',
    reloj,
    bcryptRondas: 4,
  });
  return { express: crearApp(servicios), servicios, bd: bdReal, reloj, cerrar: () => bdReal.cerrar() };
}

export type AppDePrueba = Awaited<ReturnType<typeof crearAppDePrueba>>;

/** Inicia sesión por la API y devuelve el token JWT. */
export async function iniciarSesion(app: AppDePrueba, email: string, password: string): Promise<string> {
  const respuesta = await request(app.express).post('/api/auth/login').send({ email, password }).expect(200);
  return respuesta.body.token as string;
}
