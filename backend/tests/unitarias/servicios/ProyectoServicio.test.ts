// Consigna §3 y §12: Publicación atómica de proyectos con puertos simulados (Incidencia #4).
import { describe, expect, it, vi } from 'vitest';
import type { UnidadDeTrabajo } from '../../../src/aplicacion/puertos';
import { ProyectoServicio } from '../../../src/aplicacion/servicios/ProyectoServicio';

describe('ProyectoServicio', () => {
  describe('publicar', () => {
    it('bloquea el proyecto y publica de forma condicional cuando está en BORRADOR y tiene lotes', async () => {
      // Arrange
      const borrador = { id: 1, nombre: 'P', descripcion: '', ubicacion: 'SCZ', estado: 'BORRADOR' as const, limite: null };
      const publicado = { ...borrador, estado: 'PUBLICADO' as const };
      const repos = {
        proyectos: {
          bloquearPorId: vi.fn().mockResolvedValue(undefined),
          buscarPorId: vi.fn().mockResolvedValue(borrador),
          publicarSiBorrador: vi.fn().mockResolvedValue(publicado),
        },
        lotes: {
          listarPorProyecto: vi.fn().mockResolvedValue([{ id: 10 }]),
        },
      };
      const uow = { repos, transaccion: (trabajo: (r: typeof repos) => unknown) => trabajo(repos) };
      const servicio = new ProyectoServicio(uow as unknown as UnidadDeTrabajo);
      // Act
      const resultado = await servicio.publicar(1);
      // Assert
      expect(resultado.estado).toBe('PUBLICADO');
      expect(repos.proyectos.bloquearPorId).toHaveBeenCalledWith(1);
      expect(repos.proyectos.publicarSiBorrador).toHaveBeenCalledWith(1);
    });

    it('lanza PROYECTO_YA_PUBLICADO cuando publicarSiBorrador devuelve null por carrera', async () => {
      // Arrange
      const borrador = { id: 1, nombre: 'P', descripcion: '', ubicacion: 'SCZ', estado: 'BORRADOR' as const, limite: null };
      const repos = {
        proyectos: {
          bloquearPorId: vi.fn().mockResolvedValue(undefined),
          buscarPorId: vi.fn().mockResolvedValue(borrador),
          publicarSiBorrador: vi.fn().mockResolvedValue(null),
        },
        lotes: {
          listarPorProyecto: vi.fn().mockResolvedValue([{ id: 10 }]),
        },
      };
      const uow = { repos, transaccion: (trabajo: (r: typeof repos) => unknown) => trabajo(repos) };
      const servicio = new ProyectoServicio(uow as unknown as UnidadDeTrabajo);
      // Act + Assert
      await expect(servicio.publicar(1)).rejects.toMatchObject({ codigo: 'PROYECTO_YA_PUBLICADO' });
    });
  });
});
