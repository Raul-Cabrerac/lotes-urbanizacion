// Consigna §5, §8 y §12: Manejo de reservas vencidas y anulación atómica en VentaServicio (Incidencia #5).
import { describe, expect, it, vi } from 'vitest';
import type { UnidadDeTrabajo, UsuarioActual } from '../../../src/aplicacion/puertos';
import { VentaServicio } from '../../../src/aplicacion/servicios/VentaServicio';
import { RelojFijo } from '../../../src/infraestructura/reloj';

const asesor = { id: 2, nombre: 'Laura Vargas', rol: 'ASESOR' } as UsuarioActual;
const admin = { id: 1, nombre: 'Rodrigo Aguilera', rol: 'ADMIN' } as UsuarioActual;
const fechaHoy = new Date('2026-03-15T12:00:00');

describe('VentaServicio', () => {
  describe('registrar', () => {
    it('vence la reserva expirada y vende el lote como DISPONIBLE a otro cliente', async () => {
      // Arrange
      const reservaVencida = {
        id: 20,
        loteId: 5,
        clienteId: 99,
        estado: 'ACTIVA' as const,
        fechaVencimiento: '2026-03-14',
      };
      const ventaCreada = {
        id: 30,
        loteId: 5,
        clienteId: 7,
        reservaId: null,
        precioPactado: 75000,
        modalidad: 'CONTADO' as const,
        estado: 'VIGENTE' as const,
        cuotas: [{ id: 1, numero: 0, monto: 75000, concepto: 'Pago al contado', fechaVencimiento: '2026-03-15' }],
        pagos: [{ id: 1, cuotaId: 1, monto: 75000, estado: 'VALIDO' as const }],
      };
      const repos = {
        lotes: {
          buscarPorId: vi.fn().mockResolvedValue({ id: 5, proyectoId: 1, codigo: 'A-01', estado: 'RESERVADO', precio: 75000 }),
          cambiarEstadoSi: vi.fn().mockResolvedValue(true),
        },
        clientes: { buscarPorId: vi.fn().mockResolvedValue({ id: 7 }) },
        proyectos: { buscarPorId: vi.fn().mockResolvedValue({ id: 1, estado: 'PUBLICADO' }) },
        reservas: {
          buscarActivaPorLote: vi.fn().mockResolvedValue(reservaVencida),
          finalizar: vi.fn().mockResolvedValue(true),
        },
        ventas: {
          crear: vi.fn().mockResolvedValue(ventaCreada),
          buscarPorId: vi.fn().mockResolvedValue(ventaCreada),
        },
        pagos: { crear: vi.fn().mockResolvedValue({ id: 1 }) },
      };
      const uow = { repos, transaccion: (trabajo: (r: typeof repos) => unknown) => trabajo(repos) };
      const servicio = new VentaServicio(uow as unknown as UnidadDeTrabajo, new RelojFijo(fechaHoy));
      // Act
      await servicio.registrar({ loteId: 5, clienteId: 7, modalidad: 'CONTADO' }, asesor);
      // Assert
      expect(repos.reservas.finalizar).toHaveBeenCalledWith(20, 'VENCIDA', fechaHoy, 'Venció el plazo de la reserva');
      expect(repos.lotes.cambiarEstadoSi).toHaveBeenNthCalledWith(1, 5, 'RESERVADO', 'DISPONIBLE');
      expect(repos.lotes.cambiarEstadoSi).toHaveBeenNthCalledWith(2, 5, 'DISPONIBLE', 'VENDIDO');
      expect(repos.ventas.crear).toHaveBeenCalledWith(expect.objectContaining({ reservaId: null }), expect.any(Array));
    });
  });

  describe('anular', () => {
    it('lanza LOTE_MODIFICADO cuando cambiarEstadoSi devuelve false al liberar el lote', async () => {
      // Arrange
      const repos = {
        ventas: {
          buscarPorId: vi.fn().mockResolvedValue({ id: 4, loteId: 5, estado: 'VIGENTE' }),
          anular: vi.fn().mockResolvedValue(true),
        },
        lotes: {
          cambiarEstadoSi: vi.fn().mockResolvedValue(false),
        },
      };
      const uow = { repos, transaccion: (trabajo: (r: typeof repos) => unknown) => trabajo(repos) };
      const servicio = new VentaServicio(uow as unknown as UnidadDeTrabajo, new RelojFijo(fechaHoy));
      // Act + Assert
      await expect(servicio.anular(4, 'Error en contrato', admin)).rejects.toMatchObject({
        codigo: 'LOTE_MODIFICADO',
      });
    });
  });
});
