// Consigna §12: Servicio de pagos con puertos simulados y bloqueo de venta (Incidencia #3).
import { describe, expect, it, vi } from 'vitest';
import { PagoServicio } from '../../../src/aplicacion/servicios/PagoServicio';
import type { VentaServicio } from '../../../src/aplicacion/servicios/VentaServicio';
import { METODO_PAGO_POR_DEFECTO } from '../../../src/dominio/planPagos';
import { fechaEnDias, HOY, relojEnHoy, unidadDeTrabajoFalsa, usuarioAdmin, usuarioAsesor } from '../../apoyo/dobles';

const pagoValido = { id: 9, cuotaId: 1, ventaId: 4, estado: 'VALIDO', monto: 5000 };

const ventaConCuotas = (sobrescribir: Record<string, unknown> = {}) => ({
  id: 4,
  precioPactado: 6000,
  estado: 'VIGENTE' as const,
  cuotas: [
    { id: 1, numero: 0, concepto: 'Cuota inicial', monto: 2000, fechaVencimiento: fechaEnDias(0) },
    { id: 2, numero: 1, concepto: 'Cuota 1', monto: 2000, fechaVencimiento: '2026-04-15' },
    { id: 3, numero: 2, concepto: 'Cuota 2', monto: 2000, fechaVencimiento: '2026-05-15' },
  ],
  pagos: [{ id: 10, cuotaId: 1, monto: 2000, estado: 'VALIDO' as const }],
  ...sobrescribir,
});

