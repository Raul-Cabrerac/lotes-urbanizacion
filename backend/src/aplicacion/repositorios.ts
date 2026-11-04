/**
 * Puertos de persistencia: los repositorios y las vistas de lectura que devuelven.
 *
 * Los implementa infraestructura/bd/repositorios con SQL. En una prueba unitaria se reemplazan
 * por dobles de prueba (por ejemplo, un repositorio en memoria o un mock de vi.fn()).
 */
import type { FechaISO } from '../dominio/fechas';
import type { PoligonoGeoJSON } from '../dominio/geometria';
import type { CuotaNueva } from '../dominio/planPagos';
import type {
  Cliente,
  Cuota,
  EstadoLote,
  EstadoProyecto,
  EstadoReserva,
  EstadoVenta,
  Lote,
  MetodoPago,
  ModalidadPago,
  Pago,
  Proyecto,
  Reserva,
  Rol,
  Usuario,
  UsuarioConCredenciales,
  Venta,
} from '../dominio/tipos';

// ----------------------------------------------------------------------------
// Vistas de lectura (entidad + datos relacionados para mostrar)
// ----------------------------------------------------------------------------

export interface Referencia {
  id: number;
  nombre: string;
}

export interface LoteResumen {
  id: number;
  codigo: string;
  manzano: string;
  etapa: string;
  superficieM2: number;
  precio: number;
  estado: EstadoLote;
  geometria: PoligonoGeoJSON;
  proyecto: Referencia;
}

export interface ClienteResumen {
  id: number;
  nombreCompleto: string;
  documento: string;
  telefono: string;
}

export interface ReservaVista extends Reserva {
  lote: LoteResumen;
  cliente: ClienteResumen;
  asesor: Referencia;
}

export interface PagoVista extends Pago {
  cuotaNumero: number;
  cuotaConcepto: string;
  registradoPor: Referencia;
  anuladoPor: Referencia | null;
}

export interface VentaVista extends Venta {
  lote: LoteResumen;
  cliente: ClienteResumen;
  asesor: Referencia;
  anuladaPor: Referencia | null;
  cuotas: Cuota[];
  pagos: PagoVista[];
}

// ----------------------------------------------------------------------------
// Repositorios
// ----------------------------------------------------------------------------

export interface DatosProyecto {
  nombre: string;
  descripcion: string;
  ubicacion: string;
}

export interface RepositorioProyectos {
  listar(soloPublicados: boolean): Promise<Proyecto[]>;
  buscarPorId(id: number): Promise<Proyecto | null>;
  crear(datos: DatosProyecto): Promise<Proyecto>;
  actualizar(
    id: number,
    cambios: Partial<DatosProyecto> & { estado?: EstadoProyecto; limite?: PoligonoGeoJSON | null },
  ): Promise<Proyecto>;
}

export interface FiltrosLotes {
  estado?: EstadoLote;
  manzano?: string;
  etapa?: string;
  busqueda?: string; // por código
}

export interface DatosLote {
  codigo: string;
  manzano: string;
  etapa: string;
  superficieM2: number;
  dimensiones: string;
  precio: number;
  geometria: PoligonoGeoJSON;
}

export interface ConteoLotes {
  proyectoId: number;
  estado: EstadoLote;
  cantidad: number;
}

export interface RepositorioLotes {
  listarPorProyecto(proyectoId: number, filtros?: FiltrosLotes): Promise<Lote[]>;
  buscarPorId(id: number): Promise<Lote | null>;
  buscarPorCodigo(proyectoId: number, codigo: string): Promise<Lote | null>;
  crear(proyectoId: number, datos: DatosLote): Promise<Lote>;
  actualizar(id: number, cambios: Partial<DatosLote>): Promise<Lote>;
  /**
   * Cambia el estado SOLO si el lote sigue en `estadoEsperado` (un único UPDATE
   * condicional). Devuelve false si otro usuario lo cambió antes: así se evita
   * que dos personas reserven o vendan el mismo lote al mismo tiempo.
   */
  cambiarEstadoSi(id: number, estadoEsperado: EstadoLote, nuevoEstado: EstadoLote): Promise<boolean>;
  contarPorEstado(): Promise<ConteoLotes[]>;
  tieneOperaciones(id: number): Promise<boolean>;
  eliminar(id: number): Promise<void>;
}

