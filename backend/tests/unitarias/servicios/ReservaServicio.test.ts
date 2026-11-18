// Consigna §5, §7 y §12: Vencimiento, cancelación y verificación de cambiarEstadoSi en reservas (Incidencia #5).
import { describe, expect, it, vi } from 'vitest';
import { MOTIVO_VENCIMIENTO_RESERVA } from '../../../src/aplicacion/servicios/expirarReserva';
import { ReservaServicio } from '../../../src/aplicacion/servicios/ReservaServicio';
import {
  AYER,
  fechaEnDias,
  lotesYReservasEnMemoria,
  MANIANA,
  relojEnHoy,
  unidadDeTrabajoFalsa,
  usuarioAsesor,
} from '../../apoyo/dobles';

describe('ReservaServicio', () => {
  describe('crear', () => {
    it('lanza LOTE_NO_DISPONIBLE sin crear reserva cuando cambiarEstadoSi falla', async () => {
      // Arrange
      const repos = {
        lotes: {
          buscarPorId: vi.fn().mockResolvedValue({ id: 1, proyectoId: 1, codigo: 'A-01', estado: 'DISPONIBLE', precio: 45000 }),
          cambiarEstadoSi: vi.fn().mockResolvedValue(false), // otro usuario lo reservó un instante antes
        },
        clientes: { buscarPorId: vi.fn().mockResolvedValue({ id: 7 }) },
        proyectos: { buscarPorId: vi.fn().mockResolvedValue({ id: 1, estado: 'PUBLICADO' }) },
        reservas: { buscarActivaPorLote: vi.fn().mockResolvedValue(null), crear: vi.fn() },
      };
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act + Assert
      await expect(servicio.crear({ loteId: 1, clienteId: 7 }, usuarioAsesor)).rejects.toMatchObject({
        codigo: 'LOTE_NO_DISPONIBLE',
      });
      expect(repos.reservas.crear).not.toHaveBeenCalled();
    });
  });

  describe('cancelar', () => {
    it('vence la reserva, libera el lote y lanza RESERVA_NO_ACTIVA cuando ya pasó fechaVencimiento', async () => {
      // Arrange
      const memoria = lotesYReservasEnMemoria({
        lotes: [{ id: 5, proyectoId: 1, codigo: 'A-03', estado: 'RESERVADO', precio: 72000 }],
        reservas: [{ id: 10, loteId: 5, clienteId: 7, estado: 'ACTIVA', fechaVencimiento: AYER }],
      });
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(memoria.repos, memoria), relojEnHoy());
      // Act + Assert
      await expect(servicio.cancelar(10, 'Cliente desiste', usuarioAsesor)).rejects.toMatchObject({
        codigo: 'RESERVA_NO_ACTIVA',
      });
      // La cancelación falla, pero el vencimiento queda guardado: se confirmó en su propia transacción.
      expect(memoria.reserva(10)).toMatchObject({ estado: 'VENCIDA', motivoFinalizacion: MOTIVO_VENCIMIENTO_RESERVA });
      expect(memoria.lote(5)?.estado).toBe('DISPONIBLE');
    });

    it('cancela la reserva y libera el lote cuando la reserva vence hoy (2026-03-15)', async () => {
      // Arrange
      const memoria = lotesYReservasEnMemoria({
        lotes: [{ id: 5, proyectoId: 1, codigo: 'A-03', estado: 'RESERVADO', precio: 72000 }],
        reservas: [{ id: 10, loteId: 5, clienteId: 7, estado: 'ACTIVA', fechaVencimiento: fechaEnDias(0) }],
      });
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(memoria.repos, memoria), relojEnHoy());
      // Act
      await servicio.cancelar(10, 'Cliente desiste', usuarioAsesor);
      // Assert
      expect(memoria.reserva(10)).toMatchObject({ estado: 'CANCELADA', motivoFinalizacion: 'Cliente desiste' });
      expect(memoria.lote(5)?.estado).toBe('DISPONIBLE');
    });

    it('lanza LOTE_MODIFICADO cuando cambiarEstadoSi devuelve false al cancelar', async () => {
      // Arrange
      const reservaVigente = { id: 10, loteId: 5, clienteId: 7, estado: 'ACTIVA', fechaVencimiento: MANIANA };
      const repos = {
        reservas: {
          buscarPorId: vi.fn().mockResolvedValue(reservaVigente),
          finalizar: vi.fn().mockResolvedValue(true),
        },
        lotes: {
          cambiarEstadoSi: vi.fn().mockResolvedValue(false),
        },
      };
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act + Assert
      await expect(servicio.cancelar(10, 'Motivo válido', usuarioAsesor)).rejects.toMatchObject({
        codigo: 'LOTE_MODIFICADO',
      });
    });
  });

  describe('procesarVencidas', () => {
    it('omite la reserva cuyo lote ya no estaba RESERVADO y vence las demás', async () => {
      // Arrange: la primera reserva apunta a un lote inconsistente (otro usuario lo cambió)
      const memoria = lotesYReservasEnMemoria({
        lotes: [
          { id: 11, proyectoId: 1, codigo: 'A-01', estado: 'VENDIDO', precio: 78000 },
          { id: 12, proyectoId: 1, codigo: 'A-02', estado: 'RESERVADO', precio: 72000 },
        ],
        reservas: [
          { id: 1, loteId: 11, clienteId: 7, estado: 'ACTIVA', fechaVencimiento: AYER },
          { id: 2, loteId: 12, clienteId: 8, estado: 'ACTIVA', fechaVencimiento: AYER },
        ],
      });
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(memoria.repos, memoria), relojEnHoy());
      const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      // Act
      const vencidas = await servicio.procesarVencidas();
      // Assert
      expect(vencidas).toBe(1);
      expect(memoria.reserva(1)?.estado).toBe('ACTIVA');
      expect(memoria.lote(11)?.estado).toBe('VENDIDO');
      expect(memoria.reserva(2)?.estado).toBe('VENCIDA');
      expect(memoria.lote(12)?.estado).toBe('DISPONIBLE');
      expect(aviso).toHaveBeenCalledOnce();
      aviso.mockRestore();
    });
  });
});
