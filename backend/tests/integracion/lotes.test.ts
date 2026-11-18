// Consigna §13: Actualización, eliminación y consistencia concurrente de lotes (Incidencia #4).
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { rectanguloEnMetros } from '../../src/dominio/geometria';
import { crearAppInterceptable, iniciarSesion, type AppInterceptable } from '../apoyo/app';
import { buscarCliente, buscarLote } from '../apoyo/buscadores';

const geo = rectanguloEnMetros([-63.18, -17.78], 0, 0, 12, 30);

describe('PUT y DELETE /api/lotes/:id', () => {
  let app: AppInterceptable;
  let adminToken: string;
  let asesorToken: string;

  beforeEach(async () => {
    app = await crearAppInterceptable();
    adminToken = await iniciarSesion(app, 'admin@lotes.bo', 'admin123');
    asesorToken = await iniciarSesion(app, 'asesor@lotes.bo', 'asesor123');
  });

  afterEach(async () => {
    await app.cerrar();
  });

  it('responde 422 LOTE_SIN_PRECIO y conserva el precio al intentar asignar precio 0 a un lote RESERVADO', async () => {
    // Arrange
    const lote = await buscarLote(app, adminToken, 'A-03');
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
      .send({ codigo: 'Z-01', precio: 40000, geometria: geo })
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
    const lote = await buscarLote(app, adminToken, 'C-01');
    let intercalado = false;
    app.alInterceptarAntes(async (texto, params, ejecutar) => {
      if (!intercalado && texto.includes('FROM lotes WHERE id = $1 FOR UPDATE') && params?.[0] === lote.id) {
        intercalado = true;
        await ejecutar('DELETE FROM lotes WHERE id = $1', [lote.id]);
      }
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
    const lote = await buscarLote(app, adminToken, 'A-01');
    const cliente = await buscarCliente(app, asesorToken, '4839201');
    let intercalado = false;
    app.alInterceptarDespues(async (texto, params, ejecutar) => {
      if (!intercalado && texto.includes('SELECT * FROM lotes WHERE id = $1') && params?.[0] === lote.id) {
        intercalado = true;
        await ejecutar("UPDATE lotes SET estado = 'RESERVADO' WHERE id = $1", [lote.id]);
        await ejecutar('INSERT INTO reservas (lote_id, cliente_id, asesor_id) VALUES ($1, $2, 2)', [lote.id, cliente.id]);
      }
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
    const lote = await buscarLote(app, adminToken, 'A-01');
    const cliente = await buscarCliente(app, asesorToken, '4839201');
    let intercalado = false;
    app.alInterceptarAntes(async (texto, params, ejecutar) => {
      if (!intercalado && texto.includes('FROM lotes WHERE id = $1 FOR UPDATE') && params?.[0] === lote.id) {
        intercalado = true;
        await ejecutar('UPDATE lotes SET precio = 0 WHERE id = $1', [lote.id]);
      }
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
