// Consigna §5 y §12: Actualización y eliminación transaccional de lotes (Incidencia #4).
import { describe, expect, it, vi } from 'vitest';
import type { UnidadDeTrabajo } from '../../../src/aplicacion/puertos';
import { LoteServicio } from '../../../src/aplicacion/servicios/LoteServicio';
import type { ProyectoServicio } from '../../../src/aplicacion/servicios/ProyectoServicio';
import { rectanguloEnMetros } from '../../../src/dominio/geometria';
import { RelojFijo } from '../../../src/infraestructura/reloj';

const geo = rectanguloEnMetros([-63.18, -17.78], 0, 0, 12, 30);
const reloj = new RelojFijo(new Date('2026-03-15T12:00:00'));

describe('LoteServicio', () => {
  describe('actualizar', () => {
    it('lanza LOTE_SIN_PRECIO y no actualiza cuando el lote está RESERVADO y se envía precio 0', async () => {
      // Arrange
      const repos = {
        lotes: {
          bloquearPorId: vi.fn().mockResolvedValue(undefined),
          buscarPorId: vi.fn().mockResolvedValue({
            id: 5,
            proyectoId: 1,
            codigo: 'A-03',
            manzano: 'A',
            etapa: '1',
            superficieM2: 360,
            dimensiones: '12 x 30 m',
            precio: 72000,
            estado: 'RESERVADO',
            geometria: geo,
          }),
          actualizar: vi.fn(),
        },
      };
      const uow = { repos, transaccion: (trabajo: (r: typeof repos) => unknown) => trabajo(repos) };
      const servicio = new LoteServicio(uow as unknown as UnidadDeTrabajo, {} as ProyectoServicio, reloj);
      // Act + Assert
      await expect(servicio.actualizar(5, { precio: 0 })).rejects.toMatchObject({ codigo: 'LOTE_SIN_PRECIO' });
      expect(repos.lotes.bloquearPorId).toHaveBeenCalledWith(5);
      expect(repos.lotes.actualizar).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('lanza PROYECTO_PUBLICADO_SIN_LOTES y no elimina cuando es el único lote de un proyecto PUBLICADO', async () => {
      // Arrange
      const lote = { id: 5, proyectoId: 1, codigo: 'A-01', estado: 'DISPONIBLE', precio: 50000 };
      const repos = {
        proyectos: {
          bloquearPorId: vi.fn().mockResolvedValue(undefined),
          buscarPorId: vi.fn().mockResolvedValue({ id: 1, estado: 'PUBLICADO' }),
        },
        lotes: {
          bloquearPorId: vi.fn().mockResolvedValue(undefined),
          buscarPorId: vi.fn().mockResolvedValue(lote),
          tieneOperaciones: vi.fn().mockResolvedValue(false),
          listarPorProyecto: vi.fn().mockResolvedValue([lote]),
          eliminar: vi.fn(),
        },
      };
      const uow = { repos, transaccion: (trabajo: (r: typeof repos) => unknown) => trabajo(repos) };
      const servicio = new LoteServicio(uow as unknown as UnidadDeTrabajo, {} as ProyectoServicio, reloj);
      // Act + Assert
      await expect(servicio.eliminar(5)).rejects.toMatchObject({ codigo: 'PROYECTO_PUBLICADO_SIN_LOTES' });
      expect(repos.proyectos.bloquearPorId).toHaveBeenCalledWith(1);
      expect(repos.lotes.bloquearPorId).toHaveBeenCalledWith(5);
      expect(repos.lotes.eliminar).not.toHaveBeenCalled();
    });
  });
});
