// Consigna §13: Actualización, eliminación y consistencia concurrente de lotes (Incidencia #4).
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { iniciarSesionComo } from '../apoyo/app';
import { buscarCliente, buscarLote, buscarProyecto } from '../apoyo/buscadores';
import { CONSULTAS, crearAppInterceptable, intercalarUnaVez, otroUsuario, type AppInterceptable } from '../apoyo/carreras';
import { DOCUMENTOS, LOTE_DISPONIBLE, LOTE_RESERVADO, PROYECTO_PUBLICADO } from '../apoyo/datosDemo';
import { GEOMETRIA_LOTE } from '../apoyo/dobles';

describe('PUT y DELETE /api/lotes/:id', () => {
  let app: AppInterceptable;
  let adminToken: string;
  let asesorToken: string;

  beforeEach(async () => {
    app = await crearAppInterceptable();
    adminToken = await iniciarSesionComo(app, 'ADMIN');
    asesorToken = await iniciarSesionComo(app, 'ASESOR');
  });

  afterEach(async () => {
    await app.cerrar();
  });

  it('responde 422 LOTE_SIN_PRECIO y conserva el precio al intentar asignar precio 0 a un lote RESERVADO', async () => {
    // Arrange
    const lote = await buscarLote(app, adminToken, LOTE_RESERVADO);
    // Act
    const respuesta = await request(app.express)
      .put(`/api/lotes/${lote.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ precio: 0 });
    // Assert
    expect(respuesta.status).toBe(422);
    expect(respuesta.body.error.codigo).toBe('LOTE_SIN_PRECIO');
    const detalle = await request(app.express)
      .get(`/api/lotes/${lote.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(detalle.body.precio).toBe(lote.precio);
  });

  it('responde 409 PROYECTO_PUBLICADO_SIN_LOTES al intentar eliminar el último lote de un proyecto PUBLICADO', async () => {
    // Arrange
    const proyecto = await request(app.express)
      .post('/api/proyectos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Proyecto Único Lote', ubicacion: 'SCZ', descripcion: '' })
      .expect(201);
    const lote = await request(app.express)
      .post(`/api/proyectos/${proyecto.body.id}/lotes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ codigo: 'Z-01', precio: 40000, geometria: GEOMETRIA_LOTE })
      .expect(201);
    await request(app.express)
      .post(`/api/proyectos/${proyecto.body.id}/publicar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    // Act
    const respuesta = await request(app.express)
      .delete(`/api/lotes/${lote.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    // Assert
    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error.codigo).toBe('PROYECTO_PUBLICADO_SIN_LOTES');
    const listado = await request(app.express)
      .get(`/api/proyectos/${proyecto.body.id}/lotes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(listado.body).toHaveLength(1);
  });

  it('responde 404 NO_ENCONTRADO (y no 500) si otro usuario elimina el lote antes de actualizarlo', async () => {
    // Arrange
    const lote = await buscarLote(app, adminToken, LOTE_DISPONIBLE);
    intercalarUnaVez(app, {
      antesDe: CONSULTAS.bloquearLote,
      parametros: [lote.id],
      accion: (sql) => otroUsuario.eliminaLote(sql, lote.id),
    });
    // Act
    const respuesta = await request(app.express)
      .put(`/api/lotes/${lote.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ precio: 65000 });
    // Assert
    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error.codigo).toBe('NO_ENCONTRADO');
  });

  it('responde 409 LOTE_CON_OPERACIONES (y no REGISTRO_RELACIONADO) si el lote se reserva mientras se intenta eliminar', async () => {
    // Arrange
    const lote = await buscarLote(app, adminToken, LOTE_DISPONIBLE);
    const cliente = await buscarCliente(app, asesorToken, DOCUMENTOS.maria);
    const asesor = await app.servicios.auth.usuarioDesdeToken(asesorToken);
    intercalarUnaVez(app, {
      despuesDe: CONSULTAS.buscarLote,
      parametros: [lote.id],
      accion: (sql) => otroUsuario.reservaLote(sql, { loteId: lote.id, clienteId: cliente.id, asesorId: asesor.id }),
    });
    // Act
    const respuesta = await request(app.express)
      .delete(`/api/lotes/${lote.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    // Assert
    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error.codigo).toBe('LOTE_CON_OPERACIONES');
  });

  it('responde 422 LOTE_SIN_PRECIO si otro usuario cambia el precio a 0 antes de que reservar bloquee el lote', async () => {
    // Arrange
    const lote = await buscarLote(app, adminToken, LOTE_DISPONIBLE);
    const cliente = await buscarCliente(app, asesorToken, DOCUMENTOS.maria);
    intercalarUnaVez(app, {
      antesDe: CONSULTAS.bloquearLote,
      parametros: [lote.id],
      accion: (sql) => otroUsuario.quitaPrecioDelLote(sql, lote.id),
    });
    // Act
    const respuesta = await request(app.express)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${asesorToken}`)
      .send({ loteId: lote.id, clienteId: cliente.id });
    // Assert
    expect(respuesta.status).toBe(422);
    expect(respuesta.body.error.codigo).toBe('LOTE_SIN_PRECIO');
  });
});

describe('POST /api/proyectos/:id/lotes · unicidad concurrente', () => {
  let app: AppInterceptable;
  let adminToken: string;

  beforeEach(async () => {
    app = await crearAppInterceptable();
    adminToken = await iniciarSesionComo(app, 'ADMIN');
  });

  afterEach(async () => {
    await app.cerrar();
  });

  it('responde 409 CODIGO_LOTE_DUPLICADO cuando otro proceso crea el mismo código de lote antes del INSERT', async () => {
    // Arrange
    const proyecto = await buscarProyecto(app, adminToken, PROYECTO_PUBLICADO);
    const codigo = 'D-99';
    intercalarUnaVez(app, {
      despuesDe: CONSULTAS.buscarLotePorCodigo,
      parametros: [proyecto.id, codigo],
      accion: (sql) => otroUsuario.creaLote(sql, proyecto.id, codigo),
    });
    // Act
    const respuesta = await request(app.express)
      .post(`/api/proyectos/${proyecto.id}/lotes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ codigo, precio: 50000, geometria: GEOMETRIA_LOTE });
    // Assert
    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error.codigo).toBe('CODIGO_LOTE_DUPLICADO');
  });
});
