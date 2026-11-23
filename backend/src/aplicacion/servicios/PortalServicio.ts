import { ErrorSinPermiso } from '../../dominio/errores';
import { clienteDelAlcance } from '../../dominio/permisos';
import type { UsuarioActual } from '../puertos';
import type { ClienteServicio } from './ClienteServicio';

/**
 * Portal del cliente: sus lotes, compras, cronograma, pagos y saldo.
 * El cliente se toma del usuario autenticado (nunca de un parámetro), así un
 * cliente no puede ver operaciones de otro.
 */
export class PortalServicio {
  constructor(private readonly clientes: ClienteServicio) {}

  async misOperaciones(usuario: UsuarioActual) {
    const clienteId = clienteDelAlcance(usuario);
    if (clienteId === undefined) throw new ErrorSinPermiso('El portal es solo para clientes.');
    const { reservas, ventas, ...cliente } = await this.clientes.obtener(clienteId, usuario);
    return { cliente, ventas, reservas };
  }
}
