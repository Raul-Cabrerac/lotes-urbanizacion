// Consigna §13: Mapeo de errores de unicidad en clientes bajo concurrencia (Incidencia #7).
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { iniciarSesionComo } from '../apoyo/app';
import { CONSULTAS, crearAppInterceptable, intercalarUnaVez, otroUsuario, type AppInterceptable } from '../apoyo/carreras';

describe('POST /api/clientes · unicidad concurrente', () => {
  let app: AppInterceptable;
  let asesorToken: string;

  beforeEach(async () => {
    app = await crearAppInterceptable();
    asesorToken = await iniciarSesionComo(app, 'ASESOR');
  });

  afterEach(async () => {
    await app.cerrar();
  });

  it('responde 409 DOCUMENTO_DUPLICADO (y no REGISTRO_DUPLICADO) ante alta concurrente con el mismo CI/NIT', async () => {
    // Arrange
    const documento = '9988776';
    intercalarUnaVez(app, {
      despuesDe: CONSULTAS.buscarClientePorDocumento,
      parametros: [documento],
      accion: (sql) => otroUsuario.registraCliente(sql, documento),
    });
    // Act
    const respuesta = await request(app.express)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${asesorToken}`)
      .send({ nombreCompleto: 'Cliente Carrera', documento, telefono: '71112222', email: '', direccion: '' });
    // Assert
    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error.codigo).toBe('DOCUMENTO_DUPLICADO');
  });
});
