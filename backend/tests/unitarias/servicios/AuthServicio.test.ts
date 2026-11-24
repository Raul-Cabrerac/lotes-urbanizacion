// Consigna §2, §11 y §12: Inicio de sesión, verificación de token y control de usuarios activos.
import { describe, expect, it, vi } from 'vitest';
import type { Hasher, ServicioTokens } from '../../../src/aplicacion/puertos';
import { AuthServicio, aUsuarioActual } from '../../../src/aplicacion/servicios/AuthServicio';
import { ErrorNoAutenticado } from '../../../src/dominio/errores';
import { permisosDeRol } from '../../../src/dominio/permisos';
import { unidadDeTrabajoFalsa } from '../../apoyo/dobles';

const usuarioConCredenciales = (sobrescribir: Record<string, unknown> = {}) => ({
  id: 2,
  nombre: 'Laura Vargas',
  email: 'asesor@lotes.bo',
  passwordHash: '$2b$10$hashDePrueba',
  rol: 'ASESOR' as const,
  clienteId: null,
  activo: true,
  creadoEn: new Date('2026-03-01T10:00:00'),
  ...sobrescribir,
});

const crearDoblesSeguridad = (
  sobreHasher: Partial<Hasher> = {},
  sobreTokens: Partial<ServicioTokens> = {},
) => {
  const hasher: Hasher = {
    hashear: vi.fn(),
    comparar: vi.fn().mockResolvedValue(true),
    ...sobreHasher,
  };
  const tokens: ServicioTokens = {
    generar: vi.fn().mockReturnValue('jwt-token-valido'),
    verificar: vi.fn().mockReturnValue({ usuarioId: 2 }),
    ...sobreTokens,
  };
  return { hasher, tokens };
};

