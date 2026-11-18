// Consigna §13: Publicación de proyectos y consistencia bajo concurrencia (Incidencia #4).
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { rectanguloEnMetros } from '../../src/dominio/geometria';
import { crearAppDePrueba, iniciarSesion, type AppDePrueba } from '../apoyo/app';
import { buscarProyecto } from '../apoyo/buscadores';

const geo = rectanguloEnMetros([-63.18, -17.78], 0, 0, 12, 30);

describe('POST /api/proyectos/:id/publicar', () => {
  let app: AppDePrueba;
  let adminToken: string;

  beforeEach(async () => {
    app = await crearAppDePrueba();
    adminToken = await iniciarSesion(app, 'admin@lotes.bo', 'admin123');
  });

  afterEach(async () => {
    await app.cerrar();
  });

  it('responde 409 PROYECTO_YA_PUBLICADO si otra operación publica el proyecto concurrentemente', async () => {
    // Arrange
    await app.cerrar();
    let intercalado = false;
    let borradorId = 0;
    app = await crearAppDePrueba({
      envolverBd: (bd) => ({
        ...bd,
        transaccion: (trabajo) =>
          bd.transaccion((sql) =>
            trabajo({
              ...sql,
              async query<T>(texto: string, params?: unknown[]) {
                if (
                  !intercalado &&
                  borradorId > 0 &&
                  texto.includes('FROM proyectos WHERE id = $1 FOR UPDATE') &&
                  params?.[0] === borradorId
                ) {
                  intercalado = true;
                  await sql.query("UPDATE proyectos SET estado = 'PUBLICADO' WHERE id = $1", [borradorId]);
                }
                return sql.query<T>(texto, params);
              },
            }),
          ),
      }),
    });
    adminToken = await iniciarSesion(app, 'admin@lotes.bo', 'admin123');
    const proyecto = await buscarProyecto(app, adminToken, 'Condominio Las Palmeras');
    borradorId = proyecto.id;
    // Act
    const respuesta = await request(app.express)
      .post(`/api/proyectos/${proyecto.id}/publicar`)
      .set('Authorization', `Bearer ${adminToken}`);
    // Assert
    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error.codigo).toBe('PROYECTO_YA_PUBLICADO');
  });

  it('responde 422 PROYECTO_SIN_LOTES y mantiene BORRADOR si el último lote se elimina antes de publicar', async () => {
    // Arrange
    await app.cerrar();
    let proyectoNuevoId = 0;
    let loteUnicoId = 0;
    let intercalado = false;
    app = await crearAppDePrueba({
      envolverBd: (bd) => ({
        ...bd,
        transaccion: (trabajo) =>
          bd.transaccion((sql) =>
            trabajo({
              ...sql,
              async query<T>(texto: string, params?: unknown[]) {
                if (
                  !intercalado &&
                  proyectoNuevoId > 0 &&
                  texto.includes('FROM proyectos WHERE id = $1 FOR UPDATE') &&
                  params?.[0] === proyectoNuevoId
                ) {
                  intercalado = true;
                  await sql.query('DELETE FROM lotes WHERE id = $1', [loteUnicoId]);
                }
                return sql.query<T>(texto, params);
              },
            }),
          ),
      }),
    });
    adminToken = await iniciarSesion(app, 'admin@lotes.bo', 'admin123');
    const creado = await request(app.express)
      .post('/api/proyectos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Proyecto Carrera', ubicacion: 'SCZ', descripcion: '' })
      .expect(201);
    proyectoNuevoId = creado.body.id;
    const lote = await request(app.express)
      .post(`/api/proyectos/${proyectoNuevoId}/lotes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ codigo: 'U-01', precio: 30000, geometria: geo })
      .expect(201);
    loteUnicoId = lote.body.id;
    // Act
    const respuesta = await request(app.express)
      .post(`/api/proyectos/${proyectoNuevoId}/publicar`)
      .set('Authorization', `Bearer ${adminToken}`);
    // Assert
    expect(respuesta.status).toBe(422);
    expect(respuesta.body.error.codigo).toBe('PROYECTO_SIN_LOTES');
    const proyectoActual = await request(app.express)
      .get(`/api/proyectos/${proyectoNuevoId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(proyectoActual.body.estado).toBe('BORRADOR');
  });
});
