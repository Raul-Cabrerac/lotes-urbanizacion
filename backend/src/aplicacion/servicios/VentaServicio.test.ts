import { describe, expect, it, vi } from 'vitest';
import type { UnidadDeTrabajo, UsuarioActual, VentaVista } from '../puertos';
import { RelojFijo } from '../../infraestructura/reloj';
import { VentaServicio } from './VentaServicio';

const usuarioAsesor: UsuarioActual = {
  id: 2,
  nombre: 'Asesor Prueba',
  email: 'asesor@lotes.bo',
  rol: 'ASESOR',
  clienteId: null,
  permisos: ['lotes:ver', 'reservas:gestionar', 'ventas:registrar', 'pagos:registrar'],
};

describe('VentaServicio', () => {
  it('conserva el precio pactado al registrar una venta aunque el precio del lote cambie despues', async () => {
    const loteMock = {
      id: 5,
      proyectoId: 1,
      codigo: 'A-05',
      estado: 'DISPONIBLE' as const,
      precio: 75000,
    };

    const clienteMock = {
      id: 10,
      nombre: 'Cliente Prueba',
    };

    const proyectoMock = {
      id: 1,
      estado: 'PUBLICADO' as const,
    };

    const ventaGuardada: VentaVista = {
      id: 100,
      loteId: 5,
      clienteId: 10,
      asesorId: 2,
      reservaId: null,
      fecha: new Date('2026-03-01T10:00:00Z'),
      precioPactado: 75000,
      modalidad: 'CONTADO',
      cuotaInicial: 0,
      numeroCuotas: 0,
      estado: 'VIGENTE',
      motivoAnulacion: null,
      anuladaEn: null,
      anuladaPorId: null,
      lote: {
        id: 5,
        codigo: 'A-05',
        manzano: 'A',
        etapa: '1',
        superficieM2: 300,
        precio: 75000,
        estado: 'VENDIDO',
        geometria: {
          type: 'Polygon',
          coordinates: [
            [
              [-63.18, -17.78],
              [-63.17, -17.78],
              [-63.17, -17.77],
              [-63.18, -17.78],
            ],
          ],
        },
        proyecto: { id: 1, nombre: 'Urbanizacion' },
      },
      cliente: {
        id: 10,
        nombreCompleto: 'Cliente Prueba',
        documento: '1234567',
        telefono: '70000000',
      },
      asesor: { id: 2, nombre: 'Asesor Prueba' },
      anuladaPor: null,
      cuotas: [
        {
          id: 1,
          ventaId: 100,
          numero: 0,
          concepto: 'Pago al contado',
          monto: 75000,
          fechaVencimiento: '2026-03-01',
        },
      ],
      pagos: [
        {
          id: 1,
          cuotaId: 1,
          cuotaNumero: 0,
          cuotaConcepto: 'Pago al contado',
          monto: 75000,
          metodo: 'EFECTIVO',
          referencia: 'Cobrado al registrar la venta',
          fecha: new Date('2026-03-01T10:00:00Z'),
          estado: 'VALIDO',
          registradoPorId: 2,
          registradoPor: { id: 2, nombre: 'Asesor Prueba' },
          anuladoPorId: null,
          anuladoPor: null,
          motivoAnulacion: null,
          anuladoEn: null,
        },
      ],
    };

    const repos = {
      lotes: {
        buscarPorId: vi.fn().mockResolvedValue(loteMock),
        cambiarEstadoSi: vi.fn().mockResolvedValue(true),
      },
      clientes: {
        buscarPorId: vi.fn().mockResolvedValue(clienteMock),
      },
      proyectos: {
        buscarPorId: vi.fn().mockResolvedValue(proyectoMock),
      },
      reservas: {
        buscarActivaPorLote: vi.fn().mockResolvedValue(null),
        finalizar: vi.fn(),
      },
      ventas: {
        crear: vi.fn().mockResolvedValue(ventaGuardada),
        buscarPorId: vi.fn().mockResolvedValue(ventaGuardada),
      },
      pagos: {
        crear: vi.fn().mockResolvedValue({ id: 1 }),
      },
    };

    const uow: UnidadDeTrabajo = {
      repos: repos as any,
      transaccion: vi.fn().mockImplementation(async (cb) => cb(repos)),
    };

    const reloj = new RelojFijo(new Date('2026-03-01T10:00:00Z'));
    const servicio = new VentaServicio(uow, reloj);

    const resultado = await servicio.registrar(
      {
        loteId: 5,
        clienteId: 10,
        modalidad: 'CONTADO',
        precioPactado: 75000,
      },
      usuarioAsesor,
    );

    expect(resultado.precioPactado).toBe(75000);
    expect(repos.lotes.cambiarEstadoSi).toHaveBeenCalledWith(5, 'DISPONIBLE', 'VENDIDO');

    loteMock.precio = 90000;
    const resultadoPosterior = await servicio.obtener(100, usuarioAsesor);
    expect(resultadoPosterior.precioPactado).toBe(75000);
  });

  it('rechaza la venta si el lote fue modificado por otro usuario de forma concurrente', async () => {
    const repos = {
      lotes: {
        buscarPorId: vi.fn().mockResolvedValue({ id: 5, proyectoId: 1, codigo: 'A-05', estado: 'DISPONIBLE', precio: 75000 }),
        cambiarEstadoSi: vi.fn().mockResolvedValue(false),
      },
      clientes: {
        buscarPorId: vi.fn().mockResolvedValue({ id: 10 }),
      },
      proyectos: {
        buscarPorId: vi.fn().mockResolvedValue({ id: 1, estado: 'PUBLICADO' }),
      },
      reservas: {
        buscarActivaPorLote: vi.fn().mockResolvedValue(null),
      },
      ventas: {
        crear: vi.fn(),
      },
      pagos: {
        crear: vi.fn(),
      },
    };

    const uow: UnidadDeTrabajo = {
      repos: repos as any,
      transaccion: vi.fn().mockImplementation(async (cb) => cb(repos)),
    };

    const reloj = new RelojFijo(new Date('2026-03-01T10:00:00Z'));
    const servicio = new VentaServicio(uow, reloj);

    await expect(
      servicio.registrar(
        {
          loteId: 5,
          clienteId: 10,
          modalidad: 'CONTADO',
        },
        usuarioAsesor,
      ),
    ).rejects.toThrow(expect.objectContaining({ codigo: 'LOTE_NO_DISPONIBLE' }));
  });
});
