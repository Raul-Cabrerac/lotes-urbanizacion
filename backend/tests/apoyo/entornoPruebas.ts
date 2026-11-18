import request from 'supertest';
import type { Express } from 'express';
import { crearApp } from '../../src/app';
import { crearContenedor, type Servicios } from '../../src/contenedor';
import { abrirBaseDeDatos, type BaseDeDatos } from '../../src/infraestructura/bd/baseDeDatos';
import { cargarDatosDemo } from '../../src/infraestructura/bd/datosDemo';
import { RelojFijo } from '../../src/infraestructura/reloj';

export interface EntornoPruebas {
  bd: BaseDeDatos;
  app: Express;
  servicios: Servicios;
  reloj: RelojFijo;
  tokenAdmin: string;
  tokenAsesor: string;
  tokenAsesor2: string;
  tokenCliente: string;
  tokenCliente2: string;
  cerrar: () => Promise<void>;
}

export async function iniciarEntornoPruebas(): Promise<EntornoPruebas> {
  const bd = await abrirBaseDeDatos();
  const fechaFija = new Date('2026-03-15T12:00:00Z');
  await cargarDatosDemo(bd, fechaFija);

  const reloj = new RelojFijo(fechaFija);
  const servicios = crearContenedor({
    bd,
    jwtSecreto: 'secreto-pruebas-integracion',
    jwtExpiraEn: '2h',
    reloj,
    bcryptRondas: 4,
  });

  const app = crearApp(servicios);

  const obtenerToken = async (email: string, password = 'admin123'): Promise<string> => {
    const respuesta = await request(app).post('/api/auth/login').send({ email, password });
    return respuesta.body.token;
  };

  const tokenAdmin = await obtenerToken('admin@lotes.bo', 'admin123');
  const tokenAsesor = await obtenerToken('asesor@lotes.bo', 'asesor123');
  const tokenAsesor2 = await obtenerToken('asesor2@lotes.bo', 'asesor123');
  const tokenCliente = await obtenerToken('cliente@lotes.bo', 'cliente123');
  const tokenCliente2 = await obtenerToken('cliente2@lotes.bo', 'cliente123');

  return {
    bd,
    app,
    servicios,
    reloj,
    tokenAdmin,
    tokenAsesor,
    tokenAsesor2,
    tokenCliente,
    tokenCliente2,
    cerrar: async () => {
      await bd.cerrar();
    },
  };
}
