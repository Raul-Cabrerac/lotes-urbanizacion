import { describe, expect, it, vi } from 'vitest';
import type { UnidadDeTrabajo, UsuarioActual } from '../puertos';
import { RelojFijo } from '../../infraestructura/reloj';
import { ReservaServicio } from './ReservaServicio';

const usuarioAsesor: UsuarioActual = {
  id: 2,
  nombre: 'Asesor Prueba',
  email: 'asesor@lotes.bo',
  rol: 'ASESOR',
  clienteId: null,
  permisos: ['lotes:ver', 'reservas:gestionar', 'ventas:registrar', 'pagos:registrar'],
};

describe('ReservaServicio', () => {
  it('reserva un lote y cambia su estado a RESERVADO', async () => {
    const loteMock = {
      id: 3,
      proyectoId: 1,
      codigo: 'A-03',
      estado: 'DISPONIBLE' as const,
      precio: 72000,
    };

    const reservaCreada = {
      id: 50,
      loteId: 3,
      codigoLote: 'A-03',
      proyectoId: 1,
      nombreProyecto: 'Urbanizacion Los Jardines',
      clienteId: 12,
      nombreCliente: 'Cliente Prueba',
      documentoCliente: '7654321',
      asesorId: 2,
      nombreAsesor: 'Asesor Prueba',
      fecha: new Date('2026-03-01T10:00:00Z'),
      fechaVencimiento: '2026-03-08',
      observacion: '',
      estado: 'ACTIVA' as const,
      finalizadaPorId: null,
      motivoFinalizacion: null,
      fechaFinalizacion: null,
    };

    const repos = {
      lotes: {
        buscarPorId: vi.fn().mockResolvedValue(loteMock),
        cambiarEstadoSi: vi.fn().mockResolvedValue(true),
      },
      clientes: {
        buscarPorId: vi.fn().mockResolvedValue({ id: 12 }),
      },
      proyectos: {
        buscarPorId: vi.fn().mockResolvedValue({ id: 1, estado: 'PUBLICADO' }),
      },
      reservas: {
        crear: vi.fn().mockResolvedValue(reservaCreada),
        buscarPorId: vi.fn().mockResolvedValue(reservaCreada),
      },
    };

    const uow: UnidadDeTrabajo = {
      repos: repos as any,
      transaccion: vi.fn().mockImplementation(async (cb) => cb(repos)),
    };

    const reloj = new RelojFijo(new Date('2026-03-01T10:00:00Z'));
    const servicio = new ReservaServicio(uow, reloj);

    const resultado = await servicio.crear(
      {
        loteId: 3,
        clienteId: 12,
        fechaVencimiento: '2026-03-08',
      },
      usuarioAsesor,
    );

    expect(resultado.id).toBe(50);
    expect(repos.lotes.cambiarEstadoSi).toHaveBeenCalledWith(3, 'DISPONIBLE', 'RESERVADO');
  });

  it('rechaza la reserva si el lote ya fue reservado de forma simultanea', async () => {
    const repos = {
      lotes: {
        buscarPorId: vi.fn().mockResolvedValue({ id: 3, proyectoId: 1, codigo: 'A-03', estado: 'DISPONIBLE', precio: 72000 }),
        cambiarEstadoSi: vi.fn().mockResolvedValue(false),
      },
      clientes: {
        buscarPorId: vi.fn().mockResolvedValue({ id: 12 }),
      },
      proyectos: {
        buscarPorId: vi.fn().mockResolvedValue({ id: 1, estado: 'PUBLICADO' }),
      },
      reservas: {
        crear: vi.fn(),
      },
    };

    const uow: UnidadDeTrabajo = {
      repos: repos as any,
      transaccion: vi.fn().mockImplementation(async (cb) => cb(repos)),
    };

    const reloj = new RelojFijo(new Date('2026-03-01T10:00:00Z'));
    const servicio = new ReservaServicio(uow, reloj);

    await expect(
      servicio.crear(
        {
          loteId: 3,
          clienteId: 12,
          fechaVencimiento: '2026-03-08',
        },
        usuarioAsesor,
      ),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'LOTE_NO_DISPONIBLE' }));
  });

  it('cancela una reserva activa y libera el lote devolviendolo a DISPONIBLE', async () => {
    const reservaActiva = {
      id: 50,
      loteId: 3,
      codigoLote: 'A-03',
      estado: 'ACTIVA' as const,
    };

    const reservaCancelada = {
      ...reservaActiva,
      estado: 'CANCELADA' as const,
      motivoFinalizacion: 'Cliente desestimo la compra',
    };

    const repos = {
      reservas: {
        buscarPorId: vi.fn()
          .mockResolvedValueOnce(reservaActiva)
          .mockResolvedValueOnce(reservaCancelada),
        finalizar: vi.fn().mockResolvedValue(undefined),
      },
      lotes: {
        cambiarEstadoSi: vi.fn().mockResolvedValue(true),
      },
    };

    const uow: UnidadDeTrabajo = {
      repos: repos as any,
      transaccion: vi.fn().mockImplementation(async (cb) => cb(repos)),
    };

    const reloj = new RelojFijo(new Date('2026-03-02T10:00:00Z'));
    const servicio = new ReservaServicio(uow, reloj);

    const resultado = await servicio.cancelar(50, 'Cliente desestimo la compra', usuarioAsesor);

    expect(resultado.estado).toBe('CANCELADA');
    expect(repos.reservas.finalizar).toHaveBeenCalledWith(
      50,
      'CANCELADA',
      expect.any(Date),
      'Cliente desestimo la compra',
    );
    expect(repos.lotes.cambiarEstadoSi).toHaveBeenCalledWith(3, 'RESERVADO', 'DISPONIBLE');
  });

  it('procesa reservas vencidas y libera sus lotes correspondientes', async () => {
    const reservaVencida = {
      id: 60,
      loteId: 4,
      estado: 'ACTIVA' as const,
      fechaVencimiento: '2026-03-01',
    };

    const repos = {
      reservas: {
        listarActivasVencidas: vi.fn().mockResolvedValue([{ id: 60, loteId: 4 }]),
        buscarPorId: vi.fn().mockResolvedValue(reservaVencida),
        finalizar: vi.fn().mockResolvedValue(undefined),
      },
      lotes: {
        cambiarEstadoSi: vi.fn().mockResolvedValue(true),
      },
    };

    const uow: UnidadDeTrabajo = {
      repos: repos as any,
      transaccion: vi.fn().mockImplementation(async (cb) => cb(repos)),
    };

    const reloj = new RelojFijo(new Date('2026-03-05T10:00:00Z'));
    const servicio = new ReservaServicio(uow, reloj);

    const totalVencidas = await servicio.procesarVencidas();

    expect(totalVencidas).toBe(1);
    expect(repos.reservas.finalizar).toHaveBeenCalledWith(
      60,
      'VENCIDA',
      expect.any(Date),
      'Venció el plazo de la reserva',
    );
    expect(repos.lotes.cambiarEstadoSi).toHaveBeenCalledWith(4, 'RESERVADO', 'DISPONIBLE');
  });
});
