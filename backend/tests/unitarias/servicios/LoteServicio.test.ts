// Consigna §5 y §12: Actualización y eliminación transaccional de lotes (Incidencia #4).
import { describe, expect, it, vi } from 'vitest';
import { LoteServicio } from '../../../src/aplicacion/servicios/LoteServicio';
import type { ProyectoServicio } from '../../../src/aplicacion/servicios/ProyectoServicio';
import { GEOMETRIA_LOTE, relojEnHoy, unidadDeTrabajoFalsa } from '../../apoyo/dobles';

describe('LoteServicio', () => {
  describe('actualizar', () => {
    it('lanza LOTE_SIN_PRECIO y no actualiza cuando el lote está RESERVADO y se envía precio 0', async () => {
      // Arrange
      const repos = {
        lotes: {
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
            geometria: GEOMETRIA_LOTE,
          }),
          actualizar: vi.fn(),
        },
      };
      const servicio = new LoteServicio(unidadDeTrabajoFalsa(repos), {} as ProyectoServicio, relojEnHoy());
      // Act + Assert
      await expect(servicio.actualizar(5, { precio: 0 })).rejects.toMatchObject({ codigo: 'LOTE_SIN_PRECIO' });
      expect(repos.lotes.actualizar).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('lanza PROYECTO_PUBLICADO_SIN_LOTES y no elimina cuando es el único lote de un proyecto PUBLICADO', async () => {
      // Arrange
      const lote = { id: 5, proyectoId: 1, codigo: 'A-01', estado: 'DISPONIBLE', precio: 50000 };
      const repos = {
        proyectos: {
          buscarPorId: vi.fn().mockResolvedValue({ id: 1, estado: 'PUBLICADO' }),
        },
        lotes: {
          buscarPorId: vi.fn().mockResolvedValue(lote),
          tieneOperaciones: vi.fn().mockResolvedValue(false),
          listarPorProyecto: vi.fn().mockResolvedValue([lote]),
          eliminar: vi.fn(),
        },
      };
      const servicio = new LoteServicio(unidadDeTrabajoFalsa(repos), {} as ProyectoServicio, relojEnHoy());
      // Act + Assert
      await expect(servicio.eliminar(5)).rejects.toMatchObject({ codigo: 'PROYECTO_PUBLICADO_SIN_LOTES' });
      expect(repos.lotes.eliminar).not.toHaveBeenCalled();
    });
  });
});
