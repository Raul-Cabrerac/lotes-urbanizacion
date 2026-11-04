import { ErrorConflicto, ErrorNoEncontrado, ErrorReglaNegocio } from '../../dominio/errores';
import type { Rol, Usuario } from '../../dominio/tipos';
import { validarPassword, validarVinculoCliente } from '../../dominio/usuario';
import type { Hasher, UnidadDeTrabajo, UsuarioActual } from '../puertos';

export interface EntradaUsuario {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
  clienteId?: number | null;
}

/** Administración de usuarios (solo administrador). */
export class UsuarioServicio {
  constructor(
    private readonly uow: UnidadDeTrabajo,
    private readonly hasher: Hasher,
  ) {}

  listar() {
    return this.uow.repos.usuarios.listar();
  }

  async crear(entrada: EntradaUsuario): Promise<Usuario> {
    const email = entrada.email.trim().toLowerCase();
    validarPassword(entrada.password);
    validarVinculoCliente(entrada.rol, entrada.clienteId);

    if (await this.uow.repos.usuarios.buscarPorEmail(email)) {
      throw new ErrorConflicto('EMAIL_DUPLICADO', `Ya existe un usuario con el correo ${email}.`);
    }
    if (entrada.rol === 'CLIENTE' && entrada.clienteId) {
      if (!(await this.uow.repos.clientes.buscarPorId(entrada.clienteId))) {
        throw new ErrorNoEncontrado('Cliente no encontrado.');
      }
      if (await this.uow.repos.usuarios.buscarPorClienteId(entrada.clienteId)) {
        throw new ErrorConflicto('CLIENTE_YA_TIENE_USUARIO', 'Ese cliente ya tiene un usuario para el portal.');
      }
    }

    return this.uow.repos.usuarios.crear({
      nombre: entrada.nombre.trim(),
      email,
      passwordHash: await this.hasher.hashear(entrada.password),
      rol: entrada.rol,
      clienteId: entrada.rol === 'CLIENTE' ? (entrada.clienteId ?? null) : null,
    });
  }

  async cambiarActivo(id: number, activo: boolean, usuarioActual: UsuarioActual): Promise<Usuario> {
    if (id === usuarioActual.id && !activo) {
      throw new ErrorReglaNegocio('NO_PUEDE_DESACTIVARSE', 'No puede desactivar su propio usuario.');
    }
    if (!(await this.uow.repos.usuarios.buscarPorId(id))) throw new ErrorNoEncontrado('Usuario no encontrado.');
    return this.uow.repos.usuarios.actualizar(id, { activo });
  }
}
