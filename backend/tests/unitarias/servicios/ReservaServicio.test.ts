// Consigna §5, §7 y §12: Vencimiento, cancelación y verificación de cambiarEstadoSi en reservas (Incidencia #5).
import { describe, expect, it, vi } from 'vitest';
import type { UnidadDeTrabajo, UsuarioActual } from '../../../src/aplicacion/puertos';
import { ReservaServicio } from '../../../src/aplicacion/servicios/ReservaServicio';
import { RelojFijo } from '../../../src/infraestructura/reloj';

const asesor = { id: 2, nombre: 'Laura Vargas', rol: 'ASESOR' } as UsuarioActual;
const fechaHoy = new Date('2026-03-15T12:00:00');

describe('ReservaServicio', () => {
  describe('cancelar', () => {
    it('vence la reserva, libera el lote y lanza RESERVA_NO_ACTIVA cuando ya pasó fechaVencimiento', async () => {
      // Arrange
      const reservaVencida = {
        id: 10,
        loteId: 5,
        clienteId: 7,
        asesorId: 2,
        fecha: new Date('2026-03-01T12:00:00'),
        fechaVencimiento: '2026-03-14',
        observacion: '',
        estado: 'ACTIVA' as const,
      };
      const repos = {
        reservas: {
          buscarPorId: vi.fn().mockResolvedValue(reservaVencida),
          finalizar: vi.fn().mockResolvedValue(true),
        },
        lotes: {
          cambiarEstadoSi: vi.fn().mockResolvedValue(true),
        },
      };
      const uow = { repos, transaccion: (trabajo: (r: typeof repos) => unknown) => trabajo(repos) };
      const servicio = new ReservaServicio(uow as unknown as UnidadDeTrabajo, new RelojFijo(fechaHoy));
      // Act + Assert
      await expect(servicio.cancelar(10, 'Cliente desiste', asesor)).rejects.toMatchObject({
        codigo: 'RESERVA_NO_ACTIVA',
      });
      expect(repos.reservas.finalizar).toHaveBeenCalledWith(10, 'VENCIDA', fechaHoy, 'Venció el plazo de la reserva');
      expect(repos.lotes.cambiarEstadoSi).toHaveBeenCalledWith(5, 'RESERVADO', 'DISPONIBLE');
    });

    it('lanza LOTE_MODIFICADO cuando cambiarEstadoSi devuelve false al cancelar', async () => {
      // Arrange
      const reservaVigente = {
        id: 10,
        loteId: 5,
        clienteId: 7,
        asesorId: 2,
        fecha: new Date('2026-03-10T12:00:00'),
        fechaVencimiento: '2026-03-20',
        observacion: '',
        estado: 'ACTIVA' as const,
      };
      const repos = {
        reservas: {
          buscarPorId: vi.fn().mockResolvedValue(reservaVigente),
          finalizar: vi.fn().mockResolvedValue(true),
        },
        lotes: {
          cambiarEstadoSi: vi.fn().mockResolvedValue(false),
        },
      };
      const uow = { repos, transaccion: (trabajo: (r: typeof repos) => unknown) => trabajo(repos) };
      const servicio = new ReservaServicio(uow as unknown as UnidadDeTrabajo, new RelojFijo(fechaHoy));
      // Act + Assert
      await expect(servicio.cancelar(10, 'Motivo válido', asesor)).rejects.toMatchObject({
        codigo: 'LOTE_MODIFICADO',
      });
    });
  });

  describe('procesarVencidas', () => {
    it('procesa cada reserva vencida en su propia transacción y revierte si cambiarEstadoSi devuelve false', async () => {
      // Arrange
      const repos = {
        reservas: {
          listarActivasVencidas: vi.fn().mockResolvedValue([
            { id: 1, loteId: 11, estado: 'ACTIVA', fechaVencimiento: '2026-03-14' },
            { id: 2, loteId: 12, estado: 'ACTIVA', fechaVencimiento: '2026-03-14' },
          ]),
          buscarPorId: vi
            .fn()
            .mockResolvedValueOnce({ id: 1, loteId: 11, estado: 'ACTIVA', fechaVencimiento: '2026-03-14' })
            .mockResolvedValueOnce({ id: 2, loteId: 12, estado: 'ACTIVA', fechaVencimiento: '2026-03-14' }),
          finalizar: vi.fn().mockResolvedValue(true),
        },
        lotes: {
          cambiarEstadoSi: vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false),
        },
      };
      const transaccion = vi.fn((trabajo: (r: typeof repos) => unknown) => trabajo(repos));
      const uow = { repos, transaccion };
      const servicio = new ReservaServicio(uow as unknown as UnidadDeTrabajo, new RelojFijo(fechaHoy));
      // Act + Assert
      await expect(servicio.procesarVencidas()).rejects.toMatchObject({ codigo: 'LOTE_MODIFICADO' });
      expect(transaccion).toHaveBeenCalledTimes(2);
    });
  });
});
