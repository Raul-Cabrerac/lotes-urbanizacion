// Consigna §2, §11 y §12: Control de acceso por roles, permisos y alcance por cliente.
import { describe, expect, it } from 'vitest';
import { ErrorSinPermiso } from '../../../src/dominio/errores';
import {
  alcanzaCliente,
  clienteDelAlcance,
  estadosVisibles,
  permisosDeRol,
  tienePermiso,
  type Permiso,
} from '../../../src/dominio/permisos';
import { ESTADOS_PROYECTO, type Rol } from '../../../src/dominio/tipos';

const PERMISOS_ASESOR: readonly Permiso[] = [
  'proyectos:ver',
  'lotes:ver',
  'clientes:ver',
  'clientes:gestionar',
  'reservas:ver',
  'reservas:gestionar',
  'ventas:ver',
  'ventas:registrar',
  'pagos:registrar',
];

const PERMISOS_ADMIN: readonly Permiso[] = [
  'proyectos:ver',
  'proyectos:gestionar',
  'lotes:ver',
  'lotes:gestionar',
  'clientes:ver',
  'clientes:gestionar',
  'reservas:ver',
  'reservas:gestionar',
  'ventas:ver',
  'ventas:registrar',
  'ventas:anular',
  'pagos:registrar',
  'pagos:anular',
  'usuarios:gestionar',
  'reportes:ver',
];

const PERMISOS_CLIENTE: readonly Permiso[] = ['ventas:ver', 'portal:ver'];