describe('PagoServicio', () => {
  describe('registrar', () => {
    it('bloquea la venta, registra el pago con método y referencia recortada y devuelve la venta actualizada', async () => {
      // Arrange
      const ventaActualizada = { id: 4, estado: 'VIGENTE', resumen: { saldoPendiente: 2800 } };
      const repos = {
        ventas: {
          bloquearPorId: vi.fn().mockResolvedValue(undefined),
          buscarPorId: vi.fn().mockResolvedValue(ventaConCuotas()),
        },
        pagos: { crear: vi.fn().mockResolvedValue({ id: 21 }) },
      };
      const ventas = { obtener: vi.fn().mockResolvedValue(ventaActualizada) };
      const servicio = new PagoServicio(unidadDeTrabajoFalsa(repos), ventas as unknown as VentaServicio, relojEnHoy());
      // Act
      const resultado = await servicio.registrar(
        4,
        { cuotaId: 2, monto: 1200, metodo: 'TRANSFERENCIA', referencia: '  OP-123  ' },
        usuarioAsesor,
      );
      // Assert
      expect(repos.ventas.bloquearPorId).toHaveBeenCalledWith(4);
      expect(repos.pagos.crear).toHaveBeenCalledWith({
        cuotaId: 2,
        monto: 1200,
        metodo: 'TRANSFERENCIA',
        referencia: 'OP-123',
        fecha: HOY,
        registradoPorId: usuarioAsesor.id,
      });
      expect(ventas.obtener).toHaveBeenCalledWith(4, usuarioAsesor);
      expect(resultado).toEqual(ventaActualizada);
    });

    it('usa método EFECTIVO y referencia vacía por defecto sin contar pagos anulados en el saldo de la cuota', async () => {
      // Arrange
      const venta = ventaConCuotas({
        pagos: [
          { id: 10, cuotaId: 1, monto: 2000, estado: 'VALIDO' as const },
          { id: 11, cuotaId: 2, monto: 2000, estado: 'ANULADO' as const },
          { id: 12, cuotaId: 2, monto: 500, estado: 'VALIDO' as const },
        ],
      });
      const repos = {
        ventas: {
          bloquearPorId: vi.fn().mockResolvedValue(undefined),
          buscarPorId: vi.fn().mockResolvedValue(venta),
        },
        pagos: { crear: vi.fn().mockResolvedValue({ id: 22 }) },
      };
      const ventas = { obtener: vi.fn().mockResolvedValue({ id: 4, estado: 'VIGENTE' }) };
      const servicio = new PagoServicio(unidadDeTrabajoFalsa(repos), ventas as unknown as VentaServicio, relojEnHoy());
      // Act
      await servicio.registrar(4, { cuotaId: 2, monto: 1500 }, usuarioAsesor);
      // Assert
      expect(repos.pagos.crear).toHaveBeenCalledWith({
        cuotaId: 2,
        monto: 1500,
        metodo: METODO_PAGO_POR_DEFECTO,
        referencia: '',
        fecha: HOY,
        registradoPorId: usuarioAsesor.id,
      });
    });

    it('lanza NO_ENCONTRADO cuando la venta no existe al registrar un pago', async () => {
      // Arrange
      const repos = {
        ventas: { buscarPorId: vi.fn().mockResolvedValue(null) },
        pagos: { crear: vi.fn() },
      };
      const ventas = { obtener: vi.fn() };
      const servicio = new PagoServicio(unidadDeTrabajoFalsa(repos), ventas as unknown as VentaServicio, relojEnHoy());
      // Act
      const registrar = () => servicio.registrar(999, { cuotaId: 2, monto: 1000 }, usuarioAsesor);
      // Assert
      await expect(registrar()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
      expect(repos.pagos.crear).not.toHaveBeenCalled();
      expect(ventas.obtener).not.toHaveBeenCalled();
    });

    it('lanza NO_ENCONTRADO cuando la cuota indicada no pertenece a la venta', async () => {
      // Arrange
      const repos = {
        ventas: { buscarPorId: vi.fn().mockResolvedValue(ventaConCuotas()) },
        pagos: { crear: vi.fn() },
      };
      const ventas = { obtener: vi.fn() };
      const servicio = new PagoServicio(unidadDeTrabajoFalsa(repos), ventas as unknown as VentaServicio, relojEnHoy());
      // Act
      const registrar = () => servicio.registrar(4, { cuotaId: 999, monto: 1000 }, usuarioAsesor);
      // Assert
      await expect(registrar()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
      expect(repos.pagos.crear).not.toHaveBeenCalled();
      expect(ventas.obtener).not.toHaveBeenCalled();
    });

    it.each([
      ['VENTA_NO_VIGENTE', ventaConCuotas({ estado: 'ANULADA' }), 2, 1000],
      ['CUOTA_YA_PAGADA', ventaConCuotas(), 1, 500],
      ['MONTO_EXCEDE_CUOTA', ventaConCuotas(), 2, 2500],
      ['MONTO_INVALIDO', ventaConCuotas(), 2, 0],
    ] as const)('lanza %s sin crear el pago cuando falla validarPago', async (codigoEsperado, venta, cuotaId, monto) => {
      // Arrange
      const repos = {
        ventas: { buscarPorId: vi.fn().mockResolvedValue(venta) },
        pagos: { crear: vi.fn() },
      };
      const ventas = { obtener: vi.fn() };
      const servicio = new PagoServicio(unidadDeTrabajoFalsa(repos), ventas as unknown as VentaServicio, relojEnHoy());
      // Act
      const registrar = () => servicio.registrar(4, { cuotaId, monto }, usuarioAsesor);
      // Assert
      await expect(registrar()).rejects.toMatchObject({ codigo: codigoEsperado });
      expect(repos.pagos.crear).not.toHaveBeenCalled();
      expect(ventas.obtener).not.toHaveBeenCalled();
    });
  });

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

    it('lanza NO_ENCONTRADO sin bloquear venta ni anular cuando el pago no existe', async () => {
      // Arrange
      const repos = {
        pagos: { buscarPorId: vi.fn().mockResolvedValue(null), anular: vi.fn() },
        ventas: { bloquearPorId: vi.fn(), buscarPorId: vi.fn() },
      };
      const ventas = { obtener: vi.fn() };
      const servicio = new PagoServicio(unidadDeTrabajoFalsa(repos), ventas as unknown as VentaServicio, relojEnHoy());
      // Act
      const anular = () => servicio.anular(999, 'Motivo válido', usuarioAdmin);
      // Assert
      await expect(anular()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
      expect(repos.ventas.bloquearPorId).not.toHaveBeenCalled();
      expect(repos.pagos.anular).not.toHaveBeenCalled();
    });

    it.each([
      ['PAGO_YA_ANULADO', { ...pagoValido, estado: 'ANULADO' }, 'Motivo válido'],
      ['MOTIVO_REQUERIDO', pagoValido, 'Mal'],
    ] as const)('lanza %s sin persistir cambios cuando falla validarPagoAnulable', async (codigoEsperado, pago, motivo) => {
      // Arrange
      const repos = {
        pagos: { buscarPorId: vi.fn().mockResolvedValue(pago), anular: vi.fn() },
        ventas: {
          bloquearPorId: vi.fn().mockResolvedValue(undefined),
          buscarPorId: vi.fn().mockResolvedValue({ id: 4, estado: 'VIGENTE' }),
        },
      };
      const ventas = { obtener: vi.fn() };
      const servicio = new PagoServicio(unidadDeTrabajoFalsa(repos), ventas as unknown as VentaServicio, relojEnHoy());
      // Act
      const anular = () => servicio.anular(9, motivo, usuarioAdmin);
      // Assert
      await expect(anular()).rejects.toMatchObject({ codigo: codigoEsperado });
      expect(repos.pagos.anular).not.toHaveBeenCalled();
      expect(ventas.obtener).not.toHaveBeenCalled();
    });
  });
});