export interface DatosCliente {
  nombreCompleto: string;
  documento: string;
  telefono: string;
  email: string;
  direccion: string;
}

export interface RepositorioClientes {
  listar(busqueda?: string): Promise<Cliente[]>;
  buscarPorId(id: number): Promise<Cliente | null>;
  buscarPorDocumento(documento: string): Promise<Cliente | null>;
  crear(datos: DatosCliente): Promise<Cliente>;
  actualizar(id: number, cambios: Partial<DatosCliente>): Promise<Cliente>;
}

export interface FiltrosReservas {
  estado?: EstadoReserva;
  clienteId?: number;
  loteId?: number;
  proyectoId?: number;
}

export interface NuevaReserva {
  loteId: number;
  clienteId: number;
  asesorId: number;
  fecha: Date;
  fechaVencimiento: FechaISO | null;
  observacion: string;
}

export type EstadoFinalReserva = Exclude<EstadoReserva, 'ACTIVA'>;

export interface RepositorioReservas {
  listar(filtros?: FiltrosReservas): Promise<ReservaVista[]>;
  buscarPorId(id: number): Promise<ReservaVista | null>;
  buscarActivaPorLote(loteId: number): Promise<ReservaVista | null>;
  /** Reservas ACTIVAS cuya fecha de vencimiento es anterior a `hoy`. */
  listarActivasVencidas(hoy: FechaISO): Promise<Reserva[]>;
  crear(datos: NuevaReserva): Promise<Reserva>;
  finalizar(id: number, estado: EstadoFinalReserva, fecha: Date, motivo?: string): Promise<void>;
}

export interface FiltrosVentas {
  clienteId?: number;
  proyectoId?: number;
  loteId?: number;
  estado?: EstadoVenta;
}

export interface NuevaVenta {
  loteId: number;
  clienteId: number;
  asesorId: number;
  reservaId: number | null;
  fecha: Date;
  precioPactado: number;
  modalidad: ModalidadPago;
  cuotaInicial: number;
  numeroCuotas: number;
}

export interface RepositorioVentas {
  listar(filtros?: FiltrosVentas): Promise<VentaVista[]>;
  buscarPorId(id: number): Promise<VentaVista | null>;
  /** Crea la venta junto con sus cuotas. */
  crear(datos: NuevaVenta, cuotas: CuotaNueva[]): Promise<Venta & { cuotas: Cuota[] }>;
  anular(id: number, datos: { motivo: string; anuladaPorId: number; fecha: Date }): Promise<void>;
}

export interface NuevoPago {
  cuotaId: number;
  monto: number;
  metodo: MetodoPago;
  referencia: string;
  fecha: Date;
  registradoPorId: number;
}

export interface RepositorioPagos {
  buscarPorId(id: number): Promise<(Pago & { ventaId: number }) | null>;
  crear(datos: NuevoPago): Promise<Pago>;
  anular(id: number, datos: { motivo: string; anuladoPorId: number; fecha: Date }): Promise<void>;
}

export interface NuevoUsuario {
  nombre: string;
  email: string;
  passwordHash: string;
  rol: Rol;
  clienteId: number | null;
}

export interface RepositorioUsuarios {
  listar(): Promise<(Usuario & { cliente: Referencia | null })[]>;
  buscarPorId(id: number): Promise<Usuario | null>;
  buscarPorEmail(email: string): Promise<UsuarioConCredenciales | null>;
  buscarPorClienteId(clienteId: number): Promise<Usuario | null>;
  crear(datos: NuevoUsuario): Promise<Usuario>;
  actualizar(id: number, cambios: { activo?: boolean }): Promise<Usuario>;
}

export interface Repositorios {
  proyectos: RepositorioProyectos;
  lotes: RepositorioLotes;
  clientes: RepositorioClientes;
  reservas: RepositorioReservas;
  ventas: RepositorioVentas;
  pagos: RepositorioPagos;
  usuarios: RepositorioUsuarios;
}
