// Consigna §3 y §12: Reglas de proyectos de urbanización: publicación, conteo y resumen de lotes.
import { describe, expect, it } from 'vitest';
import { ErrorConflicto } from '../../../src/dominio/errores';
import {
  conteoDelProyecto,
  conteoVacio,
  OPERACIONES_PROYECTO,
  proyectoYaPublicado,
  resumirLotes,
  validarProyectoPublicable,
} from '../../../src/dominio/proyecto';
import type { EstadoLote } from '../../../src/dominio/tipos';
import { admite } from '../../../src/dominio/transiciones';

const loteParaResumen = (
  estado: EstadoLote,
  etapa = 'Etapa 1',
  manzano = 'M1',
  superficieM2 = 300,
  precio = 50000,
) => ({ estado, etapa, manzano, superficieM2, precio });

describe('proyecto', () => {
  describe('OPERACIONES_PROYECTO', () => {
    it.each([
      ['BORRADOR', true],
      ['PUBLICADO', false],
    ] as const)('admite publicar cuando el proyecto está %s -> %s', (estado, esperado) => {
      // Arrange
      const transicion = OPERACIONES_PROYECTO.publicar;
      // Act
      const permitida = admite(transicion, estado);
      // Assert
      expect(permitida).toBe(esperado);
    });

    it('define PUBLICADO como estado destino de publicar', () => {
      // Arrange
      const transicion = OPERACIONES_PROYECTO.publicar;
      // Act
      const destino = transicion.a;
      // Assert
      expect(destino).toBe('PUBLICADO');
    });
  });

  describe('validarProyectoPublicable', () => {
    it('no lanza error cuando el proyecto está en BORRADOR y tiene múltiples lotes', () => {
      // Arrange
      const proyecto = { estado: 'BORRADOR' as const };
      // Act
      const validar = () => validarProyectoPublicable(proyecto, 5);
      // Assert
      expect(validar).not.toThrow();
    });

    it('no lanza error en el límite inferior cuando el proyecto está en BORRADOR y tiene 1 lote', () => {
      // Arrange
      const proyecto = { estado: 'BORRADOR' as const };
      // Act
      const validar = () => validarProyectoPublicable(proyecto, 1);
      // Assert
      expect(validar).not.toThrow();
    });

    it('lanza PROYECTO_SIN_LOTES cuando el proyecto está en BORRADOR y tiene 0 lotes', () => {
      // Arrange
      const proyecto = { estado: 'BORRADOR' as const };
      // Act
      const validar = () => validarProyectoPublicable(proyecto, 0);
      // Assert
      expect(validar).toThrow(
        expect.objectContaining({ codigo: 'PROYECTO_SIN_LOTES' }),
      );
    });

    it('lanza PROYECTO_YA_PUBLICADO cuando el proyecto ya está PUBLICADO', () => {
      // Arrange
      const proyecto = { estado: 'PUBLICADO' as const };
      // Act
      const validar = () => validarProyectoPublicable(proyecto, 3);
      // Assert
      expect(validar).toThrow(
        expect.objectContaining({ codigo: 'PROYECTO_YA_PUBLICADO' }),
      );
    });

    it('prioriza PROYECTO_YA_PUBLICADO sobre PROYECTO_SIN_LOTES cuando ya está PUBLICADO y tiene 0 lotes', () => {
      // Arrange
      const proyecto = { estado: 'PUBLICADO' as const };
      // Act
      const validar = () => validarProyectoPublicable(proyecto, 0);
      // Assert
      expect(validar).toThrow(
        expect.objectContaining({ codigo: 'PROYECTO_YA_PUBLICADO' }),
      );
    });
  });

  describe('proyectoYaPublicado', () => {
    it('devuelve un ErrorConflicto con código PROYECTO_YA_PUBLICADO', () => {
      // Arrange
      const construirError = proyectoYaPublicado;
      // Act
      const error = construirError();
      // Assert
      expect(error).toBeInstanceOf(ErrorConflicto);
      expect(error).toMatchObject({
        codigo: 'PROYECTO_YA_PUBLICADO',
        tipo: 'conflicto',
      });
    });
  });

  describe('conteoVacio', () => {
    it('inicializa los cuatro estados de lote en 0 en objetos independientes', () => {
      // Arrange
      const esperado = { DISPONIBLE: 0, RESERVADO: 0, VENDIDO: 0, BLOQUEADO: 0 };
      // Act
      const conteoA = conteoVacio();
      const conteoB = conteoVacio();
      // Assert
      expect(conteoA).toEqual(esperado);
      expect(conteoA).not.toBe(conteoB);
    });
  });

  describe('conteoDelProyecto', () => {
    it('devuelve total en 0 y todos los estados en 0 cuando la lista de conteos está vacía', () => {
      // Arrange
      const conteos: readonly { proyectoId: number; estado: EstadoLote; cantidad: number }[] = [];
      // Act
      const resultado = conteoDelProyecto(conteos, 1);
      // Assert
      expect(resultado).toEqual({
        total: 0,
        porEstado: { DISPONIBLE: 0, RESERVADO: 0, VENDIDO: 0, BLOQUEADO: 0 },
      });
    });

    it('devuelve total en 0 cuando los conteos pertenecen a otros proyectos', () => {
      // Arrange
      const conteos = [
        { proyectoId: 2, estado: 'DISPONIBLE' as const, cantidad: 8 },
        { proyectoId: 3, estado: 'VENDIDO' as const, cantidad: 4 },
      ];
      // Act
      const resultado = conteoDelProyecto(conteos, 1);
      // Assert
      expect(resultado).toEqual({
        total: 0,
        porEstado: { DISPONIBLE: 0, RESERVADO: 0, VENDIDO: 0, BLOQUEADO: 0 },
      });
    });

    it('filtra por proyectoId y suma los cuatro estados incluido BLOQUEADO', () => {
      // Arrange
      const conteos = [
        { proyectoId: 1, estado: 'DISPONIBLE' as const, cantidad: 10 },
        { proyectoId: 1, estado: 'RESERVADO' as const, cantidad: 3 },
        { proyectoId: 1, estado: 'VENDIDO' as const, cantidad: 5 },
        { proyectoId: 1, estado: 'BLOQUEADO' as const, cantidad: 2 },
        { proyectoId: 99, estado: 'DISPONIBLE' as const, cantidad: 50 },
      ];
      // Act
      const resultado = conteoDelProyecto(conteos, 1);
      // Assert
      expect(resultado).toEqual({
        total: 20,
        porEstado: { DISPONIBLE: 10, RESERVADO: 3, VENDIDO: 5, BLOQUEADO: 2 },
      });
    });
  });

  describe('resumirLotes', () => {
    it('devuelve resumen vacío cuando el proyecto no tiene lotes', () => {
      // Arrange
      const lotes: ReturnType<typeof loteParaResumen>[] = [];
      // Act
      const resumen = resumirLotes(lotes);
      // Assert
      expect(resumen).toEqual({
        total: 0,
        porEstado: { DISPONIBLE: 0, RESERVADO: 0, VENDIDO: 0, BLOQUEADO: 0 },
        superficieTotalM2: 0,
        valorDisponible: 0,
        etapas: [],
        manzanos: [],
        porManzano: [],
      });
    });

    it('suma superficieTotalM2 con precisión decimal y calcula valorDisponible solo con lotes DISPONIBLE', () => {
      // Arrange
      const lotes = [
        loteParaResumen('DISPONIBLE', '1', 'A', 100.1, 0.1),
        loteParaResumen('DISPONIBLE', '1', 'A', 200.2, 0.2),
        loteParaResumen('RESERVADO', '1', 'A', 150, 70000),
        loteParaResumen('VENDIDO', '1', 'A', 150, 80000),
        loteParaResumen('BLOQUEADO', '1', 'A', 150, 60000),
      ];
      // Act
      const resumen = resumirLotes(lotes);
      // Assert
      expect(resumen.total).toBe(5);
      expect(resumen.porEstado).toEqual({
        DISPONIBLE: 2,
        RESERVADO: 1,
        VENDIDO: 1,
        BLOQUEADO: 1,
      });
      expect(resumen.superficieTotalM2).toBe(750.3);
      expect(resumen.valorDisponible).toBe(0.3);
    });

    it('agrupa por etapa y manzano acumulando totales y ordenando numéricamente en español', () => {
      // Arrange
      const lotes = [
        loteParaResumen('VENDIDO', 'Etapa 10', 'M2', 300, 50000),
        loteParaResumen('DISPONIBLE', 'Etapa 2', 'M10', 300, 60000),
        loteParaResumen('RESERVADO', 'Etapa 2', 'M2', 300, 55000),
        loteParaResumen('DISPONIBLE', 'Etapa 2', 'M2', 300, 55000),
        loteParaResumen('BLOQUEADO', 'Etapa 1', 'M1', 300, 40000),
      ];
      // Act
      const resumen = resumirLotes(lotes);
      // Assert
      expect(resumen.etapas).toEqual(['Etapa 1', 'Etapa 2', 'Etapa 10']);
      expect(resumen.manzanos).toEqual(['M1', 'M2', 'M10']);
      expect(resumen.porManzano).toEqual([
        {
          etapa: 'Etapa 1',
          manzano: 'M1',
          total: 1,
          porEstado: { DISPONIBLE: 0, RESERVADO: 0, VENDIDO: 0, BLOQUEADO: 1 },
        },
        {
          etapa: 'Etapa 2',
          manzano: 'M2',
          total: 2,
          porEstado: { DISPONIBLE: 1, RESERVADO: 1, VENDIDO: 0, BLOQUEADO: 0 },
        },
        {
          etapa: 'Etapa 2',
          manzano: 'M10',
          total: 1,
          porEstado: { DISPONIBLE: 1, RESERVADO: 0, VENDIDO: 0, BLOQUEADO: 0 },
        },
        {
          etapa: 'Etapa 10',
          manzano: 'M2',
          total: 1,
          porEstado: { DISPONIBLE: 0, RESERVADO: 0, VENDIDO: 1, BLOQUEADO: 0 },
        },
      ]);
    });

    it('omite cadenas vacías en etapas y manzanos manteniendo el grupo en porManzano', () => {
      // Arrange
      const lotes = [
        loteParaResumen('DISPONIBLE', '', '', 250, 40000),
        loteParaResumen('DISPONIBLE', 'Etapa 1', 'A', 300, 50000),
      ];
      // Act
      const resumen = resumirLotes(lotes);
      // Assert
      expect(resumen.etapas).toEqual(['Etapa 1']);
      expect(resumen.manzanos).toEqual(['A']);
      expect(resumen.porManzano).toHaveLength(2);
    });
  });
});
