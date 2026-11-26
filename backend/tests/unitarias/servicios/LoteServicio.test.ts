// Consigna §5 y §12: Actualización y eliminación transaccional de lotes (Incidencia #4).
import { describe, expect, it, vi } from 'vitest';
import { LoteServicio } from '../../../src/aplicacion/servicios/LoteServicio';
import type { ProyectoServicio } from '../../../src/aplicacion/servicios/ProyectoServicio';
import { rectanguloEnMetros } from '../../../src/dominio/geometria';
import { OPERACIONES_LOTE } from '../../../src/dominio/lote';
import {
  fechaEnDias,
  GEOMETRIA_LOTE,
  MANIANA,
  relojEnHoy,
  unidadDeTrabajoFalsa,
  usuarioAsesor,
} from '../../apoyo/dobles';

const loteBase = (sobrescribir: Record<string, unknown> = {}) => ({
  id: 5,
  proyectoId: 1,
  codigo: 'A-01',
  manzano: 'A',
  etapa: '1',
  superficieM2: 360,
  dimensiones: '12 x 30 m',
  precio: 50000,
  estado: 'DISPONIBLE' as const,
  geometria: GEOMETRIA_LOTE,
  ...sobrescribir,
});

const proyectoBase = { id: 1, nombre: 'Las Palmas', estado: 'PUBLICADO' as const };

/** Un lote vecino de GEOMETRIA_LOTE (12 x 30 m): comparte un lado con él y no lo pisa. */
const GEOMETRIA_VECINA = rectanguloEnMetros([-63.18, -17.78], 12, 0, 12, 30);
/** Un polígono corrido 6 m: pisa la mitad de GEOMETRIA_LOTE y la mitad de GEOMETRIA_VECINA. */
const GEOMETRIA_ENCIMADA = rectanguloEnMetros([-63.18, -17.78], 6, 0, 12, 30);

