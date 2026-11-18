// Consigna §5, §8 y §12: Manejo de reservas vencidas y anulación atómica en VentaServicio (Incidencia #5).
import { describe, expect, it, vi } from 'vitest';
import { MOTIVO_VENCIMIENTO_RESERVA } from '../../../src/aplicacion/servicios/expirarReserva';
import { VentaServicio } from '../../../src/aplicacion/servicios/VentaServicio';
import {
  AYER,
  lotesYReservasEnMemoria,
  relojEnHoy,
  unidadDeTrabajoFalsa,
  usuarioAdmin,
  usuarioAsesor,
} from '../../apoyo/dobles';

describe('VentaServicio', () => {
  describe('registrar', () => {
    it('vence la reserva expirada y vende el lote como DISPONIBLE a otro cliente', async () => {
      // Arrange
      const memoria = lotesYReservasEnMemoria({
        lotes: [{ id: 5, proyectoId: 1, codigo: 'A-01', estado: 'RESERVADO', precio: 75000 }],
        reservas: [{ id: 20, loteId: 5, clienteId: 99, estado: 'ACTIVA', fechaVencimiento: AYER }],
      });
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
        ...memoria.repos,
        clientes: { buscarPorId: vi.fn().mockResolvedValue({ id: 7 }) },
        proyectos: { buscarPorId: vi.fn().mockResolvedValue({ id: 1, estado: 'PUBLICADO' }) },
        ventas: {
          crear: vi.fn().mockResolvedValue(ventaCreada),
          buscarPorId: vi.fn().mockResolvedValue(ventaCreada),
        },
        pagos: { crear: vi.fn().mockResolvedValue({ id: 1 }) },
      };
      const servicio = new VentaServicio(unidadDeTrabajoFalsa(repos, memoria), relojEnHoy());
      // Act
      await servicio.registrar({ loteId: 5, clienteId: 7, modalidad: 'CONTADO' }, usuarioAsesor);
      // Assert
      expect(memoria.reserva(20)).toMatchObject({ estado: 'VENCIDA', motivoFinalizacion: MOTIVO_VENCIMIENTO_RESERVA });
      expect(memoria.lote(5)?.estado).toBe('VENDIDO');
      expect(repos.ventas.crear).toHaveBeenCalledWith(
        expect.objectContaining({ loteId: 5, clienteId: 7, reservaId: null, precioPactado: 75000 }),
        expect.any(Array),
      );
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
      const servicio = new VentaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act + Assert
      await expect(servicio.anular(4, 'Error en contrato', usuarioAdmin)).rejects.toMatchObject({
        codigo: 'LOTE_MODIFICADO',
      });
    });
  });
});
