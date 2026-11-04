import { ErrorConflicto, ErrorNoEncontrado } from '../../dominio/errores';
import type { Cliente } from '../../dominio/tipos';
import type { DatosCliente, UnidadDeTrabajo, UsuarioActual } from '../puertos';
import type { VentaServicio } from './VentaServicio';

/** Gestión de clientes (consigna, sección 6). */
export class ClienteServicio {
  constructor(
    private readonly uow: UnidadDeTrabajo,
    private readonly ventas: VentaServicio,
  ) {}

  listar(busqueda?: string): Promise<Cliente[]> {
    return this.uow.repos.clientes.listar(busqueda);
  }

  /** Cliente con todas sus operaciones (reservas y ventas con su saldo). */
  async obtener(id: number, usuario: UsuarioActual) {
    const cliente = await this.buscar(id);
    const [reservas, ventas] = await Promise.all([
      this.uow.repos.reservas.listar({ clienteId: id }),
      this.ventas.listar({ clienteId: id }, usuario),
    ]);
    return { ...cliente, reservas, ventas };
  }

  async crear(datos: DatosCliente): Promise<Cliente> {
    await this.validarDocumentoUnico(datos.documento);
    return this.uow.repos.clientes.crear(datos);
  }

  async actualizar(id: number, cambios: Partial<DatosCliente>): Promise<Cliente> {
    const actual = await this.buscar(id);
    if (cambios.documento !== undefined && cambios.documento !== actual.documento) {
      await this.validarDocumentoUnico(cambios.documento);
    }
    return this.uow.repos.clientes.actualizar(id, cambios);
  }

  private async buscar(id: number): Promise<Cliente> {
    const cliente = await this.uow.repos.clientes.buscarPorId(id);
    if (!cliente) throw new ErrorNoEncontrado('Cliente no encontrado.');
    return cliente;
  }

  private async validarDocumentoUnico(documento: string): Promise<void> {
    if (await this.uow.repos.clientes.buscarPorDocumento(documento)) {
      throw new ErrorConflicto('DOCUMENTO_DUPLICADO', `Ya existe un cliente con el documento ${documento}.`);
    }
  }
}
