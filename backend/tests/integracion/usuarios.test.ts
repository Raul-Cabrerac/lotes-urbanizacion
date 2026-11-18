// Consigna §13: Mapeo de códigos 409 en usuarios y lotes bajo concurrencia (Incidencia #7).
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { rectanguloEnMetros } from '../../src/dominio/geometria';
import { crearAppInterceptable, iniciarSesion, type AppInterceptable } from '../apoyo/app';
import { buscarCliente } from '../apoyo/buscadores';

const geo = rectanguloEnMetros([-63.18, -17.78], 0, 0, 12, 30);

describe('Unicidad concurrente en usuarios y lotes', () => {
  let app: AppInterceptable;
  let adminToken: string;

  beforeEach(async () => {
    app = await crearAppInterceptable();
    adminToken = await iniciarSesion(app, 'admin@lotes.bo', 'admin123');
  });

  afterEach(async () => {
    await app.cerrar();
  });

  it('responde 409 EMAIL_DUPLICADO cuando otro usuario registra el mismo correo antes del INSERT', async () => {
    // Arrange
    let intercalado = false;
    app.alInterceptarDespues(async (texto, params, ejecutar) => {
      if (!intercalado && texto.includes('SELECT * FROM usuarios WHERE email = $1') && params?.[0] === 'nuevo@lotes.bo') {
        intercalado = true;
        await ejecutar(
          "INSERT INTO usuarios (nombre, email, password_hash, rol, cliente_id) VALUES ('Otro', $1, 'hash', 'ASESOR', NULL)",
          [params[0]],
        );
      }
    });
    // Act
    const respuesta = await request(app.express)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Nuevo Asesor', email: 'nuevo@lotes.bo', password: 'Password1', rol: 'ASESOR' });
    // Assert
    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error.codigo).toBe('EMAIL_DUPLICADO');
  });

  it('responde 409 CLIENTE_YA_TIENE_USUARIO cuando otro proceso vincula al mismo cliente antes del INSERT', async () => {
    // Arrange
    const ana = await buscarCliente(app, adminToken, '5512893');
    let intercalado = false;
    app.alInterceptarDespues(async (texto, params, ejecutar) => {
      if (!intercalado && texto.includes('SELECT * FROM usuarios WHERE cliente_id = $1')) {
        intercalado = true;
        await ejecutar(
          "INSERT INTO usuarios (nombre, email, password_hash, rol, cliente_id) VALUES ('Otro', 'otro.portal@lotes.bo', 'hash', 'CLIENTE', $1)",
          [params?.[0]],
        );
      }
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

  it('responde 409 CODIGO_LOTE_DUPLICADO cuando otro proceso crea el mismo código de lote antes del INSERT', async () => {
    // Arrange
    let intercalado = false;
    app.alInterceptarDespues(async (texto, params, ejecutar) => {
      if (!intercalado && texto.includes('SELECT * FROM lotes WHERE proyecto_id = $1 AND codigo = $2')) {
        intercalado = true;
        await ejecutar(
          `INSERT INTO lotes (proyecto_id, codigo, manzano, etapa, superficie_m2, dimensiones, precio, geometria)
           VALUES ($1, $2, 'A', 'Etapa 1', 360, '12 x 30 m', 50000, $3)`,
          [params?.[0], params?.[1], JSON.stringify(geo)],
        );
      }
    });
    // Act
    const respuesta = await request(app.express)
      .post('/api/proyectos/1/lotes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ codigo: 'D-99', precio: 50000, geometria: geo });
    // Assert
    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error.codigo).toBe('CODIGO_LOTE_DUPLICADO');
  });
});
