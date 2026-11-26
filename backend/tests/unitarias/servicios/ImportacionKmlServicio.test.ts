// Consigna §4, §11 y §12: Importación atómica todo o nada desde archivos KML.
import { describe, expect, it, vi } from 'vitest';
import type { LectorKml, PlacemarkKml } from '../../../src/aplicacion/puertos';
import { ImportacionKmlServicio } from '../../../src/aplicacion/servicios/ImportacionKmlServicio';
import type { ProyectoServicio } from '../../../src/aplicacion/servicios/ProyectoServicio';
import { ErrorNoEncontrado, ErrorReglaNegocio } from '../../../src/dominio/errores';
import { rectanguloEnMetros } from '../../../src/dominio/geometria';
import { GEOMETRIA_LOTE, unidadDeTrabajoFalsa } from '../../apoyo/dobles';

const placemark = (sobrescribir: Partial<PlacemarkKml> = {}): PlacemarkKml => ({
  nombre: 'A-01',
  propiedades: {},
  geometria: GEOMETRIA_LOTE,
  ...sobrescribir,
});

/** Un lote vecino de GEOMETRIA_LOTE: comparte un lado con él y no lo pisa. */
const GEOMETRIA_VECINA = rectanguloEnMetros([-63.18, -17.78], 12, 0, 12, 30);

const loteCreado = (id: number, codigo: string) => ({
  id,
  proyectoId: 1,
  codigo,
  manzano: 'A',
  etapa: '1',
  superficieM2: 360,
  dimensiones: '12 x 30 m',
  precio: 75000,
  estado: 'DISPONIBLE' as const,
  geometria: GEOMETRIA_LOTE,
});

