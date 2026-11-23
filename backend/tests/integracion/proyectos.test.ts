// Consigna §13: Publicación de proyectos y consistencia bajo concurrencia (Incidencia #4).
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { iniciarSesionComo } from '../apoyo/app';
import { buscarProyecto } from '../apoyo/buscadores';
import { CONSULTAS, crearAppInterceptable, intercalarUnaVez, otroUsuario, type AppInterceptable } from '../apoyo/carreras';
import { PROYECTO_BORRADOR } from '../apoyo/datosDemo';
import { GEOMETRIA_LOTE } from '../apoyo/dobles';

describe('POST /api/proyectos/:id/publicar', () => {
  let app: AppInterceptable;
  let adminToken: string;

  beforeEach(async () => {
    app = await crearAppInterceptable();
    adminToken = await iniciarSesionComo(app, 'ADMIN');
  });

  afterEach(async () => {
    await app.cerrar();
  });

  it('responde 409 PROYECTO_YA_PUBLICADO si otra operación publica el proyecto concurrentemente', async () => {
    // Arrange
    const proyecto = await buscarProyecto(app, adminToken, PROYECTO_BORRADOR);
    intercalarUnaVez(app, {
      antesDe: CONSULTAS.bloquearProyecto,
      parametros: [proyecto.id],
      accion: (sql) => otroUsuario.publicaProyecto(sql, proyecto.id),
    });
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
    const creado = await request(app.express)
      .post('/api/proyectos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Proyecto Carrera', ubicacion: 'SCZ', descripcion: '' })
      .expect(201);
    const proyectoNuevoId = creado.body.id as number;
    const lote = await request(app.express)
      .post(`/api/proyectos/${proyectoNuevoId}/lotes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ codigo: 'U-01', precio: 30000, geometria: GEOMETRIA_LOTE })
      .expect(201);
    const loteUnicoId = lote.body.id as number;
    intercalarUnaVez(app, {
      antesDe: CONSULTAS.bloquearProyecto,
      parametros: [proyectoNuevoId],
      accion: (sql) => otroUsuario.eliminaLote(sql, loteUnicoId),
    });
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
