// Consigna §13: Mapeo de códigos 409 en usuarios y lotes bajo concurrencia (Incidencia #7).
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { iniciarSesionComo } from '../apoyo/app';
import { buscarCliente } from '../apoyo/buscadores';
import { CONSULTAS, crearAppInterceptable, intercalarUnaVez, otroUsuario, type AppInterceptable } from '../apoyo/carreras';
import { DOCUMENTOS } from '../apoyo/datosDemo';

describe('Unicidad concurrente en usuarios', () => {
  let app: AppInterceptable;
  let adminToken: string;

  beforeEach(async () => {
    app = await crearAppInterceptable();
    adminToken = await iniciarSesionComo(app, 'ADMIN');
  });

  afterEach(async () => {
    await app.cerrar();
  });

  it('responde 409 EMAIL_DUPLICADO cuando otro usuario registra el mismo correo antes del INSERT', async () => {
    // Arrange
    const email = 'nuevo@lotes.bo';
    intercalarUnaVez(app, {
      despuesDe: CONSULTAS.buscarUsuarioPorEmail,
      parametros: [email],
      accion: (sql) => otroUsuario.registraAsesor(sql, email),
    });
    // Act
    const respuesta = await request(app.express)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Nuevo Asesor', email, password: 'Password1', rol: 'ASESOR' });
    // Assert
    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error.codigo).toBe('EMAIL_DUPLICADO');
  });

  it('responde 409 CLIENTE_YA_TIENE_USUARIO cuando otro proceso vincula al mismo cliente antes del INSERT', async () => {
    // Arrange
    const ana = await buscarCliente(app, adminToken, DOCUMENTOS.ana); // no tiene usuario del portal
    intercalarUnaVez(app, {
      despuesDe: CONSULTAS.buscarUsuarioPorCliente,
      parametros: [ana.id],
      accion: (sql) => otroUsuario.vinculaUsuarioAlCliente(sql, ana.id),
    });
    // Act
    const respuesta = await request(app.express)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Ana Portal', email: 'ana.portal@lotes.bo', password: 'Password1', rol: 'CLIENTE', clienteId: ana.id });
    // Assert
    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error.codigo).toBe('CLIENTE_YA_TIENE_USUARIO');
  });
});
