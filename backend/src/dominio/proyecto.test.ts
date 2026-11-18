import { describe, expect, it } from 'vitest';
import { conteoVacio, resumirLotes, validarProyectoPublicable } from './proyecto';

describe('proyecto', () => {
  describe('validarProyectoPublicable', () => {
    it('permite publicar un proyecto en borrador con al menos un lote', () => {
      expect(() => validarProyectoPublicable({ estado: 'BORRADOR' }, 5)).not.toThrow();
    });

    it('lanza PROYECTO_YA_PUBLICADO si el proyecto ya esta publicado', () => {
      expect(() => validarProyectoPublicable({ estado: 'PUBLICADO' }, 5)).toThrow(
        expect.objectContaining({ codigo: 'PROYECTO_YA_PUBLICADO' }),
      );
    });

    it('lanza PROYECTO_SIN_LOTES si la cantidad de lotes es 0', () => {
      expect(() => validarProyectoPublicable({ estado: 'BORRADOR' }, 0)).toThrow(
        expect.objectContaining({ codigo: 'PROYECTO_SIN_LOTES' }),
      );
    });
  });

  describe('resumirLotes y conteoVacio', () => {
    it('genera conteo en cero para todos los estados posibles', () => {
      const conteo = conteoVacio();
      expect(conteo.DISPONIBLE).toBe(0);
      expect(conteo.RESERVADO).toBe(0);
      expect(conteo.VENDIDO).toBe(0);
      expect(conteo.BLOQUEADO).toBe(0);
    });

    it('calcula totales, superficie y valor disponible agrupado por manzano y etapa', () => {
      const lotes = [
        { estado: 'DISPONIBLE' as const, manzano: 'M1', etapa: 'Etapa 1', superficieM2: 300, precio: 50000 },
        { estado: 'VENDIDO' as const, manzano: 'M1', etapa: 'Etapa 1', superficieM2: 350, precio: 60000 },
        { estado: 'DISPONIBLE' as const, manzano: 'M2', etapa: 'Etapa 2', superficieM2: 400, precio: 70000 },
      ];

      const resumen = resumirLotes(lotes);

      expect(resumen.total).toBe(3);
      expect(resumen.porEstado.DISPONIBLE).toBe(2);
      expect(resumen.porEstado.VENDIDO).toBe(1);
      expect(resumen.superficieTotalM2).toBe(1050);
      expect(resumen.valorDisponible).toBe(120000);
      expect(resumen.etapas).toEqual(['Etapa 1', 'Etapa 2']);
      expect(resumen.manzanos).toEqual(['M1', 'M2']);
      expect(resumen.porManzano).toHaveLength(2);
    });
  });
});
