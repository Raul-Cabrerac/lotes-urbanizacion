// Consigna §9, §10 y §12: Reporte general consolidado con cálculo de cobros, saldos y cuotas vencidas.
import { describe, expect, it, vi } from 'vitest';
import { ReporteServicio } from '../../../src/aplicacion/servicios/ReporteServicio';
import { ESTADOS_PROYECTO } from '../../../src/dominio/tipos';
import { AYER, fechaEnDias, HOY, MANIANA, relojEnHoy, unidadDeTrabajoFalsa } from '../../apoyo/dobles';

describe('ReporteServicio', () => {
  describe('resumenGeneral', () => {
    it('consolida lotes, reservas, cobros, saldos y cuotas vencidas por proyecto y totales generales', async () => {
      // Arrange
      const proyectos = [
        { id: 1, nombre: 'Los Jardines del Urubó', estado: 'PUBLICADO' as const },
        { id: 2, nombre: 'Las Palmeras', estado: 'BORRADOR' as const },
      ];
      const conteos = [
        { proyectoId: 1, estado: 'DISPONIBLE' as const, cantidad: 5 },
        { proyectoId: 1, estado: 'RESERVADO' as const, cantidad: 1 },
        { proyectoId: 1, estado: 'VENDIDO' as const, cantidad: 2 },
        { proyectoId: 2, estado: 'DISPONIBLE' as const, cantidad: 3 },
      ];
      const ventas = [
        {
          id: 10,
          precioPactado: 10000.1,
          lote: { proyecto: { id: 1 } },
          cuotas: [
            { id: 1, numero: 0, concepto: 'Cuota inicial', monto: 2000.1, fechaVencimiento: AYER },
            { id: 2, numero: 1, concepto: 'Cuota 1', monto: 4000, fechaVencimiento: AYER },
            { id: 3, numero: 2, concepto: 'Cuota 2', monto: 4000, fechaVencimiento: fechaEnDias(0) },
          ],
          pagos: [
            { id: 100, cuotaId: 1, monto: 2000.1, estado: 'VALIDO' as const },
            { id: 101, cuotaId: 2, monto: 1500, estado: 'VALIDO' as const },
            { id: 102, cuotaId: 2, monto: 2500, estado: 'ANULADO' as const },
          ],
        },
        {
          id: 11,
          precioPactado: 5000.2,
          lote: { proyecto: { id: 2 } },
          cuotas: [
            { id: 4, numero: 0, concepto: 'Pago al contado', monto: 5000.2, fechaVencimiento: MANIANA },
          ],
          pagos: [{ id: 103, cuotaId: 4, monto: 1000.2, estado: 'VALIDO' as const }],
        },
        {
          id: 12,
          precioPactado: 3000.1,
          lote: { proyecto: { id: 1 } },
          cuotas: [{ id: 5, numero: 0, concepto: 'Pago al contado', monto: 3000.1, fechaVencimiento: AYER }],
          pagos: [{ id: 104, cuotaId: 5, monto: 3000.1, estado: 'VALIDO' as const }],
        },
      ];
      const reservas = [
        { id: 20, lote: { proyecto: { id: 1 } } },
        { id: 21, lote: { proyecto: { id: 1 } } },
        { id: 22, lote: { proyecto: { id: 2 } } },
      ];
      const repos = {
        proyectos: { listar: vi.fn().mockResolvedValue(proyectos) },
        lotes: { contarPorEstado: vi.fn().mockResolvedValue(conteos) },
        ventas: { listar: vi.fn().mockResolvedValue(ventas) },
        reservas: { listar: vi.fn().mockResolvedValue(reservas) },
      };
      const servicio = new ReporteServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const reporte = await servicio.resumenGeneral();
      // Assert
      expect(repos.proyectos.listar).toHaveBeenCalledWith(ESTADOS_PROYECTO);
      expect(repos.ventas.listar).toHaveBeenCalledWith({ estado: 'VIGENTE' });
      expect(repos.reservas.listar).toHaveBeenCalledWith({ estado: 'ACTIVA' });
      expect(reporte.generadoEn).toEqual(HOY);
      expect(reporte.proyectos).toEqual([
        {
          proyecto: { id: 1, nombre: 'Los Jardines del Urubó', estado: 'PUBLICADO' },
          lotes: {
            total: 8,
            porEstado: { DISPONIBLE: 5, RESERVADO: 1, VENDIDO: 2, BLOQUEADO: 0 },
          },
          reservasActivas: 2,
          ventasVigentes: 2,
          montoVendido: 13000.2,
          totalCobrado: 6500.2,
          saldoPorCobrar: 6500,
          cuotasVencidas: 1,
          montoVencido: 2500,
        },
        {
          proyecto: { id: 2, nombre: 'Las Palmeras', estado: 'BORRADOR' },
          lotes: {
            total: 3,
            porEstado: { DISPONIBLE: 3, RESERVADO: 0, VENDIDO: 0, BLOQUEADO: 0 },
          },
          reservasActivas: 1,
          ventasVigentes: 1,
          montoVendido: 5000.2,
          totalCobrado: 1000.2,
          saldoPorCobrar: 4000,
          cuotasVencidas: 0,
          montoVencido: 0,
        },
      ]);
      expect(reporte.totales).toEqual({
        montoVendido: 18000.4,
        totalCobrado: 7500.4,
        saldoPorCobrar: 10500,
        montoVencido: 2500,
      });
    });

    it('devuelve totales en cero y lista vacía cuando no existen proyectos registrados', async () => {
      // Arrange
      const repos = {
        proyectos: { listar: vi.fn().mockResolvedValue([]) },
        lotes: { contarPorEstado: vi.fn().mockResolvedValue([]) },
        ventas: { listar: vi.fn().mockResolvedValue([]) },
        reservas: { listar: vi.fn().mockResolvedValue([]) },
      };
      const servicio = new ReporteServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const reporte = await servicio.resumenGeneral();
      // Assert
      expect(reporte).toEqual({
        generadoEn: HOY,
        proyectos: [],
        totales: {
          montoVendido: 0,
          totalCobrado: 0,
          saldoPorCobrar: 0,
          montoVencido: 0,
        },
      });
    });

    it('informa ceros en un proyecto sin lotes ni operaciones aunque existan movimientos en otro proyecto', async () => {
      // Arrange
      const repos = {
        proyectos: { listar: vi.fn().mockResolvedValue([{ id: 3, nombre: 'Proyecto Vacío', estado: 'BORRADOR' }]) },
        lotes: { contarPorEstado: vi.fn().mockResolvedValue([{ proyectoId: 99, estado: 'DISPONIBLE', cantidad: 4 }]) },
        ventas: {
          listar: vi.fn().mockResolvedValue([
            {
              id: 50,
              precioPactado: 75000,
              lote: { proyecto: { id: 99 } },
              cuotas: [{ id: 1, numero: 0, concepto: 'Contado', monto: 75000, fechaVencimiento: AYER }],
              pagos: [],
            },
          ]),
        },
        reservas: { listar: vi.fn().mockResolvedValue([{ id: 70, lote: { proyecto: { id: 99 } } }]) },
      };
      const servicio = new ReporteServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const reporte = await servicio.resumenGeneral();
      // Assert
      expect(reporte.proyectos).toEqual([
        {
          proyecto: { id: 3, nombre: 'Proyecto Vacío', estado: 'BORRADOR' },
          lotes: {
            total: 0,
            porEstado: { DISPONIBLE: 0, RESERVADO: 0, VENDIDO: 0, BLOQUEADO: 0 },
          },
          reservasActivas: 0,
          ventasVigentes: 0,
          montoVendido: 0,
          totalCobrado: 0,
          saldoPorCobrar: 0,
          cuotasVencidas: 0,
          montoVencido: 0,
        },
      ]);
      expect(reporte.totales).toEqual({
        montoVendido: 0,
        totalCobrado: 0,
        saldoPorCobrar: 0,
        montoVencido: 0,
      });
    });

    it('propaga el error cuando falla alguna consulta de repositorio al construir el reporte', async () => {
      // Arrange
      const errorBd = new Error('Fallo al consultar ventas');
      const repos = {
        proyectos: { listar: vi.fn().mockResolvedValue([]) },
        lotes: { contarPorEstado: vi.fn().mockResolvedValue([]) },
        ventas: { listar: vi.fn().mockRejectedValue(errorBd) },
        reservas: { listar: vi.fn().mockResolvedValue([]) },
      };
      const servicio = new ReporteServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const generar = () => servicio.resumenGeneral();
      // Assert
      await expect(generar()).rejects.toBe(errorBd);
    });
  });
});
