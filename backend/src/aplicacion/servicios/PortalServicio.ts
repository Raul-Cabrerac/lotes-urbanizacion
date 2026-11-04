import { ErrorNoEncontrado, ErrorSinPermiso } from '../../dominio/errores';
import type { UnidadDeTrabajo, UsuarioActual } from '../puertos';
import type { VentaServicio } from './VentaServicio';

/**
 * Portal del cliente: sus lotes, compras, cronograma, pagos y saldo.
 * El cliente se toma del usuario autenticado (nunca de un parámetro), así un
 * cliente no puede ver operaciones de otro.
 */
export class PortalServicio {
  constructor(
    private readonly uow: UnidadDeTrabajo,
    private readonly ventas: VentaServicio,
  ) {}

  async misOperaciones(usuario: UsuarioActual) {
    if (usuario.rol !== 'CLIENTE' || !usuario.clienteId) {
      throw new ErrorSinPermiso('El portal es solo para clientes.');
    }
    const cliente = await this.uow.repos.clientes.buscarPorId(usuario.clienteId);
    if (!cliente) throw new ErrorNoEncontrado('Cliente no encontrado.');

    const [ventas, reservas] = await Promise.all([
      this.ventas.listar({ clienteId: cliente.id }, usuario),
      this.uow.repos.reservas.listar({ clienteId: cliente.id }),
    ]);
    return { cliente, ventas, reservas };
  }
}
