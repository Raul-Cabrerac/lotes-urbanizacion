/**
 * Conversión de filas de PostgreSQL (snake_case) a tipos del dominio (camelCase).
 *
 * Los `as` sobre estados, roles y métodos son seguros: los CHECK del esquema solo permiten esos
 * valores en la base de datos.
 */
import type {
  ClienteResumen,
  LoteResumen,
  PagoVista,
  ReservaVista,
} from '../../../aplicacion/puertos';
import type {
  Cliente,
  Cuota,
  EstadoLote,
  EstadoPago,
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
  Venta,
} from '../../../dominio/tipos';
import type {
  ColumnasCliente,
  ColumnasLote,
  FilaCliente,
  FilaCuota,
  FilaLote,
  FilaPago,
  FilaPagoVista,
  FilaProyecto,
  FilaReserva,
  FilaReservaVista,
  FilaUsuario,
  FilaVenta,
} from './filas';

export function aProyecto(f: FilaProyecto): Proyecto {
  return {
    id: f.id,
    nombre: f.nombre,
    descripcion: f.descripcion,
    ubicacion: f.ubicacion,
    estado: f.estado as EstadoProyecto,
    limite: f.limite,
    creadoEn: f.creado_en,
    actualizadoEn: f.actualizado_en,
  };
}

export function aLote(f: FilaLote): Lote {
  return {
    id: f.id,
    proyectoId: f.proyecto_id,
    codigo: f.codigo,
    manzano: f.manzano,
    etapa: f.etapa,
    superficieM2: f.superficie_m2,
    dimensiones: f.dimensiones,
    precio: f.precio,
    estado: f.estado as EstadoLote,
    geometria: f.geometria,
    creadoEn: f.creado_en,
    actualizadoEn: f.actualizado_en,
  };
}

export function aCliente(f: FilaCliente): Cliente {
  return {
    id: f.id,
    nombreCompleto: f.nombre_completo,
    documento: f.documento,
    telefono: f.telefono,
    email: f.email,
    direccion: f.direccion,
    creadoEn: f.creado_en,
  };
}

export function aUsuario(f: FilaUsuario): Usuario {
  return {
    id: f.id,
    nombre: f.nombre,
    email: f.email,
    rol: f.rol as Rol,
    activo: f.activo,
    clienteId: f.cliente_id,
    creadoEn: f.creado_en,
  };
}

export function aReserva(f: FilaReserva): Reserva {
  return {
    id: f.id,
    loteId: f.lote_id,
    clienteId: f.cliente_id,
    asesorId: f.asesor_id,
    fecha: f.fecha,
    fechaVencimiento: f.fecha_vencimiento,
    observacion: f.observacion,
    estado: f.estado as EstadoReserva,
    motivoFinalizacion: f.motivo_finalizacion,
    finalizadaEn: f.finalizada_en,
  };
}

export function aVenta(f: FilaVenta): Venta {
  return {
    id: f.id,
    loteId: f.lote_id,
    clienteId: f.cliente_id,
    asesorId: f.asesor_id,
    reservaId: f.reserva_id,
    fecha: f.fecha,
    precioPactado: f.precio_pactado,
    modalidad: f.modalidad as ModalidadPago,
    cuotaInicial: f.cuota_inicial,
    numeroCuotas: f.numero_cuotas,
    estado: f.estado as EstadoVenta,
    motivoAnulacion: f.motivo_anulacion,
    anuladaEn: f.anulada_en,
    anuladaPorId: f.anulada_por_id,
  };
}

export function aCuota(f: FilaCuota): Cuota {
  return {
    id: f.id,
    ventaId: f.venta_id,
    numero: f.numero,
    concepto: f.concepto,
    monto: f.monto,
    fechaVencimiento: f.fecha_vencimiento,
  };
}

export function aPago(f: FilaPago): Pago {
  return {
    id: f.id,
    cuotaId: f.cuota_id,
    monto: f.monto,
    metodo: f.metodo as MetodoPago,
    referencia: f.referencia,
    fecha: f.fecha,
    registradoPorId: f.registrado_por_id,
    estado: f.estado as EstadoPago,
    motivoAnulacion: f.motivo_anulacion,
    anuladoEn: f.anulado_en,
    anuladoPorId: f.anulado_por_id,
  };
}

export function aPagoVista(f: FilaPagoVista): PagoVista {
  return {
    ...aPago(f),
    cuotaNumero: f.cuota_numero,
    cuotaConcepto: f.cuota_concepto,
    registradoPor: { id: f.registrado_por_id, nombre: f.registrado_por_nombre },
    anuladoPor: f.anulado_por_id ? { id: f.anulado_por_id, nombre: f.anulado_por_nombre ?? '' } : null,
  };
}

export function aLoteResumen(f: ColumnasLote): LoteResumen {
  return {
    id: f.lote_id,
    codigo: f.l_codigo,
    manzano: f.l_manzano,
    etapa: f.l_etapa,
    superficieM2: f.l_superficie_m2,
    precio: f.l_precio,
    estado: f.l_estado as EstadoLote,
    geometria: f.l_geometria,
    proyecto: { id: f.p_id, nombre: f.p_nombre },
  };
}

export function aClienteResumen(f: ColumnasCliente & { cliente_id: number }): ClienteResumen {
  return {
    id: f.cliente_id,
    nombreCompleto: f.c_nombre_completo,
    documento: f.c_documento,
    telefono: f.c_telefono,
  };
}

export function aReservaVista(f: FilaReservaVista): ReservaVista {
  return {
    ...aReserva(f),
    lote: aLoteResumen(f),
    cliente: aClienteResumen(f),
    asesor: { id: f.asesor_id, nombre: f.a_nombre },
  };
}
