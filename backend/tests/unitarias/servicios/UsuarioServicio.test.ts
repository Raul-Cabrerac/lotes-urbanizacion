// Consigna §2, §11 y §12: Administración de usuarios, vínculos a clientes y control de activación.
import { describe, expect, it, vi } from 'vitest';
import type { Hasher } from '../../../src/aplicacion/puertos';
import { UsuarioServicio } from '../../../src/aplicacion/servicios/UsuarioServicio';
import { unidadDeTrabajoFalsa, usuarioAdmin } from '../../apoyo/dobles';

const usuarioBase = (sobrescribir: Record<string, unknown> = {}) => ({
  id: 2,
  nombre: 'Laura Vargas',
  email: 'asesor@lotes.bo',
  rol: 'ASESOR' as const,
  clienteId: null,
  activo: true,
  creadoEn: new Date('2026-03-01T10:00:00'),
  ...sobrescribir,
});

const crearHasher = (hash = '$2b$10$hashGenerado'): Hasher => ({
  hashear: vi.fn().mockResolvedValue(hash),
  comparar: vi.fn(),
});

describe('UsuarioServicio', () => {
  describe('listar', () => {
    it('devuelve el listado de usuarios con sus clientes delegando al repositorio', async () => {
      // Arrange
      const lista = [{ ...usuarioBase(), cliente: null }];
      const repos = {
        usuarios: { listar: vi.fn().mockResolvedValue(lista) },
      };
      const servicio = new UsuarioServicio(unidadDeTrabajoFalsa(repos), crearHasher());
      // Act
      const resultado = await servicio.listar();
      // Assert
      expect(repos.usuarios.listar).toHaveBeenCalledOnce();
      expect(resultado).toEqual(lista);
    });
  });

  describe('crear', () => {
    it('normaliza correo y nombre, hashea contraseña de 6 caracteres (límite mínimo) y crea usuario interno', async () => {
      // Arrange
      const creado = usuarioBase({ id: 9, nombre: 'Ana Pérez', email: 'ana@lotes.bo' });
      const repos = {
        usuarios: {
          buscarPorEmail: vi.fn().mockResolvedValue(null),
          buscarPorClienteId: vi.fn(),
          crear: vi.fn().mockResolvedValue(creado),
        },
        clientes: { buscarPorId: vi.fn() },
      };
      const hasher = crearHasher('$2b$10$hash6chars');
      const servicio = new UsuarioServicio(unidadDeTrabajoFalsa(repos), hasher);
      // Act
      const resultado = await servicio.crear({
        nombre: '  Ana Pérez  ',
        email: '  Ana@Lotes.BO  ',
        password: 'abc123',
        rol: 'ASESOR',
      });
      // Assert
      expect(repos.usuarios.buscarPorEmail).toHaveBeenCalledWith('ana@lotes.bo');
      expect(repos.clientes.buscarPorId).not.toHaveBeenCalled();
      expect(repos.usuarios.buscarPorClienteId).not.toHaveBeenCalled();
      expect(hasher.hashear).toHaveBeenCalledWith('abc123');
      expect(repos.usuarios.crear).toHaveBeenCalledWith({
        nombre: 'Ana Pérez',
        email: 'ana@lotes.bo',
        passwordHash: '$2b$10$hash6chars',
        rol: 'ASESOR',
        clienteId: null,
      });
      expect(resultado).toEqual(creado);
    });

    it('valida existencia y disponibilidad del cliente y crea usuario con rol CLIENTE', async () => {
      // Arrange
      const creado = usuarioBase({
        id: 10,
        nombre: 'Camila Rojas',
        email: 'camila@ejemplo.bo',
        rol: 'CLIENTE' as const,
        clienteId: 7,
      });
      const repos = {
        usuarios: {
          buscarPorEmail: vi.fn().mockResolvedValue(null),
          buscarPorClienteId: vi.fn().mockResolvedValue(null),
          crear: vi.fn().mockResolvedValue(creado),
        },
        clientes: { buscarPorId: vi.fn().mockResolvedValue({ id: 7 }) },
      };
      const hasher = crearHasher();
      const servicio = new UsuarioServicio(unidadDeTrabajoFalsa(repos), hasher);
      // Act
      const resultado = await servicio.crear({
        nombre: 'Camila Rojas',
        email: 'camila@ejemplo.bo',
        password: 'secreta123',
        rol: 'CLIENTE',
        clienteId: 7,
      });
      // Assert
      expect(repos.clientes.buscarPorId).toHaveBeenCalledWith(7);
      expect(repos.usuarios.buscarPorClienteId).toHaveBeenCalledWith(7);
      expect(repos.usuarios.crear).toHaveBeenCalledWith(
        expect.objectContaining({ rol: 'CLIENTE', clienteId: 7 }),
      );
      expect(resultado).toEqual(creado);
    });

    it.each([
      ['PASSWORD_DEBIL', { nombre: 'Ana', email: 'ana@lotes.bo', password: '12345', rol: 'ASESOR' as const }],
      ['CLIENTE_REQUERIDO', { nombre: 'Camila', email: 'camila@lotes.bo', password: 'clave123', rol: 'CLIENTE' as const }],
      [
        'CLIENTE_NO_PERMITIDO',
        { nombre: 'Ana', email: 'ana@lotes.bo', password: 'clave123', rol: 'ASESOR' as const, clienteId: 7 },
      ],
    ] as const)('lanza %s sin consultar repositorios ni hashear cuando falla la validación previa', async (codigoEsperado, entrada) => {
      // Arrange
      const repos = {
        usuarios: { buscarPorEmail: vi.fn(), crear: vi.fn() },
        clientes: { buscarPorId: vi.fn() },
      };
      const hasher = crearHasher();
      const servicio = new UsuarioServicio(unidadDeTrabajoFalsa(repos), hasher);
      // Act
      const crear = () => servicio.crear(entrada);
      // Assert
      await expect(crear()).rejects.toMatchObject({ codigo: codigoEsperado });
      expect(repos.usuarios.buscarPorEmail).not.toHaveBeenCalled();
      expect(hasher.hashear).not.toHaveBeenCalled();
      expect(repos.usuarios.crear).not.toHaveBeenCalled();
    });

    it('lanza EMAIL_DUPLICADO sin hashear ni guardar cuando ya existe un usuario con el correo normalizado', async () => {
      // Arrange
      const repos = {
        usuarios: {
          buscarPorEmail: vi.fn().mockResolvedValue(usuarioBase()),
          crear: vi.fn(),
        },
        clientes: { buscarPorId: vi.fn() },
      };
      const hasher = crearHasher();
      const servicio = new UsuarioServicio(unidadDeTrabajoFalsa(repos), hasher);
      // Act
      const crear = () =>
        servicio.crear({ nombre: 'Otra', email: 'ASESOR@lotes.bo', password: 'clave123', rol: 'ASESOR' });
      // Assert
      await expect(crear()).rejects.toMatchObject({ codigo: 'EMAIL_DUPLICADO' });
      expect(hasher.hashear).not.toHaveBeenCalled();
      expect(repos.usuarios.crear).not.toHaveBeenCalled();
    });

    it.each([
      ['NO_ENCONTRADO', null, null],
      ['CLIENTE_YA_TIENE_USUARIO', { id: 7 }, usuarioBase({ id: 8, rol: 'CLIENTE', clienteId: 7 })],
    ] as const)(
      'lanza %s sin hashear ni crear cuando el vínculo con el cliente no es válido en repositorio',
      async (codigoEsperado, clienteEnBd, usuarioDelCliente) => {
        // Arrange
        const repos = {
          usuarios: {
            buscarPorEmail: vi.fn().mockResolvedValue(null),
            buscarPorClienteId: vi.fn().mockResolvedValue(usuarioDelCliente),
            crear: vi.fn(),
          },
          clientes: { buscarPorId: vi.fn().mockResolvedValue(clienteEnBd) },
        };
        const hasher = crearHasher();
        const servicio = new UsuarioServicio(unidadDeTrabajoFalsa(repos), hasher);
        // Act
        const crear = () =>
          servicio.crear({
            nombre: 'Camila',
            email: 'camila@lotes.bo',
            password: 'clave123',
            rol: 'CLIENTE',
            clienteId: 7,
          });
        // Assert
        await expect(crear()).rejects.toMatchObject({ codigo: codigoEsperado });
        expect(hasher.hashear).not.toHaveBeenCalled();
        expect(repos.usuarios.crear).not.toHaveBeenCalled();
      },
    );
  });

  describe('cambiarActivo', () => {
    it('desactiva a otro usuario existente y devuelve el usuario actualizado', async () => {
      // Arrange
      const inactivo = usuarioBase({ id: 2, activo: false });
      const repos = {
        usuarios: {
          buscarPorId: vi.fn().mockResolvedValue(usuarioBase({ id: 2, activo: true })),
          actualizar: vi.fn().mockResolvedValue(inactivo),
        },
      };
      const servicio = new UsuarioServicio(unidadDeTrabajoFalsa(repos), crearHasher());
      // Act
      const resultado = await servicio.cambiarActivo(2, false, usuarioAdmin);
      // Assert
      expect(repos.usuarios.actualizar).toHaveBeenCalledWith(2, { activo: false });
      expect(resultado).toEqual(inactivo);
    });

    it('permite confirmar estado activo en el propio usuario (límite: solo bloquea desactivarse)', async () => {
      // Arrange
      const propioActivo = usuarioBase({ id: usuarioAdmin.id, rol: 'ADMIN', activo: true });
      const repos = {
        usuarios: {
          buscarPorId: vi.fn().mockResolvedValue(propioActivo),
          actualizar: vi.fn().mockResolvedValue(propioActivo),
        },
      };
      const servicio = new UsuarioServicio(unidadDeTrabajoFalsa(repos), crearHasher());
      // Act
      const resultado = await servicio.cambiarActivo(usuarioAdmin.id, true, usuarioAdmin);
      // Assert
      expect(repos.usuarios.actualizar).toHaveBeenCalledWith(usuarioAdmin.id, { activo: true });
      expect(resultado).toEqual(propioActivo);
    });

    it('lanza NO_PUEDE_DESACTIVARSE sin consultar ni actualizar cuando el usuario intenta desactivarse a sí mismo', async () => {
      // Arrange
      const repos = {
        usuarios: {
          buscarPorId: vi.fn(),
          actualizar: vi.fn(),
        },
      };
      const servicio = new UsuarioServicio(unidadDeTrabajoFalsa(repos), crearHasher());
      // Act
      const desactivar = () => servicio.cambiarActivo(usuarioAdmin.id, false, usuarioAdmin);
      // Assert
      await expect(desactivar()).rejects.toMatchObject({ codigo: 'NO_PUEDE_DESACTIVARSE' });
      expect(repos.usuarios.buscarPorId).not.toHaveBeenCalled();
      expect(repos.usuarios.actualizar).not.toHaveBeenCalled();
    });

    it('lanza NO_ENCONTRADO sin actualizar cuando el usuario objetivo no existe', async () => {
      // Arrange
      const repos = {
        usuarios: {
          buscarPorId: vi.fn().mockResolvedValue(null),
          actualizar: vi.fn(),
        },
      };
      const servicio = new UsuarioServicio(unidadDeTrabajoFalsa(repos), crearHasher());
      // Act
      const cambiar = () => servicio.cambiarActivo(999, false, usuarioAdmin);
      // Assert
      await expect(cambiar()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
      expect(repos.usuarios.actualizar).not.toHaveBeenCalled();
    });
  });
});