describe('LoteServicio', () => {
  describe('listar', () => {
    it('verifica la visibilidad del proyecto y devuelve los lotes filtrados', async () => {
      // Arrange
      const filtros = { estado: 'DISPONIBLE' as const, manzano: 'A' };
      const lotesEsperados = [loteBase({ id: 5 }), loteBase({ id: 6, codigo: 'A-02' })];
      const proyectos = { buscarVisible: vi.fn().mockResolvedValue(proyectoBase) };
      const repos = {
        lotes: { listarPorProyecto: vi.fn().mockResolvedValue(lotesEsperados) },
      };
      const servicio = new LoteServicio(unidadDeTrabajoFalsa(repos), proyectos as unknown as ProyectoServicio, relojEnHoy());
      // Act
      const resultado = await servicio.listar(1, filtros, usuarioAsesor);
      // Assert
      expect(proyectos.buscarVisible).toHaveBeenCalledWith(1, usuarioAsesor);
      expect(repos.lotes.listarPorProyecto).toHaveBeenCalledWith(1, filtros);
      expect(resultado).toEqual(lotesEsperados);
    });
  });

  describe('obtenerDetalle', () => {
    it('devuelve el detalle con reserva activa y sin venta vigente cuando el lote está reservado', async () => {
      // Arrange
      const lote = loteBase({ estado: 'RESERVADO' });
      const reserva = {
        id: 20,
        fecha: new Date('2026-03-14T12:00:00'),
        fechaVencimiento: MANIANA,
        observacion: 'Señal recibida',
        cliente: { id: 7, nombreCompleto: 'Ana Pérez', documento: '123456', telefono: '70000001' },
        asesor: { id: usuarioAsesor.id, nombre: usuarioAsesor.nombre },
      };
      const proyectos = { buscarVisible: vi.fn().mockResolvedValue(proyectoBase) };
      const repos = {
        lotes: { buscarPorId: vi.fn().mockResolvedValue(lote) },
        reservas: { buscarActivaPorLote: vi.fn().mockResolvedValue(reserva) },
        ventas: { listar: vi.fn().mockResolvedValue([]) },
      };
      const servicio = new LoteServicio(unidadDeTrabajoFalsa(repos), proyectos as unknown as ProyectoServicio, relojEnHoy());
      // Act
      const detalle = await servicio.obtenerDetalle(5, usuarioAsesor);
      // Assert
      expect(proyectos.buscarVisible).toHaveBeenCalledWith(1, usuarioAsesor);
      expect(repos.ventas.listar).toHaveBeenCalledWith({ loteId: 5, estado: 'VIGENTE' });
      expect(detalle.proyecto).toEqual(proyectoBase);
      expect(detalle.reservaActiva).toEqual({
        id: 20,
        fecha: reserva.fecha,
        fechaVencimiento: MANIANA,
        observacion: 'Señal recibida',
        cliente: reserva.cliente,
        asesor: reserva.asesor,
      });
      expect(detalle.ventaVigente).toBeNull();
    });

    it('devuelve el detalle con venta vigente y totales calculados cuando el lote está vendido', async () => {
      // Arrange
      const lote = loteBase({ estado: 'VENDIDO' });
      const venta = {
        id: 30,
        fecha: new Date('2026-03-15T12:00:00'),
        precioPactado: 48000,
        modalidad: 'FINANCIADO',
        cliente: { id: 7, nombreCompleto: 'Ana Pérez', documento: '123456', telefono: '70000001' },
        asesor: { id: usuarioAsesor.id, nombre: usuarioAsesor.nombre },
        cuotas: [
          { id: 1, numero: 0, concepto: 'Cuota inicial', monto: 12000, fechaVencimiento: fechaEnDias(0) },
          { id: 2, numero: 1, concepto: 'Cuota 1', monto: 36000, fechaVencimiento: '2026-04-15' },
        ],
        pagos: [{ id: 10, cuotaId: 1, monto: 12000, estado: 'VALIDO' as const }],
      };
      const proyectos = { buscarVisible: vi.fn().mockResolvedValue(proyectoBase) };
      const repos = {
        lotes: { buscarPorId: vi.fn().mockResolvedValue(lote) },
        reservas: { buscarActivaPorLote: vi.fn().mockResolvedValue(null) },
        ventas: { listar: vi.fn().mockResolvedValue([venta]) },
      };
      const servicio = new LoteServicio(unidadDeTrabajoFalsa(repos), proyectos as unknown as ProyectoServicio, relojEnHoy());
      // Act
      const detalle = await servicio.obtenerDetalle(5, usuarioAsesor);
      // Assert
      expect(detalle.reservaActiva).toBeNull();
      expect(detalle.ventaVigente).toEqual({
        id: 30,
        fecha: venta.fecha,
        precioPactado: 48000,
        modalidad: 'FINANCIADO',
        cliente: venta.cliente,
        asesor: venta.asesor,
        totalPagado: 12000,
        saldoPendiente: 36000,
      });
    });

    it('lanza NO_ENCONTRADO cuando el lote no existe al pedir detalle', async () => {
      // Arrange
      const proyectos = { buscarVisible: vi.fn() };
      const repos = {
        lotes: { buscarPorId: vi.fn().mockResolvedValue(null) },
      };
      const servicio = new LoteServicio(unidadDeTrabajoFalsa(repos), proyectos as unknown as ProyectoServicio, relojEnHoy());
      // Act
      const consultar = () => servicio.obtenerDetalle(999, usuarioAsesor);
      // Assert
      await expect(consultar()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
      expect(proyectos.buscarVisible).not.toHaveBeenCalled();
    });
  });

  describe('crear', () => {
    it('normaliza el código, calcula superficie y dimensiones desde el polígono y crea el lote', async () => {
      // Arrange
      const loteCreado = loteBase({ id: 9, codigo: 'A-05' });
      const proyectos = { buscarExistente: vi.fn().mockResolvedValue(proyectoBase) };
      const repos = {
        lotes: {
          listarPorProyecto: vi.fn().mockResolvedValue([]),
          buscarPorCodigo: vi.fn().mockResolvedValue(null),
          crear: vi.fn().mockResolvedValue(loteCreado),
        },
      };
      const servicio = new LoteServicio(unidadDeTrabajoFalsa(repos), proyectos as unknown as ProyectoServicio, relojEnHoy());
      // Act
      const resultado = await servicio.crear(1, {
        codigo: ' a-05 ',
        precio: 50000,
        geometria: GEOMETRIA_LOTE,
      });
      // Assert
      expect(proyectos.buscarExistente).toHaveBeenCalledWith(1);
      expect(repos.lotes.buscarPorCodigo).toHaveBeenCalledWith(1, 'A-05');
      expect(repos.lotes.crear).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          codigo: 'A-05',
          manzano: '',
          etapa: '',
          precio: 50000,
          superficieM2: expect.any(Number),
          dimensiones: expect.stringContaining('x'),
        }),
      );
      expect(resultado).toEqual(loteCreado);
    });

    it('lanza CODIGO_LOTE_DUPLICADO sin crear cuando ya existe un lote con el mismo código normalizado', async () => {
      // Arrange
      const proyectos = { buscarExistente: vi.fn().mockResolvedValue(proyectoBase) };
      const repos = {
        lotes: {
          listarPorProyecto: vi.fn().mockResolvedValue([]),
          buscarPorCodigo: vi.fn().mockResolvedValue(loteBase()),
          crear: vi.fn(),
        },
      };
      const servicio = new LoteServicio(unidadDeTrabajoFalsa(repos), proyectos as unknown as ProyectoServicio, relojEnHoy());
      // Act
      const crear = () => servicio.crear(1, { codigo: 'a-01', geometria: GEOMETRIA_LOTE });
      // Assert
      await expect(crear()).rejects.toMatchObject({ codigo: 'CODIGO_LOTE_DUPLICADO' });
      expect(repos.lotes.crear).not.toHaveBeenCalled();
    });

    it('lanza LOTE_SUPERPUESTO sin crear cuando el polígono pisa a otro lote del proyecto', async () => {
      // Arrange
      const existente = loteBase({ id: 6, codigo: 'A-02' });
      const proyectos = { buscarExistente: vi.fn().mockResolvedValue(proyectoBase) };
      const repos = {
        lotes: {
          listarPorProyecto: vi.fn().mockResolvedValue([existente]),
          buscarPorCodigo: vi.fn().mockResolvedValue(null),
          crear: vi.fn(),
        },
      };
      const servicio = new LoteServicio(unidadDeTrabajoFalsa(repos), proyectos as unknown as ProyectoServicio, relojEnHoy());
      // Act
      const crear = () => servicio.crear(1, { codigo: 'A-09', precio: 50000, geometria: GEOMETRIA_ENCIMADA });
      // Assert
      await expect(crear()).rejects.toMatchObject({ codigo: 'LOTE_SUPERPUESTO' });
      expect(repos.lotes.listarPorProyecto).toHaveBeenCalledWith(1);
      expect(repos.lotes.crear).not.toHaveBeenCalled();
    });

    it('crea el lote cuando solo comparte un lado con un lote vecino del proyecto', async () => {
      // Arrange
      const vecino = loteBase({ id: 6, codigo: 'A-02' });
      const loteCreado = loteBase({ id: 9, codigo: 'A-09', geometria: GEOMETRIA_VECINA });
      const proyectos = { buscarExistente: vi.fn().mockResolvedValue(proyectoBase) };
      const repos = {
        lotes: {
          listarPorProyecto: vi.fn().mockResolvedValue([vecino]),
          buscarPorCodigo: vi.fn().mockResolvedValue(null),
          crear: vi.fn().mockResolvedValue(loteCreado),
        },
      };
      const servicio = new LoteServicio(unidadDeTrabajoFalsa(repos), proyectos as unknown as ProyectoServicio, relojEnHoy());
      // Act
      const resultado = await servicio.crear(1, { codigo: 'A-09', precio: 50000, geometria: GEOMETRIA_VECINA });
      // Assert
      expect(repos.lotes.crear).toHaveBeenCalledWith(1, expect.objectContaining({ codigo: 'A-09' }));
      expect(resultado).toEqual(loteCreado);
    });
  });

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

    it('actualiza datos y valida código único cuando cambia el código del lote', async () => {
      // Arrange
      const actual = loteBase();
      const actualizado = { ...actual, codigo: 'B-02', manzano: 'B', precio: 55000 };
      const repos = {
        lotes: {
          bloquearPorId: vi.fn().mockResolvedValue(undefined),
          buscarPorId: vi.fn().mockResolvedValue(actual),
          buscarPorCodigo: vi.fn().mockResolvedValue(null),
          actualizar: vi.fn().mockResolvedValue(actualizado),
        },
      };
      const servicio = new LoteServicio(unidadDeTrabajoFalsa(repos), {} as ProyectoServicio, relojEnHoy());
      // Act
      const resultado = await servicio.actualizar(5, { codigo: ' b-02 ', manzano: 'B', precio: 55000 });
      // Assert
      expect(repos.lotes.bloquearPorId).toHaveBeenCalledWith(5);
      expect(repos.lotes.buscarPorCodigo).toHaveBeenCalledWith(1, 'B-02');
      expect(repos.lotes.actualizar).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ codigo: 'B-02', manzano: 'B', precio: 55000, superficieM2: 360 }),
      );
      expect(resultado).toEqual(actualizado);
    });

    it('recalcula superficie y dimensiones sin validar unicidad si cambia la geometría sin cambiar el código', async () => {
      // Arrange
      const actual = loteBase({ codigo: 'A-01' });
      const actualizado = { ...actual, superficieM2: 360 };
      const repos = {
        lotes: {
          buscarPorId: vi.fn().mockResolvedValue(actual),
          listarPorProyecto: vi.fn().mockResolvedValue([actual]),
          buscarPorCodigo: vi.fn(),
          actualizar: vi.fn().mockResolvedValue(actualizado),
        },
      };
      const servicio = new LoteServicio(unidadDeTrabajoFalsa(repos), {} as ProyectoServicio, relojEnHoy());
      // Act
      const resultado = await servicio.actualizar(5, { geometria: GEOMETRIA_LOTE });
      // Assert
      expect(repos.lotes.buscarPorCodigo).not.toHaveBeenCalled();
      expect(repos.lotes.actualizar).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ codigo: 'A-01', superficieM2: expect.any(Number), dimensiones: expect.stringContaining('x') }),
      );
      expect(resultado).toEqual(actualizado);
    });

    it('lanza NO_ENCONTRADO cuando el lote a actualizar no existe', async () => {
      // Arrange
      const repos = {
        lotes: { buscarPorId: vi.fn().mockResolvedValue(null), actualizar: vi.fn() },
      };
      const servicio = new LoteServicio(unidadDeTrabajoFalsa(repos), {} as ProyectoServicio, relojEnHoy());
      // Act
      const actualizar = () => servicio.actualizar(999, { precio: 45000 });
      // Assert
      await expect(actualizar()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
      expect(repos.lotes.actualizar).not.toHaveBeenCalled();
    });

    it('lanza CODIGO_LOTE_DUPLICADO sin actualizar cuando el nuevo código ya pertenece a otro lote', async () => {
      // Arrange
      const repos = {
        lotes: {
          buscarPorId: vi.fn().mockResolvedValue(loteBase({ codigo: 'A-01' })),
          buscarPorCodigo: vi.fn().mockResolvedValue(loteBase({ id: 9, codigo: 'A-02' })),
          actualizar: vi.fn(),
        },
      };
      const servicio = new LoteServicio(unidadDeTrabajoFalsa(repos), {} as ProyectoServicio, relojEnHoy());
      // Act
      const actualizar = () => servicio.actualizar(5, { codigo: 'a-02' });
      // Assert
      await expect(actualizar()).rejects.toMatchObject({ codigo: 'CODIGO_LOTE_DUPLICADO' });
      expect(repos.lotes.actualizar).not.toHaveBeenCalled();
    });

    it('lanza LOTE_SUPERPUESTO sin actualizar cuando la forma nueva pisa a otro lote del proyecto', async () => {
      // Arrange
      const actual = loteBase({ id: 5, codigo: 'A-01' });
      const vecino = loteBase({ id: 6, codigo: 'A-02', geometria: GEOMETRIA_VECINA });
      const repos = {
        lotes: {
          buscarPorId: vi.fn().mockResolvedValue(actual),
          listarPorProyecto: vi.fn().mockResolvedValue([actual, vecino]),
          actualizar: vi.fn(),
        },
      };
      const servicio = new LoteServicio(unidadDeTrabajoFalsa(repos), {} as ProyectoServicio, relojEnHoy());
      // Act
      const actualizar = () => servicio.actualizar(5, { geometria: GEOMETRIA_ENCIMADA });
      // Assert
      await expect(actualizar()).rejects.toMatchObject({ codigo: 'LOTE_SUPERPUESTO' });
      expect(repos.lotes.listarPorProyecto).toHaveBeenCalledWith(1);
      expect(repos.lotes.actualizar).not.toHaveBeenCalled();
    });

    it('no consulta los demás lotes del proyecto cuando la edición no cambia la forma del lote', async () => {
      // Arrange
      const actual = loteBase({ id: 5, codigo: 'A-01' });
      const repos = {
        lotes: {
          buscarPorId: vi.fn().mockResolvedValue(actual),
          listarPorProyecto: vi.fn(),
          actualizar: vi.fn().mockResolvedValue({ ...actual, precio: 55000 }),
        },
      };
      const servicio = new LoteServicio(unidadDeTrabajoFalsa(repos), {} as ProyectoServicio, relojEnHoy());
      // Act
      await servicio.actualizar(5, { precio: 55000 });
      // Assert
      expect(repos.lotes.listarPorProyecto).not.toHaveBeenCalled();
      expect(repos.lotes.actualizar).toHaveBeenCalledWith(5, expect.objectContaining({ precio: 55000 }));
    });
  });

  describe('cambiarEstado', () => {
    it('bloquea un lote DISPONIBLE y devuelve el lote actualizado', async () => {
      // Arrange
      const loteDisponible = loteBase({ estado: 'DISPONIBLE' });
      const loteBloqueado = loteBase({ estado: 'BLOQUEADO' });
      const repos = {
        lotes: {
          bloquearPorId: vi.fn().mockResolvedValue(undefined),
          buscarPorId: vi.fn().mockResolvedValueOnce(loteDisponible).mockResolvedValueOnce(loteBloqueado),
          cambiarEstadoSi: vi.fn().mockResolvedValue(true),
        },
      };
      const servicio = new LoteServicio(unidadDeTrabajoFalsa(repos), {} as ProyectoServicio, relojEnHoy());
      // Act
      const resultado = await servicio.cambiarEstado(5, 'BLOQUEADO');
      // Assert
      expect(repos.lotes.bloquearPorId).toHaveBeenCalledWith(5);
      expect(repos.lotes.cambiarEstadoSi).toHaveBeenCalledWith(5, OPERACIONES_LOTE.bloquear);
      expect(resultado).toEqual(loteBloqueado);
    });

    it('lanza NO_ENCONTRADO cuando el lote no existe al cambiar estado', async () => {
      // Arrange
      const repos = {
        lotes: { buscarPorId: vi.fn().mockResolvedValue(null), cambiarEstadoSi: vi.fn() },
      };
      const servicio = new LoteServicio(unidadDeTrabajoFalsa(repos), {} as ProyectoServicio, relojEnHoy());
      // Act
      const cambiar = () => servicio.cambiarEstado(999, 'BLOQUEADO');
      // Assert
      await expect(cambiar()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
      expect(repos.lotes.cambiarEstadoSi).not.toHaveBeenCalled();
    });

    it('lanza CAMBIO_ESTADO_NO_PERMITIDO cuando se intenta un cambio manual inválido', async () => {
      // Arrange
      const repos = {
        lotes: { buscarPorId: vi.fn().mockResolvedValue(loteBase({ estado: 'DISPONIBLE' })), cambiarEstadoSi: vi.fn() },
      };
      const servicio = new LoteServicio(unidadDeTrabajoFalsa(repos), {} as ProyectoServicio, relojEnHoy());
      // Act
      const cambiar = () => servicio.cambiarEstado(5, 'VENDIDO');
      // Assert
      await expect(cambiar()).rejects.toMatchObject({ codigo: 'CAMBIO_ESTADO_NO_PERMITIDO' });
      expect(repos.lotes.cambiarEstadoSi).not.toHaveBeenCalled();
    });

    it('lanza LOTE_MODIFICADO cuando cambiarEstadoSi devuelve false por carrera', async () => {
      // Arrange
      const repos = {
        lotes: {
          buscarPorId: vi.fn().mockResolvedValue(loteBase({ estado: 'DISPONIBLE' })),
          cambiarEstadoSi: vi.fn().mockResolvedValue(false),
        },
      };
      const servicio = new LoteServicio(unidadDeTrabajoFalsa(repos), {} as ProyectoServicio, relojEnHoy());
      // Act
      const cambiar = () => servicio.cambiarEstado(5, 'BLOQUEADO');
      // Assert
      await expect(cambiar()).rejects.toMatchObject({ codigo: 'LOTE_MODIFICADO' });
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

    it('bloquea proyecto y lote y elimina un lote DISPONIBLE sin operaciones en un proyecto PUBLICADO con más lotes', async () => {
      // Arrange
      const lote = loteBase({ id: 5, estado: 'DISPONIBLE' });
      const otroLote = loteBase({ id: 6, codigo: 'A-02' });
      const repos = {
        proyectos: {
          bloquearPorId: vi.fn().mockResolvedValue(undefined),
          buscarPorId: vi.fn().mockResolvedValue({ id: 1, estado: 'PUBLICADO' }),
        },
        lotes: {
          bloquearPorId: vi.fn().mockResolvedValue(undefined),
          buscarPorId: vi.fn().mockResolvedValue(lote),
          tieneOperaciones: vi.fn().mockResolvedValue(false),
          listarPorProyecto: vi.fn().mockResolvedValue([lote, otroLote]),
          eliminar: vi.fn().mockResolvedValue(undefined),
        },
      };
      const servicio = new LoteServicio(unidadDeTrabajoFalsa(repos), {} as ProyectoServicio, relojEnHoy());
      // Act
      await servicio.eliminar(5);
      // Assert
      expect(repos.proyectos.bloquearPorId).toHaveBeenCalledWith(1);
      expect(repos.lotes.bloquearPorId).toHaveBeenCalledWith(5);
      expect(repos.lotes.eliminar).toHaveBeenCalledWith(5);
    });

    it('lanza NO_ENCONTRADO cuando el lote a eliminar no existe', async () => {
      // Arrange
      const repos = {
        proyectos: { bloquearPorId: vi.fn() },
        lotes: { buscarPorId: vi.fn().mockResolvedValue(null), eliminar: vi.fn() },
      };
      const servicio = new LoteServicio(unidadDeTrabajoFalsa(repos), {} as ProyectoServicio, relojEnHoy());
      // Act
      const eliminar = () => servicio.eliminar(999);
      // Assert
      await expect(eliminar()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
      expect(repos.proyectos.bloquearPorId).not.toHaveBeenCalled();
      expect(repos.lotes.eliminar).not.toHaveBeenCalled();
    });

    it('lanza LOTE_CON_OPERACIONES y no elimina cuando el lote tiene historial de operaciones', async () => {
      // Arrange
      const lote = loteBase({ id: 5, estado: 'DISPONIBLE' });
      const repos = {
        proyectos: { buscarPorId: vi.fn().mockResolvedValue({ id: 1, estado: 'BORRADOR' }) },
        lotes: {
          buscarPorId: vi.fn().mockResolvedValue(lote),
          tieneOperaciones: vi.fn().mockResolvedValue(true),
          listarPorProyecto: vi.fn().mockResolvedValue([lote]),
          eliminar: vi.fn(),
        },
      };
      const servicio = new LoteServicio(unidadDeTrabajoFalsa(repos), {} as ProyectoServicio, relojEnHoy());
      // Act
      const eliminar = () => servicio.eliminar(5);
      // Assert
      await expect(eliminar()).rejects.toMatchObject({ codigo: 'LOTE_CON_OPERACIONES' });
      expect(repos.lotes.eliminar).not.toHaveBeenCalled();
    });
  });

  describe('analizarGeometria', () => {
    it('normaliza el polígono y devuelve la superficie y dimensiones sugeridas', () => {
      // Arrange
      const servicio = new LoteServicio(unidadDeTrabajoFalsa({}), {} as ProyectoServicio, relojEnHoy());
      // Act
      const analisis = servicio.analizarGeometria(GEOMETRIA_LOTE);
      // Assert
      expect(analisis.geometria.type).toBe('Polygon');
      expect(analisis.superficieM2).toBeCloseTo(360, 0);
      expect(analisis.dimensiones).toMatch(/12(\.\d+)? x 30(\.\d+)? m/);
    });

    it('lanza GEOMETRIA_INVALIDA cuando el polígono recibido no es válido', () => {
      // Arrange
      const servicio = new LoteServicio(unidadDeTrabajoFalsa({}), {} as ProyectoServicio, relojEnHoy());
      // Act
      const analizar = () => servicio.analizarGeometria({ type: 'Point', coordinates: [-63.18, -17.78] });
      // Assert
      expect(analizar).toThrowError(expect.objectContaining({ codigo: 'GEOMETRIA_INVALIDA' }));
    });
  });
});
