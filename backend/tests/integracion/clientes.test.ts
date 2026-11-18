// Consigna §13: Mapeo de errores de unicidad en clientes bajo concurrencia (Incidencia #7).
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { crearAppInterceptable, iniciarSesion, type AppInterceptable } from '../apoyo/app';

describe('POST /api/clientes · unicidad concurrente', () => {
  let app: AppInterceptable;
  let asesorToken: string;

  beforeEach(async () => {
    app = await crearAppInterceptable();
    asesorToken = await iniciarSesion(app, 'asesor@lotes.bo', 'asesor123');
  });

  afterEach(async () => {
    await app.cerrar();
  });

  it('responde 409 DOCUMENTO_DUPLICADO (y no REGISTRO_DUPLICADO) ante alta concurrente con el mismo CI/NIT', async () => {
    // Arrange
    let intercalado = false;
    app.alInterceptarDespues(async (texto, params, ejecutar) => {
      if (!intercalado && texto.includes('SELECT * FROM clientes WHERE documento = $1')) {
        intercalado = true;
        await ejecutar(
          "INSERT INTO clientes (nombre_completo, documento, telefono, email, direccion) VALUES ('Otro', $1, '70000001', '', '')",
          [params?.[0]],
        );
      }
    });
    // Act
    const respuesta = await request(app.express)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${asesorToken}`)
      .send({ nombreCompleto: 'Cliente Carrera', documento: '9988776', telefono: '71112222', email: '', direccion: '' });
    // Assert
    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error.codigo).toBe('DOCUMENTO_DUPLICADO');
  });
});
