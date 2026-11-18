// Consigna §3 y §12: Publicación atómica de proyectos con puertos simulados (Incidencia #4).
import { describe, expect, it, vi } from 'vitest';
import { ProyectoServicio } from '../../../src/aplicacion/servicios/ProyectoServicio';
import { unidadDeTrabajoFalsa } from '../../apoyo/dobles';

const borrador = { id: 1, nombre: 'P', descripcion: '', ubicacion: 'SCZ', estado: 'BORRADOR' as const, limite: null };

describe('ProyectoServicio', () => {
  describe('publicar', () => {
    it('publica el proyecto y lo devuelve cuando está en BORRADOR y tiene lotes', async () => {
      // Arrange
      const publicado = { ...borrador, estado: 'PUBLICADO' as const };
      const repos = {
        proyectos: {
          buscarPorId: vi.fn().mockResolvedValue(borrador),
          publicarSiBorrador: vi.fn().mockResolvedValue(publicado),
        },
        lotes: {
          listarPorProyecto: vi.fn().mockResolvedValue([{ id: 10 }]),
        },
      };
      const servicio = new ProyectoServicio(unidadDeTrabajoFalsa(repos));
      // Act
      const resultado = await servicio.publicar(1);
      // Assert
      expect(repos.proyectos.publicarSiBorrador).toHaveBeenCalledWith(1);
      expect(resultado).toEqual(publicado);
    });

    it('lanza PROYECTO_SIN_LOTES y no publica cuando el proyecto en BORRADOR no tiene lotes', async () => {
      // Arrange
      const repos = {
        proyectos: {
          buscarPorId: vi.fn().mockResolvedValue(borrador),
          publicarSiBorrador: vi.fn(),
        },
        lotes: {
          listarPorProyecto: vi.fn().mockResolvedValue([]),
        },
      };
      const servicio = new ProyectoServicio(unidadDeTrabajoFalsa(repos));
      // Act + Assert
      await expect(servicio.publicar(1)).rejects.toMatchObject({ codigo: 'PROYECTO_SIN_LOTES' });
      expect(repos.proyectos.publicarSiBorrador).not.toHaveBeenCalled();
    });

    it('lanza PROYECTO_YA_PUBLICADO cuando publicarSiBorrador devuelve null por carrera', async () => {
      // Arrange
      const repos = {
        proyectos: {
          buscarPorId: vi.fn().mockResolvedValue(borrador),
          publicarSiBorrador: vi.fn().mockResolvedValue(null),
        },
        lotes: {
          listarPorProyecto: vi.fn().mockResolvedValue([{ id: 10 }]),
        },
      };
      const servicio = new ProyectoServicio(unidadDeTrabajoFalsa(repos));
      // Act + Assert
      await expect(servicio.publicar(1)).rejects.toMatchObject({ codigo: 'PROYECTO_YA_PUBLICADO' });
    });
  });
});