describe('ImportacionKmlServicio', () => {
  describe('importar', () => {
    it('importa lotes desde ExtendedData y por defecto, guarda el límite y omite elementos sin polígono', async () => {
      // Arrange
      const placemarks: PlacemarkKml[] = [
        placemark({ nombre: 'Contorno', propiedades: { tipo: 'limite' } }),
        placemark({
          nombre: 'Ignorado si viene código',
          propiedades: {
            codigo: 'a-01',
            manzano: 'A',
            etapa: '1',
            precio: '75000.50',
            superficie: '400',
            dimensiones: '10 x 40 m',
          },
        }),
        placemark({ nombre: 'Polígono sin título', propiedades: {}, geometria: GEOMETRIA_VECINA }),
        placemark({ nombre: 'Portón acceso', geometria: null }),
      ];
      const proyectos = { buscarExistente: vi.fn().mockResolvedValue({ id: 1, estado: 'BORRADOR' }) };
      const lectorKml: LectorKml = { leer: vi.fn().mockReturnValue(placemarks) };
      const creados = [loteCreado(10, 'A-01'), loteCreado(11, 'L-03')];
      const repos = {
        lotes: {
          buscarPorCodigo: vi.fn().mockResolvedValue(null),
          listarPorProyecto: vi.fn().mockResolvedValue([]),
          crear: vi.fn().mockResolvedValueOnce(creados[0]).mockResolvedValueOnce(creados[1]),
        },
        proyectos: { actualizar: vi.fn().mockResolvedValue({ id: 1 }) },
      };
      const servicio = new ImportacionKmlServicio(
        unidadDeTrabajoFalsa(repos),
        proyectos as unknown as ProyectoServicio,
        lectorKml,
      );
      // Act
      const resultado = await servicio.importar(1, {
        kml: '<kml>...</kml>',
        manzanoPorDefecto: 'M2',
        etapaPorDefecto: 'E2',
        precioPorDefecto: 60000,
      });
      // Assert
      expect(proyectos.buscarExistente).toHaveBeenCalledWith(1);
      expect(lectorKml.leer).toHaveBeenCalledWith('<kml>...</kml>');
      expect(repos.lotes.crear).toHaveBeenNthCalledWith(
        1,
        1,
        expect.objectContaining({
          codigo: 'A-01',
          manzano: 'A',
          etapa: '1',
          precio: 75000.5,
          superficieM2: 400,
          dimensiones: '10 x 40 m',
        }),
      );
      expect(repos.lotes.crear).toHaveBeenNthCalledWith(
        2,
        1,
        expect.objectContaining({
          codigo: 'L-03',
          manzano: 'M2',
          etapa: 'E2',
          precio: 60000,
        }),
      );
      expect(repos.proyectos.actualizar).toHaveBeenCalledWith(1, {
        limite: expect.objectContaining({ type: 'Polygon' }),
      });
      expect(resultado).toEqual({
        lotesCreados: 2,
        limiteImportado: true,
        elementosOmitidos: 1,
        lotes: creados,
      });
    });

    it('importa lotes con nombre propio o sin título sin actualizar el límite del proyecto cuando no viene perímetro', async () => {
      // Arrange
      const proyectos = { buscarExistente: vi.fn().mockResolvedValue({ id: 1 }) };
      const lectorKml: LectorKml = {
        leer: vi.fn().mockReturnValue([
          placemark({ nombre: 'M1-01', propiedades: {} }),
          placemark({ nombre: '   ', propiedades: {}, geometria: GEOMETRIA_VECINA }),
        ]),
      };
      const creados = [loteCreado(12, 'M1-01'), loteCreado(13, 'L-02')];
      const repos = {
        lotes: {
          buscarPorCodigo: vi.fn().mockResolvedValue(null),
          listarPorProyecto: vi.fn().mockResolvedValue([]),
          crear: vi.fn().mockResolvedValueOnce(creados[0]).mockResolvedValueOnce(creados[1]),
        },
        proyectos: { actualizar: vi.fn() },
      };
      const servicio = new ImportacionKmlServicio(
        unidadDeTrabajoFalsa(repos),
        proyectos as unknown as ProyectoServicio,
        lectorKml,
      );
      // Act
      const resultado = await servicio.importar(1, { kml: '<kml/>' });
      // Assert
      expect(repos.lotes.crear).toHaveBeenNthCalledWith(1, 1, expect.objectContaining({ codigo: 'M1-01' }));
      expect(repos.lotes.crear).toHaveBeenNthCalledWith(2, 1, expect.objectContaining({ codigo: 'L-02' }));
      expect(repos.proyectos.actualizar).not.toHaveBeenCalled();
      expect(resultado).toEqual({
        lotesCreados: 2,
        limiteImportado: false,
        elementosOmitidos: 0,
        lotes: creados,
      });
    });

    it('importa el perímetro identificado por nombre cuando el KML no contiene lotes adicionales', async () => {
      // Arrange
      const proyectos = { buscarExistente: vi.fn().mockResolvedValue({ id: 1 }) };
      const lectorKml: LectorKml = {
        leer: vi.fn().mockReturnValue([placemark({ nombre: 'Perímetro Urbano', propiedades: {} })]),
      };
      const repos = {
        lotes: { buscarPorCodigo: vi.fn(), crear: vi.fn() },
        proyectos: { actualizar: vi.fn().mockResolvedValue({ id: 1 }) },
      };
      const servicio = new ImportacionKmlServicio(
        unidadDeTrabajoFalsa(repos),
        proyectos as unknown as ProyectoServicio,
        lectorKml,
      );
      // Act
      const resultado = await servicio.importar(1, { kml: '<kml/>' });
      // Assert
      expect(repos.lotes.crear).not.toHaveBeenCalled();
      expect(repos.proyectos.actualizar).toHaveBeenCalledWith(1, {
        limite: expect.objectContaining({ type: 'Polygon' }),
      });
      expect(resultado).toEqual({
        lotesCreados: 0,
        limiteImportado: true,
        elementosOmitidos: 0,
        lotes: [],
      });
    });

    it('lanza NO_ENCONTRADO sin leer el KML ni abrir transacción cuando el proyecto no existe', async () => {
      // Arrange
      const proyectos = {
        buscarExistente: vi.fn().mockRejectedValue(new ErrorNoEncontrado('Proyecto no encontrado.')),
      };
      const lectorKml: LectorKml = { leer: vi.fn() };
      const repos = { lotes: { crear: vi.fn() } };
      const servicio = new ImportacionKmlServicio(
        unidadDeTrabajoFalsa(repos),
        proyectos as unknown as ProyectoServicio,
        lectorKml,
      );
      // Act
      const importar = () => servicio.importar(999, { kml: '<kml/>' });
      // Assert
      await expect(importar()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
      expect(lectorKml.leer).not.toHaveBeenCalled();
      expect(repos.lotes.crear).not.toHaveBeenCalled();
    });

    it('propaga KML_INVALIDO sin guardar datos cuando el lector rechaza el XML', async () => {
      // Arrange
      const proyectos = { buscarExistente: vi.fn().mockResolvedValue({ id: 1 }) };
      const lectorKml: LectorKml = {
        leer: vi.fn(() => {
          throw new ErrorReglaNegocio('KML_INVALIDO', 'Archivo KML inválido.');
        }),
      };
      const repos = { lotes: { crear: vi.fn() } };
      const servicio = new ImportacionKmlServicio(
        unidadDeTrabajoFalsa(repos),
        proyectos as unknown as ProyectoServicio,
        lectorKml,
      );
      // Act
      const importar = () => servicio.importar(1, { kml: '<invalido>' });
      // Assert
      await expect(importar()).rejects.toMatchObject({ codigo: 'KML_INVALIDO' });
      expect(repos.lotes.crear).not.toHaveBeenCalled();
    });

    it.each([
      ['archivo sin placemarks', []],
      ['solo placemarks sin polígono', [placemark({ nombre: 'Punto', geometria: null })]],
    ] as const)('lanza KML_CON_ERRORES cuando es un %s', async (_desc, placemarks) => {
      // Arrange
      const proyectos = { buscarExistente: vi.fn().mockResolvedValue({ id: 1 }) };
      const lectorKml: LectorKml = { leer: vi.fn().mockReturnValue(placemarks) };
      const repos = { lotes: { buscarPorCodigo: vi.fn(), crear: vi.fn() } };
      const servicio = new ImportacionKmlServicio(
        unidadDeTrabajoFalsa(repos),
        proyectos as unknown as ProyectoServicio,
        lectorKml,
      );
      // Act
      const importar = () => servicio.importar(1, { kml: '<kml/>' });
      // Assert
      await expect(importar()).rejects.toMatchObject({
        codigo: 'KML_CON_ERRORES',
        detalles: ['El archivo no contiene polígonos.'],
      });
      expect(repos.lotes.crear).not.toHaveBeenCalled();
    });

    it('acumula errores de formato numérico, geometría inválida y códigos duplicados sin importar ningún lote (todo o nada)', async () => {
      // Arrange
      const placemarks: PlacemarkKml[] = [
        placemark({ nombre: 'B-01', propiedades: { precio: '75.000' } }),
        placemark({ nombre: '', geometria: { type: 'Point', coordinates: [-63.18, -17.78] } }),
        placemark({ nombre: 'A-01' }),
        placemark({ nombre: 'A-01' }),
        placemark({ nombre: 'A-02' }),
      ];
      const proyectos = { buscarExistente: vi.fn().mockResolvedValue({ id: 1 }) };
      const lectorKml: LectorKml = { leer: vi.fn().mockReturnValue(placemarks) };
      const repos = {
        lotes: {
          buscarPorCodigo: vi.fn(async (_proyectoId: number, codigo: string) => (codigo === 'A-02' ? { id: 99 } : null)),
          crear: vi.fn(),
        },
        proyectos: { actualizar: vi.fn() },
      };
      const servicio = new ImportacionKmlServicio(
        unidadDeTrabajoFalsa(repos),
        proyectos as unknown as ProyectoServicio,
        lectorKml,
      );
      // Act
      const importar = () => servicio.importar(1, { kml: '<kml/>' });
      // Assert
      await expect(importar()).rejects.toMatchObject({
        codigo: 'KML_CON_ERRORES',
        detalles: expect.arrayContaining([
          expect.stringContaining('75.000'),
          expect.stringContaining('Elemento 2'),
          expect.stringContaining('A-01'),
          expect.stringContaining('A-02'),
        ]),
      });
      expect(repos.lotes.crear).not.toHaveBeenCalled();
      expect(repos.proyectos.actualizar).not.toHaveBeenCalled();
    });

    it('lanza KML_CON_ERRORES sin importar ningún lote cuando dos polígonos del archivo se superponen', async () => {
      // Arrange: A-02 trae el mismo polígono que A-01
      const placemarks: PlacemarkKml[] = [placemark({ nombre: 'A-01' }), placemark({ nombre: 'A-02' })];
      const proyectos = { buscarExistente: vi.fn().mockResolvedValue({ id: 1 }) };
      const lectorKml: LectorKml = { leer: vi.fn().mockReturnValue(placemarks) };
      const repos = {
        lotes: {
          buscarPorCodigo: vi.fn().mockResolvedValue(null),
          listarPorProyecto: vi.fn().mockResolvedValue([]),
          crear: vi.fn(),
        },
      };
      const servicio = new ImportacionKmlServicio(
        unidadDeTrabajoFalsa(repos),
        proyectos as unknown as ProyectoServicio,
        lectorKml,
      );
      // Act
      const importar = () => servicio.importar(1, { kml: '<kml/>' });
      // Assert
      await expect(importar()).rejects.toMatchObject({
        codigo: 'KML_CON_ERRORES',
        detalles: [expect.stringContaining('A-02')],
      });
      expect(repos.lotes.crear).not.toHaveBeenCalled();
    });

    it('lanza KML_CON_ERRORES sin importar ningún lote cuando un polígono del archivo pisa a un lote que ya existe en el proyecto', async () => {
      // Arrange: el proyecto ya tiene el lote A-01 en ese mismo terreno
      const proyectos = { buscarExistente: vi.fn().mockResolvedValue({ id: 1 }) };
      const lectorKml: LectorKml = { leer: vi.fn().mockReturnValue([placemark({ nombre: 'B-01' })]) };
      const repos = {
        lotes: {
          buscarPorCodigo: vi.fn().mockResolvedValue(null),
          listarPorProyecto: vi.fn().mockResolvedValue([loteCreado(7, 'A-01')]),
          crear: vi.fn(),
        },
      };
      const servicio = new ImportacionKmlServicio(
        unidadDeTrabajoFalsa(repos),
        proyectos as unknown as ProyectoServicio,
        lectorKml,
      );
      // Act
      const importar = () => servicio.importar(1, { kml: '<kml/>' });
      // Assert
      await expect(importar()).rejects.toMatchObject({
        codigo: 'KML_CON_ERRORES',
        detalles: [expect.stringContaining('A-01')],
      });
      expect(repos.lotes.listarPorProyecto).toHaveBeenCalledWith(1);
      expect(repos.lotes.crear).not.toHaveBeenCalled();
    });
  });
});