describe('AuthServicio', () => {
  describe('aUsuarioActual', () => {
    it('proyecta los datos de sesión con los permisos del rol sin exponer estado ni credenciales', () => {
      // Arrange
      const clienteUsuario = usuarioConCredenciales({
        id: 5,
        nombre: 'María René',
        email: 'cliente@lotes.bo',
        rol: 'CLIENTE' as const,
        clienteId: 7,
      });
      // Act
      const actual = aUsuarioActual(clienteUsuario);
      // Assert
      expect(actual).toEqual({
        id: 5,
        nombre: 'María René',
        email: 'cliente@lotes.bo',
        rol: 'CLIENTE',
        clienteId: 7,
        permisos: permisosDeRol('CLIENTE'),
      });
    });
  });

  describe('iniciarSesion', () => {
    it('normaliza el email, valida credenciales, genera token y devuelve el usuario actual cuando está activo', async () => {
      // Arrange
      const usuario = usuarioConCredenciales();
      const repos = {
        usuarios: { buscarPorEmail: vi.fn().mockResolvedValue(usuario) },
      };
      const { hasher, tokens } = crearDoblesSeguridad();
      const servicio = new AuthServicio(unidadDeTrabajoFalsa(repos), hasher, tokens);
      // Act
      const sesion = await servicio.iniciarSesion('  Asesor@Lotes.BO  ', 'asesor123');
      // Assert
      expect(repos.usuarios.buscarPorEmail).toHaveBeenCalledWith('asesor@lotes.bo');
      expect(hasher.comparar).toHaveBeenCalledWith('asesor123', usuario.passwordHash);
      expect(tokens.generar).toHaveBeenCalledWith({ usuarioId: 2 });
      expect(sesion).toEqual({
        token: 'jwt-token-valido',
        usuario: {
          id: 2,
          nombre: 'Laura Vargas',
          email: 'asesor@lotes.bo',
          rol: 'ASESOR',
          clienteId: null,
          permisos: permisosDeRol('ASESOR'),
        },
      });
    });

    it('lanza CREDENCIALES_INVALIDAS sin verificar contraseña ni emitir token cuando el correo no existe', async () => {
      // Arrange
      const repos = {
        usuarios: { buscarPorEmail: vi.fn().mockResolvedValue(null) },
      };
      const { hasher, tokens } = crearDoblesSeguridad();
      const servicio = new AuthServicio(unidadDeTrabajoFalsa(repos), hasher, tokens);
      // Act
      const iniciar = () => servicio.iniciarSesion('noexiste@lotes.bo', 'clave123');
      // Assert
      await expect(iniciar()).rejects.toMatchObject({ codigo: 'CREDENCIALES_INVALIDAS' });
      expect(hasher.comparar).not.toHaveBeenCalled();
      expect(tokens.generar).not.toHaveBeenCalled();
    });

    it('lanza CREDENCIALES_INVALIDAS sin emitir token cuando la contraseña no coincide', async () => {
      // Arrange
      const repos = {
        usuarios: { buscarPorEmail: vi.fn().mockResolvedValue(usuarioConCredenciales()) },
      };
      const { hasher, tokens } = crearDoblesSeguridad({ comparar: vi.fn().mockResolvedValue(false) });
      const servicio = new AuthServicio(unidadDeTrabajoFalsa(repos), hasher, tokens);
      // Act
      const iniciar = () => servicio.iniciarSesion('asesor@lotes.bo', 'incorrecta');
      // Assert
      await expect(iniciar()).rejects.toMatchObject({ codigo: 'CREDENCIALES_INVALIDAS' });
      expect(tokens.generar).not.toHaveBeenCalled();
    });

    it('lanza USUARIO_INACTIVO sin emitir token cuando el usuario está desactivado', async () => {
      // Arrange
      const repos = {
        usuarios: { buscarPorEmail: vi.fn().mockResolvedValue(usuarioConCredenciales({ activo: false })) },
      };
      const { hasher, tokens } = crearDoblesSeguridad();
      const servicio = new AuthServicio(unidadDeTrabajoFalsa(repos), hasher, tokens);
      // Act
      const iniciar = () => servicio.iniciarSesion('asesor@lotes.bo', 'asesor123');
      // Assert
      await expect(iniciar()).rejects.toMatchObject({ codigo: 'USUARIO_INACTIVO' });
      expect(tokens.generar).not.toHaveBeenCalled();
    });
  });

  describe('usuarioDesdeToken', () => {
    it('devuelve el usuario actual cuando el token es válido y el usuario sigue activo', async () => {
      // Arrange
      const repos = {
        usuarios: { buscarPorId: vi.fn().mockResolvedValue(usuarioConCredenciales()) },
      };
      const { hasher, tokens } = crearDoblesSeguridad();
      const servicio = new AuthServicio(unidadDeTrabajoFalsa(repos), hasher, tokens);
      // Act
      const actual = await servicio.usuarioDesdeToken('jwt-token-valido');
      // Assert
      expect(tokens.verificar).toHaveBeenCalledWith('jwt-token-valido');
      expect(repos.usuarios.buscarPorId).toHaveBeenCalledWith(2);
      expect(actual).toEqual({
        id: 2,
        nombre: 'Laura Vargas',
        email: 'asesor@lotes.bo',
        rol: 'ASESOR',
        clienteId: null,
        permisos: permisosDeRol('ASESOR'),
      });
    });

    it('lanza TOKEN_INVALIDO sin consultar repositorios cuando verificar rechaza el token', async () => {
      // Arrange
      const repos = {
        usuarios: { buscarPorId: vi.fn() },
      };
      const { hasher, tokens } = crearDoblesSeguridad(undefined, {
        verificar: vi.fn(() => {
          throw new ErrorNoAutenticado('Token expirado.', 'TOKEN_INVALIDO');
        }),
      });
      const servicio = new AuthServicio(unidadDeTrabajoFalsa(repos), hasher, tokens);
      // Act
      const validar = () => servicio.usuarioDesdeToken('token-expirado');
      // Assert
      await expect(validar()).rejects.toMatchObject({ codigo: 'TOKEN_INVALIDO' });
      expect(repos.usuarios.buscarPorId).not.toHaveBeenCalled();
    });

    it.each([
      ['usuario inexistente', null],
      ['usuario desactivado', usuarioConCredenciales({ activo: false })],
    ] as const)('lanza NO_AUTENTICADO cuando el token corresponde a un %s', async (_desc, usuarioEnBd) => {
      // Arrange
      const repos = {
        usuarios: { buscarPorId: vi.fn().mockResolvedValue(usuarioEnBd) },
      };
      const { hasher, tokens } = crearDoblesSeguridad();
      const servicio = new AuthServicio(unidadDeTrabajoFalsa(repos), hasher, tokens);
      // Act
      const validar = () => servicio.usuarioDesdeToken('jwt-token-valido');
      // Assert
      await expect(validar()).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
    });
  });
});
