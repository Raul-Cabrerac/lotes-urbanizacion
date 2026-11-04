import { ErrorNoAutenticado } from '../../dominio/errores';
import { permisosDeRol } from '../../dominio/permisos';
import type { Usuario } from '../../dominio/tipos';
import type { Hasher, ServicioTokens, UnidadDeTrabajo, UsuarioActual } from '../puertos';

export function aUsuarioActual(usuario: Usuario): UsuarioActual {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    clienteId: usuario.clienteId,
    permisos: permisosDeRol(usuario.rol),
  };
}

/** Inicio de sesión y validación del token de cada petición. */
export class AuthServicio {
  constructor(
    private readonly uow: UnidadDeTrabajo,
    private readonly hasher: Hasher,
    private readonly tokens: ServicioTokens,
  ) {}

  async iniciarSesion(email: string, password: string): Promise<{ token: string; usuario: UsuarioActual }> {
    const usuario = await this.uow.repos.usuarios.buscarPorEmail(email.trim().toLowerCase());
    // Mismo mensaje si el correo no existe o la contraseña es incorrecta (no revelar cuál falló).
    const credencialesValidas = usuario !== null && (await this.hasher.comparar(password, usuario.passwordHash));
    if (!usuario || !credencialesValidas) {
      throw new ErrorNoAutenticado('Correo o contraseña incorrectos.', 'CREDENCIALES_INVALIDAS');
    }
    if (!usuario.activo) {
      throw new ErrorNoAutenticado('Su usuario está desactivado. Contacte al administrador.', 'USUARIO_INACTIVO');
    }
    const token = this.tokens.generar({ usuarioId: usuario.id, rol: usuario.rol });
    return { token, usuario: aUsuarioActual(usuario) };
  }

  /** Obtiene el usuario de un token. Se consulta la base de datos para que un usuario desactivado pierda el acceso. */
  async usuarioDesdeToken(token: string): Promise<UsuarioActual> {
    const { usuarioId } = this.tokens.verificar(token);
    const usuario = await this.uow.repos.usuarios.buscarPorId(usuarioId);
    if (!usuario || !usuario.activo) {
      throw new ErrorNoAutenticado('Su sesión ya no es válida. Inicie sesión nuevamente.');
    }
    return aUsuarioActual(usuario);
  }
}
