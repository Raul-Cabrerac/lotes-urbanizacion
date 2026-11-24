// Consigna §3 y §12: Publicación atómica de proyectos con puertos simulados (Incidencia #4).
import { describe, expect, it, vi } from 'vitest';
import { ProyectoServicio } from '../../../src/aplicacion/servicios/ProyectoServicio';
import { GEOMETRIA_LOTE, unidadDeTrabajoFalsa, usuarioAdmin, usuarioAsesor } from '../../apoyo/dobles';

const borrador = { id: 1, nombre: 'P', descripcion: '', ubicacion: 'SCZ', estado: 'BORRADOR' as const, limite: null };
const publicado = { ...borrador, estado: 'PUBLICADO' as const };

describe('ProyectoServicio', () => {
  describe('listar', () => {
    it('incluye proyectos BORRADOR y PUBLICADO para ADMIN junto al conteo de lotes por proyecto', async () => {
      // Arrange
      const repos = {
        proyectos: {
          listar: vi.fn().mockResolvedValue([borrador, { ...publicado, id: 2, nombre: 'Urubó' }]),
        },
        lotes: {
          contarPorEstado: vi.fn().mockResolvedValue([
            { proyectoId: 1, estado: 'DISPONIBLE', cantidad: 3 },
            { proyectoId: 1, estado: 'VENDIDO', cantidad: 2 },
            { proyectoId: 2, estado: 'RESERVADO', cantidad: 1 },
          ]),
        },
      };
      const servicio = new ProyectoServicio(unidadDeTrabajoFalsa(repos));
      // Act
      const resultado = await servicio.listar(usuarioAdmin);
      // Assert
      expect(repos.proyectos.listar).toHaveBeenCalledWith(['BORRADOR', 'PUBLICADO']);
      expect(resultado[0]).toMatchObject({
        id: 1,
        totalLotes: 5,
        lotesPorEstado: { DISPONIBLE: 3, RESERVADO: 0, VENDIDO: 2, BLOQUEADO: 0 },
      });
      expect(resultado[1]).toMatchObject({
        id: 2,
        totalLotes: 1,
        lotesPorEstado: { DISPONIBLE: 0, RESERVADO: 1, VENDIDO: 0, BLOQUEADO: 0 },
      });
    });

    it('consulta solo proyectos PUBLICADO cuando el usuario es ASESOR', async () => {
      // Arrange
      const repos = {
        proyectos: { listar: vi.fn().mockResolvedValue([publicado]) },
        lotes: { contarPorEstado: vi.fn().mockResolvedValue([]) },
      };
      const servicio = new ProyectoServicio(unidadDeTrabajoFalsa(repos));
      // Act
      const resultado = await servicio.listar(usuarioAsesor);
      // Assert
      expect(repos.proyectos.listar).toHaveBeenCalledWith(['PUBLICADO']);
      expect(resultado).toHaveLength(1);
      expect(resultado[0]?.totalLotes).toBe(0);
    });
  });

  describe('obtener', () => {
    it('devuelve el proyecto visible junto con el resumen calculado de sus lotes', async () => {
      // Arrange
      const repos = {
        proyectos: { buscarPorId: vi.fn().mockResolvedValue(publicado) },
        lotes: {
          listarPorProyecto: vi.fn().mockResolvedValue([
            { estado: 'DISPONIBLE', manzano: 'A', etapa: '1', superficieM2: 360, precio: 50000 },
            { estado: 'VENDIDO', manzano: 'B', etapa: '1', superficieM2: 400, precio: 60000 },
          ]),
        },
      };
      const servicio = new ProyectoServicio(unidadDeTrabajoFalsa(repos));
      // Act
      const resultado = await servicio.obtener(1, usuarioAsesor);
      // Assert
      expect(repos.lotes.listarPorProyecto).toHaveBeenCalledWith(1);
      expect(resultado.id).toBe(1);
      expect(resultado.resumen).toMatchObject({
        total: 2,
        superficieTotalM2: 760,
        valorDisponible: 50000,
        porEstado: { DISPONIBLE: 1, RESERVADO: 0, VENDIDO: 1, BLOQUEADO: 0 },
      });
    });

    it('lanza NO_ENCONTRADO sin consultar lotes cuando el proyecto no es visible para el usuario', async () => {
      // Arrange
      const repos = {
        proyectos: { buscarPorId: vi.fn().mockResolvedValue(borrador) },
        lotes: { listarPorProyecto: vi.fn() },
      };
      const servicio = new ProyectoServicio(unidadDeTrabajoFalsa(repos));
      // Act
      const consultar = () => servicio.obtener(1, usuarioAsesor);
      // Assert
      await expect(consultar()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
      expect(repos.lotes.listarPorProyecto).not.toHaveBeenCalled();
    });
  });

  describe('crear', () => {
    it('registra el nuevo proyecto delegando los datos al repositorio', async () => {
      // Arrange
      const entrada = { nombre: 'Las Palmeras', descripcion: 'Zona Norte', ubicacion: 'Santa Cruz' };
      const creado = { ...borrador, id: 4, ...entrada };
      const repos = {
        proyectos: { crear: vi.fn().mockResolvedValue(creado) },
      };
      const servicio = new ProyectoServicio(unidadDeTrabajoFalsa(repos));
      // Act
      const resultado = await servicio.crear(entrada);
      // Assert
      expect(repos.proyectos.crear).toHaveBeenCalledWith(entrada);
      expect(resultado).toEqual(creado);
    });
  });

  describe('actualizar', () => {
    it('actualiza los datos del proyecto cuando existe', async () => {
      // Arrange
      const actualizado = { ...borrador, nombre: 'Nombre Editado' };
      const repos = {
        proyectos: {
          buscarPorId: vi.fn().mockResolvedValue(borrador),
          actualizar: vi.fn().mockResolvedValue(actualizado),
        },
      };
      const servicio = new ProyectoServicio(unidadDeTrabajoFalsa(repos));
      // Act
      const resultado = await servicio.actualizar(1, { nombre: 'Nombre Editado' });
      // Assert
      expect(repos.proyectos.actualizar).toHaveBeenCalledWith(1, { nombre: 'Nombre Editado' });
      expect(resultado).toEqual(actualizado);
    });

    it('lanza NO_ENCONTRADO sin actualizar cuando el proyecto no existe', async () => {
      // Arrange
      const repos = {
        proyectos: {
          buscarPorId: vi.fn().mockResolvedValue(null),
          actualizar: vi.fn(),
        },
      };
      const servicio = new ProyectoServicio(unidadDeTrabajoFalsa(repos));
      // Act
      const actualizar = () => servicio.actualizar(999, { nombre: 'Otro' });
      // Assert
      await expect(actualizar()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
      expect(repos.proyectos.actualizar).not.toHaveBeenCalled();
    });
  });

  describe('definirLimite', () => {
    it('normaliza el polígono recibido y actualiza el perímetro del proyecto', async () => {
      // Arrange
      const conLimite = { ...borrador, limite: GEOMETRIA_LOTE };
      const repos = {
        proyectos: {
          buscarPorId: vi.fn().mockResolvedValue(borrador),
          actualizar: vi.fn().mockResolvedValue(conLimite),
        },
      };
      const servicio = new ProyectoServicio(unidadDeTrabajoFalsa(repos));
      // Act
      const resultado = await servicio.definirLimite(1, GEOMETRIA_LOTE);
      // Assert
      expect(repos.proyectos.actualizar).toHaveBeenCalledWith(1, {
        limite: expect.objectContaining({ type: 'Polygon' }),
      });
      expect(resultado).toEqual(conLimite);
    });

    it('permite quitar el perímetro guardando limite en null', async () => {
      // Arrange
      const repos = {
        proyectos: {
          buscarPorId: vi.fn().mockResolvedValue({ ...borrador, limite: GEOMETRIA_LOTE }),
          actualizar: vi.fn().mockResolvedValue(borrador),
        },
      };
      const servicio = new ProyectoServicio(unidadDeTrabajoFalsa(repos));
      // Act
      const resultado = await servicio.definirLimite(1, null);
      // Assert
      expect(repos.proyectos.actualizar).toHaveBeenCalledWith(1, { limite: null });
      expect(resultado.limite).toBeNull();
    });

    it('lanza GEOMETRIA_INVALIDA sin actualizar cuando el perímetro no es un polígono válido', async () => {
      // Arrange
      const repos = {
        proyectos: {
          buscarPorId: vi.fn().mockResolvedValue(borrador),
          actualizar: vi.fn(),
        },
      };
      const servicio = new ProyectoServicio(unidadDeTrabajoFalsa(repos));
      // Act
      const definir = () => servicio.definirLimite(1, { type: 'Point', coordinates: [-63.18, -17.78] });
      // Assert
      await expect(definir()).rejects.toMatchObject({ codigo: 'GEOMETRIA_INVALIDA' });
      expect(repos.proyectos.actualizar).not.toHaveBeenCalled();
    });

    it('lanza NO_ENCONTRADO sin actualizar cuando el proyecto no existe al definir límite', async () => {
      // Arrange
      const repos = {
        proyectos: {
          buscarPorId: vi.fn().mockResolvedValue(null),
          actualizar: vi.fn(),
        },
      };
      const servicio = new ProyectoServicio(unidadDeTrabajoFalsa(repos));
      // Act
      const definir = () => servicio.definirLimite(999, GEOMETRIA_LOTE);
      // Assert
      await expect(definir()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
      expect(repos.proyectos.actualizar).not.toHaveBeenCalled();
    });
  });

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

    it('lanza NO_ENCONTRADO sin listar lotes ni publicar cuando el proyecto no existe', async () => {
      // Arrange
      const repos = {
        proyectos: {
          bloquearPorId: vi.fn().mockResolvedValue(undefined),
          buscarPorId: vi.fn().mockResolvedValue(null),
          publicarSiBorrador: vi.fn(),
        },
        lotes: { listarPorProyecto: vi.fn() },
      };
      const servicio = new ProyectoServicio(unidadDeTrabajoFalsa(repos));
      // Act
      const publicar = () => servicio.publicar(999);
      // Assert
      await expect(publicar()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
      expect(repos.lotes.listarPorProyecto).not.toHaveBeenCalled();
      expect(repos.proyectos.publicarSiBorrador).not.toHaveBeenCalled();
    });

    it('lanza PROYECTO_YA_PUBLICADO sin ejecutar publicarSiBorrador cuando el proyecto ya estaba PUBLICADO', async () => {
      // Arrange
      const repos = {
        proyectos: {
          buscarPorId: vi.fn().mockResolvedValue(publicado),
          publicarSiBorrador: vi.fn(),
        },
        lotes: { listarPorProyecto: vi.fn().mockResolvedValue([{ id: 10 }]) },
      };
      const servicio = new ProyectoServicio(unidadDeTrabajoFalsa(repos));
      // Act
      const publicar = () => servicio.publicar(1);
      // Assert
      await expect(publicar()).rejects.toMatchObject({ codigo: 'PROYECTO_YA_PUBLICADO' });
      expect(repos.proyectos.publicarSiBorrador).not.toHaveBeenCalled();
    });
  });

  describe('buscarExistente', () => {
    it('devuelve el proyecto encontrado cuando existe', async () => {
      // Arrange
      const repos = {
        proyectos: { buscarPorId: vi.fn().mockResolvedValue(borrador) },
      };
      const servicio = new ProyectoServicio(unidadDeTrabajoFalsa(repos));
      // Act
      const resultado = await servicio.buscarExistente(1);
      // Assert
      expect(resultado).toEqual(borrador);
    });

    it('lanza NO_ENCONTRADO cuando el proyecto buscado no existe', async () => {
      // Arrange
      const repos = {
        proyectos: { buscarPorId: vi.fn().mockResolvedValue(null) },
      };
      const servicio = new ProyectoServicio(unidadDeTrabajoFalsa(repos));
      // Act
      const buscar = () => servicio.buscarExistente(999);
      // Assert
      await expect(buscar()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
    });
  });

  describe('buscarVisible', () => {
    it('permite ver un proyecto en BORRADOR cuando el usuario es ADMIN', async () => {
      // Arrange
      const repos = {
        proyectos: { buscarPorId: vi.fn().mockResolvedValue(borrador) },
      };
      const servicio = new ProyectoServicio(unidadDeTrabajoFalsa(repos));
      // Act
      const resultado = await servicio.buscarVisible(1, usuarioAdmin);
      // Assert
      expect(resultado).toEqual(borrador);
    });

    it('permite ver un proyecto PUBLICADO cuando el usuario es ASESOR', async () => {
      // Arrange
      const repos = {
        proyectos: { buscarPorId: vi.fn().mockResolvedValue(publicado) },
      };
      const servicio = new ProyectoServicio(unidadDeTrabajoFalsa(repos));
      // Act
      const resultado = await servicio.buscarVisible(1, usuarioAsesor);
      // Assert
      expect(resultado).toEqual(publicado);
    });

    it('lanza NO_ENCONTRADO cuando un ASESOR consulta un proyecto en BORRADOR', async () => {
      // Arrange
      const repos = {
        proyectos: { buscarPorId: vi.fn().mockResolvedValue(borrador) },
      };
      const servicio = new ProyectoServicio(unidadDeTrabajoFalsa(repos));
      // Act
      const buscar = () => servicio.buscarVisible(1, usuarioAsesor);
      // Assert
      await expect(buscar()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
    });
  });
});
