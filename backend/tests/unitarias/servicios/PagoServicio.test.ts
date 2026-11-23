// Consigna §12: Servicio de pagos con puertos simulados y bloqueo de venta (Incidencia #3).
import { describe, expect, it, vi } from 'vitest';
import { PagoServicio } from '../../../src/aplicacion/servicios/PagoServicio';
import type { VentaServicio } from '../../../src/aplicacion/servicios/VentaServicio';
import { HOY, relojEnHoy, unidadDeTrabajoFalsa, usuarioAdmin } from '../../apoyo/dobles';

const pagoValido = { id: 9, cuotaId: 1, ventaId: 4, estado: 'VALIDO', monto: 5000 };

describe('PagoServicio', () => {
  describe('anular', () => {
    it('anula el pago guardando motivo, usuario y fecha, y devuelve la venta actualizada cuando la venta está VIGENTE', async () => {
      // Arrange
      const repos = {
        pagos: {
          buscarPorId: vi.fn().mockResolvedValue(pagoValido),
          anular: vi.fn().mockResolvedValue(true),
        },
        ventas: {
          buscarPorId: vi.fn().mockResolvedValue({ id: 4, estado: 'VIGENTE' }),
        },
      };
      const ventas = { obtener: vi.fn(async (id: number) => ({ id, estado: 'VIGENTE' })) };
      const servicio = new PagoServicio(unidadDeTrabajoFalsa(repos), ventas as unknown as VentaServicio, relojEnHoy());
      // Act
      const resultado = await servicio.anular(9, 'Comprobante duplicado', usuarioAdmin);
      // Assert
      expect(repos.pagos.anular).toHaveBeenCalledWith(9, {
        motivo: 'Comprobante duplicado',
        anuladoPorId: usuarioAdmin.id,
        fecha: HOY,
      });
      expect(resultado).toEqual({ id: 4, estado: 'VIGENTE' });
    });

    it('lanza VENTA_NO_VIGENTE y no anula el pago cuando la venta ya está ANULADA', async () => {
      // Arrange
      const repos = {
        pagos: {
          buscarPorId: vi.fn().mockResolvedValue(pagoValido),
          anular: vi.fn(),
        },
        ventas: {
          buscarPorId: vi.fn().mockResolvedValue({ id: 4, estado: 'ANULADA' }),
        },
      };
      const ventas = { obtener: vi.fn() };
      const servicio = new PagoServicio(unidadDeTrabajoFalsa(repos), ventas as unknown as VentaServicio, relojEnHoy());
      // Act + Assert
      await expect(servicio.anular(9, 'Intento sobre anulada', usuarioAdmin)).rejects.toMatchObject({
        codigo: 'VENTA_NO_VIGENTE',
      });
      expect(repos.pagos.anular).not.toHaveBeenCalled();
    });

    it('lanza PAGO_YA_ANULADO cuando el UPDATE condicional devuelve false por carrera', async () => {
      // Arrange
      const repos = {
        pagos: {
          buscarPorId: vi.fn().mockResolvedValue(pagoValido),
          anular: vi.fn().mockResolvedValue(false),
        },
        ventas: {
          buscarPorId: vi.fn().mockResolvedValue({ id: 4, estado: 'VIGENTE' }),
        },
      };
      const ventas = { obtener: vi.fn() };
      const servicio = new PagoServicio(unidadDeTrabajoFalsa(repos), ventas as unknown as VentaServicio, relojEnHoy());
      // Act + Assert
      await expect(servicio.anular(9, 'Anulación concurrente', usuarioAdmin)).rejects.toMatchObject({
        codigo: 'PAGO_YA_ANULADO',
      });
    });
  });
});