describe('permisos', () => {
  describe('tienePermiso', () => {
    it.each([
      ['ADMIN', 'proyectos:gestionar', true],
      ['ADMIN', 'lotes:gestionar', true],
      ['ADMIN', 'ventas:anular', true],
      ['ADMIN', 'pagos:anular', true],
      ['ADMIN', 'usuarios:gestionar', true],
      ['ADMIN', 'reportes:ver', true],
      ['ASESOR', 'proyectos:ver', true],
      ['ASESOR', 'lotes:ver', true],
      ['ASESOR', 'clientes:gestionar', true],
      ['ASESOR', 'reservas:gestionar', true],
      ['ASESOR', 'ventas:registrar', true],
      ['ASESOR', 'pagos:registrar', true],
      ['CLIENTE', 'ventas:ver', true],
      ['CLIENTE', 'portal:ver', true],
    ] as const)('concede el permiso cuando el rol es %s y consulta %s -> %s', (rol, permiso, esperado) => {
      // Arrange
      const rolUsuario: Rol = rol;
      const permisoConsultado: Permiso = permiso;
      // Act
      const permitido = tienePermiso(rolUsuario, permisoConsultado);
      // Assert
      expect(permitido).toBe(esperado);
    });

    it.each([
      ['ADMIN', 'portal:ver', false],
      ['ASESOR', 'proyectos:gestionar', false],
      ['ASESOR', 'lotes:gestionar', false],
      ['ASESOR', 'ventas:anular', false],
      ['ASESOR', 'pagos:anular', false],
      ['ASESOR', 'usuarios:gestionar', false],
      ['ASESOR', 'reportes:ver', false],
      ['ASESOR', 'portal:ver', false],
      ['CLIENTE', 'proyectos:ver', false],
      ['CLIENTE', 'lotes:ver', false],
      ['CLIENTE', 'clientes:ver', false],
      ['CLIENTE', 'reservas:ver', false],
      ['CLIENTE', 'reservas:gestionar', false],
      ['CLIENTE', 'ventas:registrar', false],
      ['CLIENTE', 'pagos:registrar', false],
      ['CLIENTE', 'usuarios:gestionar', false],
      ['CLIENTE', 'reportes:ver', false],
    ] as const)('deniega el permiso cuando el rol es %s y consulta %s -> %s', (rol, permiso, esperado) => {
      // Arrange
      const rolUsuario: Rol = rol;
      const permisoConsultado: Permiso = permiso;
      // Act
      const permitido = tienePermiso(rolUsuario, permisoConsultado);
      // Assert
      expect(permitido).toBe(esperado);
    });
  });

  describe('permisosDeRol', () => {
    it.each([
      ['ADMIN', PERMISOS_ADMIN],
      ['ASESOR', PERMISOS_ASESOR],
      ['CLIENTE', PERMISOS_CLIENTE],
    ] as const)('devuelve la lista exacta de permisos para el rol %s', (rol, esperados) => {
      // Arrange
      const rolUsuario: Rol = rol;
      // Act
      const permisos = permisosDeRol(rolUsuario);
      // Assert
      expect(permisos).toEqual(esperados);
    });
  });

  describe('estadosVisibles', () => {
    it('devuelve todos los estados (BORRADOR y PUBLICADO) cuando el rol es ADMIN', () => {
      // Arrange
      const rol: Rol = 'ADMIN';
      // Act
      const estados = estadosVisibles(rol);
      // Assert
      expect(estados).toEqual(ESTADOS_PROYECTO);
    });

    it.each(['ASESOR', 'CLIENTE'] as const)(
      'devuelve solo PUBLICADO cuando el rol es %s',
      (rol) => {
        // Arrange
        const rolUsuario: Rol = rol;
        // Act
        const estados = estadosVisibles(rolUsuario);
        // Assert
        expect(estados).toEqual(['PUBLICADO']);
      },
    );
  });

  describe('clienteDelAlcance', () => {
    it.each([
      ['ADMIN', null],
      ['ADMIN', 10],
      ['ASESOR', null],
    ] as const)('devuelve undefined (sin restricción de cliente) cuando el rol es %s', (rol, clienteId) => {
      // Arrange
      const usuario = { rol, clienteId };
      // Act
      const alcance = clienteDelAlcance(usuario);
      // Assert
      expect(alcance).toBeUndefined();
    });

    it('devuelve el clienteId del usuario cuando el rol es CLIENTE y está vinculado', () => {
      // Arrange
      const usuario = { rol: 'CLIENTE' as const, clienteId: 7 };
      // Act
      const alcance = clienteDelAlcance(usuario);
      // Assert
      expect(alcance).toBe(7);
    });

    it.each([null, 0] as const)(
      'lanza SIN_PERMISO cuando el rol es CLIENTE y clienteId es %s',
      (clienteId) => {
        // Arrange
        const usuario = { rol: 'CLIENTE' as const, clienteId };
        // Act
        const consultar = () => clienteDelAlcance(usuario);
        // Assert
        expect(consultar).toThrow(ErrorSinPermiso);
        expect(consultar).toThrow(expect.objectContaining({ codigo: 'SIN_PERMISO' }));
      },
    );
  });

  describe('alcanzaCliente', () => {
    it.each(['ADMIN', 'ASESOR'] as const)(
      'devuelve true para cualquier cliente cuando el rol es %s',
      (rol) => {
        // Arrange
        const usuario = { rol, clienteId: null };
        // Act
        const alcanza = alcanzaCliente(usuario, 99);
        // Assert
        expect(alcanza).toBe(true);
      },
    );

    it('devuelve true cuando el CLIENTE consulta su propio clienteId', () => {
      // Arrange
      const usuario = { rol: 'CLIENTE' as const, clienteId: 7 };
      // Act
      const alcanza = alcanzaCliente(usuario, 7);
      // Assert
      expect(alcanza).toBe(true);
    });

    it('devuelve false cuando el CLIENTE consulta el clienteId de otro cliente', () => {
      // Arrange
      const usuario = { rol: 'CLIENTE' as const, clienteId: 7 };
      // Act
      const alcanza = alcanzaCliente(usuario, 8);
      // Assert
      expect(alcanza).toBe(false);
    });

    it('lanza SIN_PERMISO cuando el CLIENTE no está vinculado a ningún cliente', () => {
      // Arrange
      const usuario = { rol: 'CLIENTE' as const, clienteId: null };
      // Act
      const verificar = () => alcanzaCliente(usuario, 7);
      // Assert
      expect(verificar).toThrow(expect.objectContaining({ codigo: 'SIN_PERMISO' }));
    });
  });
});
