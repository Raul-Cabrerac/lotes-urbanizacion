import request from 'supertest';
import { crearApp } from '../../src/app';
import { crearContenedor } from '../../src/contenedor';
import { cargarDatosDemo, USUARIOS_DEMO } from '../../src/datosDemo';
import type { Rol } from '../../src/dominio/tipos';
import {
  abrirBaseDeDatos,
  type BaseDeDatos,
  type Ejecutor,
  type EjecutorSql,
} from '../../src/infraestructura/bd/baseDeDatos';
import { RelojFijo } from '../../src/infraestructura/reloj';
import { HOY } from './dobles';

export { HOY } from './dobles';

/** Costo mínimo de bcrypt: las contraseñas demo se hashean en cada prueba. */
const BCRYPT_RONDAS_PRUEBAS = 4;

export interface OpcionesAppPrueba {
  hoy?: Date;
  conDatosDemo?: boolean;
  envolverBd?: (bd: BaseDeDatos) => BaseDeDatos;
}

/** Base en memoria + datos demo + app Express lista para Supertest. */
export async function crearAppDePrueba(opciones: OpcionesAppPrueba = {}) {
  const hoy = opciones.hoy ?? HOY;
  const bdReal = await abrirBaseDeDatos();
  if (opciones.conDatosDemo !== false) await cargarDatosDemo(bdReal, hoy, { bcryptRondas: BCRYPT_RONDAS_PRUEBAS });
  const bd = opciones.envolverBd ? opciones.envolverBd(bdReal) : bdReal;
  const reloj = new RelojFijo(hoy);
  const servicios = crearContenedor({
    bd,
    jwtSecreto: 'pruebas',
    jwtExpiraEn: '1h',
    reloj,
    bcryptRondas: BCRYPT_RONDAS_PRUEBAS,
  });
  return { express: crearApp(servicios), servicios, bd: bdReal, reloj, cerrar: () => bdReal.cerrar() };
}

/**
 * Gancho sobre las consultas SQL de la app: se dispara UNA vez, antes o después de la primera
 * consulta para la que `coincide` devuelve true, y ejecuta `accion` con el mismo ejecutor de esa
 * consulta. Se registran con `intercalarUnaVez` (carreras.ts), que dice qué consulta interceptar.
 */
export interface GanchoSql {
  momento: 'antes' | 'despues';
  coincide(texto: string, parametros: unknown[] | undefined): boolean;
  accion(sql: EjecutorSql): Promise<unknown>;
  disparado: boolean;
}

function envolverEjecutor(ejecutor: Ejecutor, ganchos: GanchoSql[]): Ejecutor {
  const disparar = async (momento: GanchoSql['momento'], texto: string, parametros: unknown[] | undefined) => {
    const gancho = ganchos.find((g) => !g.disparado && g.momento === momento && g.coincide(texto, parametros));
    if (!gancho) return;
    gancho.disparado = true;
    await gancho.accion(ejecutor);
  };
  return {
    ...ejecutor,
    async query<T>(texto: string, parametros?: unknown[]) {
      await disparar('antes', texto, parametros);
      const resultado = await ejecutor.query<T>(texto, parametros);
      await disparar('despues', texto, parametros);
      return resultado;
    },
  };
}

/** App de prueba con ganchos SQL por prueba, para simular carreras sin recrear la base. */
export async function crearAppInterceptable(opciones: Omit<OpcionesAppPrueba, 'envolverBd'> = {}) {
  const ganchos: GanchoSql[] = [];
  const app = await crearAppDePrueba({
    ...opciones,
    envolverBd: (bd) => ({
      ...bd,
      sql: envolverEjecutor(bd.sql, ganchos),
      transaccion: (trabajo) => bd.transaccion((sql) => trabajo(envolverEjecutor(sql, ganchos))),
    }),
  });
  return { ...app, ganchos };
}

export type AppDePrueba = Awaited<ReturnType<typeof crearAppDePrueba>>;
export type AppInterceptable = Awaited<ReturnType<typeof crearAppInterceptable>>;

/** Inicia sesión por la API y devuelve el token JWT. */
export async function iniciarSesion(app: AppDePrueba, email: string, password: string): Promise<string> {
  const respuesta = await request(app.express).post('/api/auth/login').send({ email, password }).expect(200);
  return respuesta.body.token as string;
}

/**
 * Inicia sesión con el primer usuario demo del rol (USUARIOS_DEMO) y devuelve el token:
 * ADMIN → admin@lotes.bo, ASESOR → asesor@lotes.bo (Laura Vargas),
 * CLIENTE → cliente@lotes.bo (María René Banzer).
 */
export async function iniciarSesionComo(app: AppDePrueba, rol: Rol): Promise<string> {
  const usuario = USUARIOS_DEMO.find((u) => u.rol === rol);
  if (!usuario) throw new Error(`No hay un usuario demo con el rol ${rol}.`);
  return iniciarSesion(app, usuario.email, usuario.password);
}
