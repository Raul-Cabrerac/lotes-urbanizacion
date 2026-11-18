// Consigna §12: Servicio de pagos con puertos simulados y bloqueo de venta (Incidencia #3).
import { describe, expect, it, vi } from 'vitest';
import type { UnidadDeTrabajo, UsuarioActual } from '../../../src/aplicacion/puertos';
import { PagoServicio } from '../../../src/aplicacion/servicios/PagoServicio';
import type { VentaServicio } from '../../../src/aplicacion/servicios/VentaServicio';
import { RelojFijo } from '../../../src/infraestructura/reloj';

const admin = { id: 1, rol: 'ADMIN' } as UsuarioActual;
const fecha = new Date('2026-03-15T12:00:00');

describe('PagoServicio', () => {
  describe('anular', () => {
    it('bloquea la venta, valida estado VIGENTE y anula el pago cuando todo es válido', async () => {
      // Arrange
      const repos = {
        pagos: {
          buscarPorId: vi.fn().mockResolvedValue({ id: 9, cuotaId: 1, ventaId: 4, estado: 'VALIDO', monto: 5000 }),
          anular: vi.fn().mockResolvedValue(true),
        },
        ventas: {
          bloquearPorId: vi.fn().mockResolvedValue(undefined),
          buscarPorId: vi.fn().mockResolvedValue({ id: 4, estado: 'VIGENTE' }),
        },
      };
      const uow = { repos, transaccion: (trabajo: (r: typeof repos) => unknown) => trabajo(repos) };
      const ventas = { obtener: vi.fn().mockResolvedValue({ id: 4, estado: 'VIGENTE' }) };
      const servicio = new PagoServicio(
        uow as unknown as UnidadDeTrabajo,
        ventas as unknown as VentaServicio,
        new RelojFijo(fecha),
      );
      // Act
      await servicio.anular(9, 'Comprobante duplicado', admin);
      // Assert
      expect(repos.ventas.bloquearPorId).toHaveBeenCalledWith(4);
      expect(repos.pagos.anular).toHaveBeenCalledTimes(1);
      expect(ventas.obtener).toHaveBeenCalledWith(4, admin);
    });

    it('lanza VENTA_NO_VIGENTE y no anula el pago cuando la venta ya está ANULADA', async () => {
      // Arrange
      const repos = {
        pagos: {
          buscarPorId: vi.fn().mockResolvedValue({ id: 9, cuotaId: 1, ventaId: 4, estado: 'VALIDO', monto: 5000 }),
          anular: vi.fn(),
        },
        ventas: {
          bloquearPorId: vi.fn().mockResolvedValue(undefined),
          buscarPorId: vi.fn().mockResolvedValue({ id: 4, estado: 'ANULADA' }),
        },
      };
      const uow = { repos, transaccion: (trabajo: (r: typeof repos) => unknown) => trabajo(repos) };
      const ventas = { obtener: vi.fn() };
      const servicio = new PagoServicio(
        uow as unknown as UnidadDeTrabajo,
        ventas as unknown as VentaServicio,
        new RelojFijo(fecha),
      );
      // Act + Assert
      await expect(servicio.anular(9, 'Intento sobre anulada', admin)).rejects.toMatchObject({
        codigo: 'VENTA_NO_VIGENTE',
      });
      expect(repos.ventas.bloquearPorId).toHaveBeenCalledWith(4);
      expect(repos.pagos.anular).not.toHaveBeenCalled();
    });

    it('lanza PAGO_YA_ANULADO cuando el UPDATE condicional devuelve false por carrera', async () => {
      // Arrange
      const repos = {
        pagos: {
          buscarPorId: vi.fn().mockResolvedValue({ id: 9, cuotaId: 1, ventaId: 4, estado: 'VALIDO', monto: 5000 }),
          anular: vi.fn().mockResolvedValue(false),
        },
        ventas: {
          bloquearPorId: vi.fn().mockResolvedValue(undefined),
          buscarPorId: vi.fn().mockResolvedValue({ id: 4, estado: 'VIGENTE' }),
        },
      };
      const uow = { repos, transaccion: (trabajo: (r: typeof repos) => unknown) => trabajo(repos) };
      const ventas = { obtener: vi.fn() };
      const servicio = new PagoServicio(
        uow as unknown as UnidadDeTrabajo,
        ventas as unknown as VentaServicio,
        new RelojFijo(fecha),
      );
      // Act + Assert
      await expect(servicio.anular(9, 'Anulación concurrente', admin)).rejects.toMatchObject({
        codigo: 'PAGO_YA_ANULADO',
      });
    });
  });
});
