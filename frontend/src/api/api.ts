/** Funciones para cada endpoint de la API REST. */
import { consulta, pedir } from './http';
import type {
  Cliente,
  EstadoLote,
  EstadoReserva,
  EstadoVenta,
  Lote,
  LoteDetalle,
  MetodoPago,
  Modalidad,
  Poligono,
  Proyecto,
  ProyectoDetalle,
  ProyectoListado,
  Rol,
  Usuario,
} from './tipos';
import type {
  ClienteDetalle,
  CuotaSimulada,
  PortalCliente,
  Reporte,
  Reserva,
  ResultadoImportacion,
  UsuarioListado,
  Venta,
} from './tiposOperaciones';

export interface DatosProyecto {
  nombre: string;
  descripcion: string;
  ubicacion: string;
}

export interface DatosLote {
  codigo: string;
  manzano: string;
  etapa: string;
  precio: number;
  superficieM2?: number | null;
  dimensiones?: string;
  geometria?: Poligono;
}

export interface FiltrosLotes {
  estado?: EstadoLote | '';
  manzano?: string;
  etapa?: string;
  q?: string;
}

export interface DatosCliente {
  nombreCompleto: string;
  documento: string;
  telefono: string;
  email: string;
  direccion: string;
}

export interface DatosVenta {
  loteId: number;
  clienteId: number;
  modalidad: Modalidad;
  precioPactado?: number;
  cuotaInicial?: number;
  numeroCuotas?: number;
  fechaPrimeraCuota?: string;
  metodoPago?: MetodoPago;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      pedir<{ token: string; usuario: Usuario }>('POST', '/auth/login', { email, password }),
    yo: () => pedir<Usuario>('GET', '/auth/yo'),
  },

  proyectos: {
    listar: () => pedir<ProyectoListado[]>('GET', '/proyectos'),
    obtener: (id: number) => pedir<ProyectoDetalle>('GET', `/proyectos/${id}`),
    crear: (datos: DatosProyecto) => pedir<Proyecto>('POST', '/proyectos', datos),
    actualizar: (id: number, datos: DatosProyecto) => pedir<Proyecto>('PUT', `/proyectos/${id}`, datos),
    publicar: (id: number) => pedir<Proyecto>('POST', `/proyectos/${id}/publicar`),
    definirLimite: (id: number, geometria: Poligono | null) => pedir<Proyecto>('PUT', `/proyectos/${id}/limite`, { geometria }),
    lotes: (id: number, filtros: FiltrosLotes = {}) =>
      pedir<Lote[]>('GET', `/proyectos/${id}/lotes${consulta({ ...filtros })}`),
    crearLote: (id: number, datos: DatosLote) => pedir<Lote>('POST', `/proyectos/${id}/lotes`, datos),
    importarKml: (id: number, datos: { kml: string; precioPorDefecto?: number; manzanoPorDefecto?: string; etapaPorDefecto?: string }) =>
      pedir<ResultadoImportacion>('POST', `/proyectos/${id}/lotes/importar-kml`, datos),
  },

  lotes: {
    obtener: (id: number) => pedir<LoteDetalle>('GET', `/lotes/${id}`),
    actualizar: (id: number, datos: Partial<DatosLote>) => pedir<Lote>('PUT', `/lotes/${id}`, datos),
    cambiarEstado: (id: number, estado: EstadoLote) => pedir<Lote>('PATCH', `/lotes/${id}/estado`, { estado }),
    eliminar: (id: number) => pedir<void>('DELETE', `/lotes/${id}`),
    analizarGeometria: (geometria: Poligono) =>
      pedir<{ superficieM2: number; dimensiones: string }>('POST', '/lotes/analizar-geometria', { geometria }),
  },

  clientes: {
    listar: (q?: string) => pedir<Cliente[]>('GET', `/clientes${consulta({ q })}`),
    obtener: (id: number) => pedir<ClienteDetalle>('GET', `/clientes/${id}`),
    crear: (datos: DatosCliente) => pedir<Cliente>('POST', '/clientes', datos),
    actualizar: (id: number, datos: DatosCliente) => pedir<Cliente>('PUT', `/clientes/${id}`, datos),
  },

  reservas: {
    listar: (filtros: { estado?: EstadoReserva | ''; proyectoId?: number; clienteId?: number } = {}) =>
      pedir<Reserva[]>('GET', `/reservas${consulta(filtros)}`),
    crear: (datos: { loteId: number; clienteId: number; fechaVencimiento?: string | null; observacion?: string }) =>
      pedir<Reserva>('POST', '/reservas', datos),
    cancelar: (id: number, motivo: string) => pedir<Reserva>('POST', `/reservas/${id}/cancelar`, { motivo }),
  },

  ventas: {
    listar: (filtros: { estado?: EstadoVenta | ''; proyectoId?: number | ''; clienteId?: number | '' } = {}) =>
      pedir<Venta[]>('GET', `/ventas${consulta(filtros)}`),
    obtener: (id: number) => pedir<Venta>('GET', `/ventas/${id}`),
    simularPlan: (datos: Omit<DatosVenta, 'loteId' | 'clienteId' | 'metodoPago'> & { precioPactado: number }) =>
      pedir<CuotaSimulada[]>('POST', '/ventas/simular-plan', datos),
    registrar: (datos: DatosVenta) => pedir<Venta>('POST', '/ventas', datos),
    anular: (id: number, motivo: string) => pedir<Venta>('POST', `/ventas/${id}/anular`, { motivo }),
    registrarPago: (id: number, datos: { cuotaId: number; monto: number; metodo: MetodoPago; referencia: string }) =>
      pedir<Venta>('POST', `/ventas/${id}/pagos`, datos),
  },

  pagos: {
    anular: (id: number, motivo: string) => pedir<Venta>('POST', `/pagos/${id}/anular`, { motivo }),
  },

  usuarios: {
    listar: () => pedir<UsuarioListado[]>('GET', '/usuarios'),
    crear: (datos: { nombre: string; email: string; password: string; rol: Rol; clienteId?: number | null }) =>
      pedir<UsuarioListado>('POST', '/usuarios', datos),
    cambiarActivo: (id: number, activo: boolean) => pedir<UsuarioListado>('PATCH', `/usuarios/${id}`, { activo }),
  },

  portal: {
    misOperaciones: () => pedir<PortalCliente>('GET', '/portal/mis-operaciones'),
  },

  reportes: {
    resumen: () => pedir<Reporte>('GET', '/reportes/resumen'),
  },
};
