import request from 'supertest';
import { crearApp } from '../../src/app';
import { crearContenedor } from '../../src/contenedor';
import { abrirBaseDeDatos, type BaseDeDatos, type Ejecutor } from '../../src/infraestructura/bd/baseDeDatos';
import { cargarDatosDemo } from '../../src/infraestructura/bd/datosDemo';
import { RelojFijo } from '../../src/infraestructura/reloj';

export const HOY = new Date('2026-03-15T12:00:00');

export interface OpcionesAppPrueba {
  hoy?: Date;
  conDatosDemo?: boolean;
  envolverBd?: (bd: BaseDeDatos) => BaseDeDatos;
}

export type InterceptorSql = (
  sql: string,
  parametros: unknown[] | undefined,
  ejecutar: <T>(texto: string, params?: unknown[]) => Promise<{ rows: T[] }>,
  filas?: unknown[],
) => Promise<void>;

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

function envolverEjecutor(
  ejecutor: Ejecutor,
  obtenerAntes: () => InterceptorSql | null,
  obtenerDespues: () => InterceptorSql | null,
): Ejecutor {
  return {
    ...ejecutor,
    async query<T>(texto: string, params?: unknown[]) {
      const antes = obtenerAntes();
      if (antes) await antes(texto, params, (t, p) => ejecutor.query(t, p));
      const res = await ejecutor.query<T>(texto, params);
      const despues = obtenerDespues();
      if (despues) await despues(texto, params, (t, p) => ejecutor.query(t, p), res.rows);
      return res;
    },
  };
}

/** App de prueba con ganchos por test para simular carreras concurrentes sin recrear la base. */
export async function crearAppInterceptable(opciones: Omit<OpcionesAppPrueba, 'envolverBd'> = {}) {
  let antes: InterceptorSql | null = null;
  let despues: InterceptorSql | null = null;
  const app = await crearAppDePrueba({
    ...opciones,
    envolverBd: (bd) => ({
      ...bd,
      sql: envolverEjecutor(bd.sql, () => antes, () => despues),
      transaccion: (trabajo) =>
        bd.transaccion((sql) => trabajo(envolverEjecutor(sql, () => antes, () => despues))),
    }),
  });
  return {
    ...app,
    alInterceptarAntes: (fn: InterceptorSql | null) => {
      antes = fn;
    },
    alInterceptarDespues: (fn: InterceptorSql | null) => {
      despues = fn;
    },
  };
}

export type AppDePrueba = Awaited<ReturnType<typeof crearAppDePrueba>>;
export type AppInterceptable = Awaited<ReturnType<typeof crearAppInterceptable>>;

/** Inicia sesión por la API y devuelve el token JWT. */
export async function iniciarSesion(app: AppDePrueba, email: string, password: string): Promise<string> {
  const respuesta = await request(app.express).post('/api/auth/login').send({ email, password }).expect(200);
  return respuesta.body.token as string;
}
