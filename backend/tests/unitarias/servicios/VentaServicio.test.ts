// Consigna §5, §8 y §12: Manejo de reservas vencidas y anulación atómica en VentaServicio (Incidencia #5).
import { describe, expect, it, vi } from 'vitest';
import type { UsuarioActual } from '../../../src/aplicacion/puertos';
import { MOTIVO_VENCIMIENTO_RESERVA } from '../../../src/aplicacion/servicios/expirarReserva';
import { VentaServicio } from '../../../src/aplicacion/servicios/VentaServicio';
import { permisosDeRol } from '../../../src/dominio/permisos';
import {
  AYER,
  fechaEnDias,
  HOY,
  lotesYReservasEnMemoria,
  MANIANA,
  relojEnHoy,
  unidadDeTrabajoFalsa,
  usuarioAdmin,
  usuarioAsesor,
} from '../../apoyo/dobles';

const usuarioCliente = (clienteId = 7): UsuarioActual => ({
  id: 3,
  nombre: 'Camila Rojas',
  email: 'camila@cliente.bo',
  rol: 'CLIENTE',
  clienteId,
  permisos: permisosDeRol('CLIENTE'),
});

const vistaVenta = (sobrescribir: Record<string, unknown> = {}) => ({
  id: 30,
  loteId: 5,
  clienteId: 7,
  reservaId: null,
  precioPactado: 75000,
  modalidad: 'CONTADO' as const,
  estado: 'VIGENTE' as const,
  cuotas: [
    {
      id: 1,
      numero: 0,
      concepto: 'Pago al contado',
      monto: 75000,
      fechaVencimiento: fechaEnDias(0),
    },
  ],
  pagos: [{ id: 1, cuotaId: 1, monto: 75000, estado: 'VALIDO' as const }],
  ...sobrescribir,
});

describe('VentaServicio', () => {
  describe('listar', () => {
    it('lista las ventas con los filtros indicados y calcula su resumen cuando el usuario es asesor', async () => {
      // Arrange
      const venta = vistaVenta({
        id: 11,
        precioPactado: 60000,
        cuotas: [
          { id: 1, numero: 0, concepto: 'Cuota inicial', monto: 20000, fechaVencimiento: fechaEnDias(0) },
          { id: 2, numero: 1, concepto: 'Cuota 1', monto: 40000, fechaVencimiento: fechaEnDias(30) },
        ],
        pagos: [{ id: 1, cuotaId: 1, monto: 20000, estado: 'VALIDO' as const }],
      });
      const filtros = { proyectoId: 2, estado: 'VIGENTE' as const };
      const repos = {
        ventas: { listar: vi.fn().mockResolvedValue([venta]) },
      };
      const servicio = new VentaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const resultado = await servicio.listar(filtros, usuarioAsesor);
      // Assert
      expect(repos.ventas.listar).toHaveBeenCalledWith(filtros);
      expect(resultado).toHaveLength(1);
      expect(resultado[0]?.resumen).toMatchObject({
        totalPagado: 20000,
        saldoPendiente: 40000,
        cuotasPagadas: 1,
        saldada: false,
      });
    });

    it('restringe la consulta al clienteId propio cuando el usuario tiene rol CLIENTE aunque pida otro cliente', async () => {
      // Arrange
      const ventaPropia = vistaVenta({ id: 12, clienteId: 7 });
      const repos = {
        ventas: { listar: vi.fn().mockResolvedValue([ventaPropia]) },
      };
      const servicio = new VentaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const resultado = await servicio.listar({ clienteId: 99, estado: 'VIGENTE' }, usuarioCliente(7));
      // Assert
      expect(repos.ventas.listar).toHaveBeenCalledWith({ estado: 'VIGENTE', clienteId: 7 });
      expect(resultado[0]?.resumen.saldada).toBe(true);
    });
  });

  describe('obtener', () => {
    it('devuelve la venta con su resumen calculado cuando el cliente dueño la consulta', async () => {
      // Arrange
      const venta = vistaVenta({ id: 30, clienteId: 7 });
      const repos = {
        ventas: { buscarPorId: vi.fn().mockResolvedValue(venta) },
      };
      const servicio = new VentaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const resultado = await servicio.obtener(30, usuarioCliente(7));
      // Assert
      expect(resultado.id).toBe(30);
      expect(resultado.resumen).toMatchObject({
        totalPagado: 75000,
        saldoPendiente: 0,
        saldada: true,
      });
    });

    it('lanza NO_ENCONTRADO cuando la venta no existe', async () => {
      // Arrange
      const repos = {
        ventas: { buscarPorId: vi.fn().mockResolvedValue(null) },
      };
      const servicio = new VentaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const consultar = () => servicio.obtener(999, usuarioAdmin);
      // Assert
      await expect(consultar()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
    });

    it('lanza SIN_PERMISO cuando un cliente intenta consultar la venta de otro cliente', async () => {
      // Arrange
      const ventaAjena = vistaVenta({ id: 30, clienteId: 99 });
      const repos = {
        ventas: { buscarPorId: vi.fn().mockResolvedValue(ventaAjena) },
      };
      const servicio = new VentaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const consultar = () => servicio.obtener(30, usuarioCliente(7));
      // Assert
      await expect(consultar()).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
    });
  });

  describe('simularPlan', () => {
    it('genera el cronograma usando la fecha actual del reloj sin persistir datos', () => {
      // Arrange
      const servicio = new VentaServicio(unidadDeTrabajoFalsa({}), relojEnHoy());
      // Act
      const cuotas = servicio.simularPlan({
        precioPactado: 50000,
        modalidad: 'FINANCIADO',
        cuotaInicial: 10000,
        numeroCuotas: 2,
      });
      // Assert
      expect(cuotas).toEqual([
        { numero: 0, concepto: 'Cuota inicial', monto: 10000, fechaVencimiento: '2026-03-15' },
        { numero: 1, concepto: 'Cuota 1', monto: 20000, fechaVencimiento: '2026-04-15' },
        { numero: 2, concepto: 'Cuota 2', monto: 20000, fechaVencimiento: '2026-05-15' },
      ]);
    });
  });

  describe('registrar', () => {
    it('vence la reserva expirada y vende el lote como DISPONIBLE a otro cliente', async () => {
      // Arrange
      const memoria = lotesYReservasEnMemoria({
        lotes: [{ id: 5, proyectoId: 1, codigo: 'A-01', estado: 'RESERVADO', precio: 75000 }],
        reservas: [{ id: 20, loteId: 5, clienteId: 99, estado: 'ACTIVA', fechaVencimiento: AYER }],
      });
      const ventaCreada = {
        id: 30,
        loteId: 5,
        clienteId: 7,
        reservaId: null,
        precioPactado: 75000,
        modalidad: 'CONTADO' as const,
        estado: 'VIGENTE' as const,
        cuotas: [{ id: 1, numero: 0, monto: 75000, concepto: 'Pago al contado', fechaVencimiento: '2026-03-15' }],
        pagos: [{ id: 1, cuotaId: 1, monto: 75000, estado: 'VALIDO' as const }],
      };
      const repos = {
        ...memoria.repos,
        clientes: { buscarPorId: vi.fn().mockResolvedValue({ id: 7 }) },
        proyectos: { buscarPorId: vi.fn().mockResolvedValue({ id: 1, estado: 'PUBLICADO' }) },
        ventas: {
          crear: vi.fn().mockResolvedValue(ventaCreada),
          buscarPorId: vi.fn().mockResolvedValue(ventaCreada),
        },
        pagos: { crear: vi.fn().mockResolvedValue({ id: 1 }) },
      };
      const servicio = new VentaServicio(unidadDeTrabajoFalsa(repos, memoria), relojEnHoy());
      // Act
      await servicio.registrar({ loteId: 5, clienteId: 7, modalidad: 'CONTADO' }, usuarioAsesor);
      // Assert
      expect(memoria.reserva(20)).toMatchObject({ estado: 'VENCIDA', motivoFinalizacion: MOTIVO_VENCIMIENTO_RESERVA });
      expect(memoria.lote(5)?.estado).toBe('VENDIDO');
      expect(repos.ventas.crear).toHaveBeenCalledWith(
        expect.objectContaining({ loteId: 5, clienteId: 7, reservaId: null, precioPactado: 75000 }),
        expect.any(Array),
      );
    });

    it('convierte la reserva activa del mismo cliente, vende el lote en cuotas con precio pactado y cobra la cuota inicial', async () => {
      // Arrange
      const memoria = lotesYReservasEnMemoria({
        lotes: [{ id: 5, proyectoId: 1, codigo: 'A-01', estado: 'RESERVADO', precio: 80000 }],
        reservas: [{ id: 20, loteId: 5, clienteId: 7, estado: 'ACTIVA', fechaVencimiento: MANIANA }],
      });
      const ventaRegistrada = vistaVenta({
        id: 35,
        loteId: 5,
        clienteId: 7,
        reservaId: 20,
        precioPactado: 76000,
        modalidad: 'FINANCIADO',
        cuotas: [
          { id: 10, numero: 0, concepto: 'Cuota inicial', monto: 16000, fechaVencimiento: fechaEnDias(0) },
          { id: 11, numero: 1, concepto: 'Cuota 1', monto: 30000, fechaVencimiento: '2026-04-15' },
          { id: 12, numero: 2, concepto: 'Cuota 2', monto: 30000, fechaVencimiento: '2026-05-15' },
        ],
        pagos: [{ id: 50, cuotaId: 10, monto: 16000, estado: 'VALIDO' as const }],
      });
      const repos = {
        ...memoria.repos,
        clientes: { buscarPorId: vi.fn().mockResolvedValue({ id: 7 }) },
        proyectos: { buscarPorId: vi.fn().mockResolvedValue({ id: 1, estado: 'PUBLICADO' }) },
        ventas: {
          crear: vi.fn().mockResolvedValue(ventaRegistrada),
          buscarPorId: vi.fn().mockResolvedValue(ventaRegistrada),
        },
        pagos: { crear: vi.fn().mockResolvedValue({ id: 50 }) },
      };
      const servicio = new VentaServicio(unidadDeTrabajoFalsa(repos, memoria), relojEnHoy());
      // Act
      const resultado = await servicio.registrar(
        {
          loteId: 5,
          clienteId: 7,
          modalidad: 'FINANCIADO',
          precioPactado: 76000,
          cuotaInicial: 16000,
          numeroCuotas: 2,
          metodoPago: 'TRANSFERENCIA',
        },
        usuarioAsesor,
      );
      // Assert
      expect(memoria.reserva(20)?.estado).toBe('CONVERTIDA');
      expect(memoria.lote(5)?.estado).toBe('VENDIDO');
      expect(repos.ventas.crear).toHaveBeenCalledWith(
        expect.objectContaining({
          loteId: 5,
          clienteId: 7,
          asesorId: usuarioAsesor.id,
          reservaId: 20,
          precioPactado: 76000,
          modalidad: 'FINANCIADO',
          cuotaInicial: 16000,
          numeroCuotas: 2,
        }),
        expect.any(Array),
      );
      expect(repos.pagos.crear).toHaveBeenCalledWith(
        expect.objectContaining({
          cuotaId: 10,
          monto: 16000,
          metodo: 'TRANSFERENCIA',
          registradoPorId: usuarioAsesor.id,
        }),
      );
      expect(resultado.resumen).toMatchObject({ totalPagado: 16000, saldoPendiente: 60000 });
    });

    it('registra una venta FINANCIADA sin cuota inicial sin crear pago al firmar', async () => {
      // Arrange
      const memoria = lotesYReservasEnMemoria({
        lotes: [{ id: 5, proyectoId: 1, codigo: 'A-01', estado: 'DISPONIBLE', precio: 60000 }],
        reservas: [],
      });
      const ventaRegistrada = vistaVenta({
        id: 36,
        loteId: 5,
        clienteId: 7,
        precioPactado: 60000,
        modalidad: 'FINANCIADO',
        cuotas: [
          { id: 11, numero: 1, concepto: 'Cuota 1', monto: 30000, fechaVencimiento: '2026-04-15' },
          { id: 12, numero: 2, concepto: 'Cuota 2', monto: 30000, fechaVencimiento: '2026-05-15' },
        ],
        pagos: [],
      });
      const repos = {
        ...memoria.repos,
        clientes: { buscarPorId: vi.fn().mockResolvedValue({ id: 7 }) },
        proyectos: { buscarPorId: vi.fn().mockResolvedValue({ id: 1, estado: 'PUBLICADO' }) },
        ventas: {
          crear: vi.fn().mockResolvedValue(ventaRegistrada),
          buscarPorId: vi.fn().mockResolvedValue(ventaRegistrada),
        },
        pagos: { crear: vi.fn() },
      };
      const servicio = new VentaServicio(unidadDeTrabajoFalsa(repos, memoria), relojEnHoy());
      // Act
      const resultado = await servicio.registrar(
        { loteId: 5, clienteId: 7, modalidad: 'FINANCIADO', cuotaInicial: 0, numeroCuotas: 2 },
        usuarioAsesor,
      );
      // Assert
      expect(memoria.lote(5)?.estado).toBe('VENDIDO');
      expect(repos.pagos.crear).not.toHaveBeenCalled();
      expect(resultado.resumen).toMatchObject({ totalPagado: 0, saldoPendiente: 60000 });
    });

    it.each([
      ['el lote', null, { id: 7 }, { id: 1, estado: 'PUBLICADO' }],
      ['el cliente', { id: 5, proyectoId: 1, codigo: 'A-01', estado: 'DISPONIBLE', precio: 75000 }, null, { id: 1, estado: 'PUBLICADO' }],
      ['el proyecto del lote', { id: 5, proyectoId: 1, codigo: 'A-01', estado: 'DISPONIBLE', precio: 75000 }, { id: 7 }, null],
    ] as const)('lanza NO_ENCONTRADO cuando no existe %s', async (_desc, lote, cliente, proyecto) => {
      // Arrange
      const repos = {
        lotes: { buscarPorId: vi.fn().mockResolvedValue(lote), cambiarEstadoSi: vi.fn() },
        clientes: { buscarPorId: vi.fn().mockResolvedValue(cliente) },
        proyectos: { buscarPorId: vi.fn().mockResolvedValue(proyecto) },
        reservas: { buscarActivaPorLote: vi.fn().mockResolvedValue(null) },
        ventas: { crear: vi.fn() },
      };
      const servicio = new VentaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const registrar = () => servicio.registrar({ loteId: 5, clienteId: 7, modalidad: 'CONTADO' }, usuarioAsesor);
      // Assert
      await expect(registrar()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
      expect(repos.ventas.crear).not.toHaveBeenCalled();
    });

    it.each([
      ['LOTE_YA_VENDIDO', { id: 5, proyectoId: 1, codigo: 'A-01', estado: 'VENDIDO', precio: 75000 }, 'PUBLICADO', null],
      [
        'LOTE_RESERVADO_POR_OTRO_CLIENTE',
        { id: 5, proyectoId: 1, codigo: 'A-01', estado: 'RESERVADO', precio: 75000 },
        'PUBLICADO',
        { id: 20, loteId: 5, clienteId: 99, estado: 'ACTIVA', fechaVencimiento: MANIANA },
      ],
      ['PROYECTO_NO_PUBLICADO', { id: 5, proyectoId: 1, codigo: 'A-01', estado: 'DISPONIBLE', precio: 75000 }, 'BORRADOR', null],
    ] as const)(
      'lanza %s sin cambiar estado ni guardar la venta cuando falla la validación comercial',
      async (codigoEsperado, lote, estadoProyecto, reservaActiva) => {
        // Arrange
        const repos = {
          lotes: { buscarPorId: vi.fn().mockResolvedValue(lote), cambiarEstadoSi: vi.fn() },
          clientes: { buscarPorId: vi.fn().mockResolvedValue({ id: 7 }) },
          proyectos: { buscarPorId: vi.fn().mockResolvedValue({ id: 1, estado: estadoProyecto }) },
          reservas: { buscarActivaPorLote: vi.fn().mockResolvedValue(reservaActiva) },
          ventas: { crear: vi.fn() },
        };
        const servicio = new VentaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
        // Act
        const registrar = () => servicio.registrar({ loteId: 5, clienteId: 7, modalidad: 'CONTADO' }, usuarioAsesor);
        // Assert
        await expect(registrar()).rejects.toMatchObject({ codigo: codigoEsperado });
        expect(repos.lotes.cambiarEstadoSi).not.toHaveBeenCalled();
        expect(repos.ventas.crear).not.toHaveBeenCalled();
      },
    );

    it('lanza LOTE_NO_DISPONIBLE y deshace la conversión de la reserva si cambiarEstadoSi falla por concurrencia', async () => {
      // Arrange
      const memoria = lotesYReservasEnMemoria({
        lotes: [{ id: 5, proyectoId: 1, codigo: 'A-01', estado: 'RESERVADO', precio: 75000 }],
        reservas: [{ id: 20, loteId: 5, clienteId: 7, estado: 'ACTIVA', fechaVencimiento: MANIANA }],
      });
      const repos = {
        ...memoria.repos,
        lotes: {
          ...memoria.repos.lotes,
          cambiarEstadoSi: vi.fn().mockResolvedValue(false),
        },
        clientes: { buscarPorId: vi.fn().mockResolvedValue({ id: 7 }) },
        proyectos: { buscarPorId: vi.fn().mockResolvedValue({ id: 1, estado: 'PUBLICADO' }) },
        ventas: { crear: vi.fn() },
      };
      const servicio = new VentaServicio(unidadDeTrabajoFalsa(repos, memoria), relojEnHoy());
      // Act
      const registrar = () => servicio.registrar({ loteId: 5, clienteId: 7, modalidad: 'CONTADO' }, usuarioAsesor);
      // Assert
      await expect(registrar()).rejects.toMatchObject({ codigo: 'LOTE_NO_DISPONIBLE' });
      expect(memoria.reserva(20)?.estado).toBe('ACTIVA');
      expect(repos.ventas.crear).not.toHaveBeenCalled();
    });
  });

  describe('anular', () => {
    it('lanza LOTE_MODIFICADO cuando cambiarEstadoSi devuelve false al liberar el lote', async () => {
      // Arrange
      const repos = {
        ventas: {
          buscarPorId: vi.fn().mockResolvedValue({ id: 4, loteId: 5, estado: 'VIGENTE' }),
          anular: vi.fn().mockResolvedValue(true),
        },
        lotes: {
          cambiarEstadoSi: vi.fn().mockResolvedValue(false),
        },
      };
      const servicio = new VentaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act + Assert
      await expect(servicio.anular(4, 'Error en contrato', usuarioAdmin)).rejects.toMatchObject({
        codigo: 'LOTE_MODIFICADO',
      });
    });

    it('anula la venta VIGENTE con motivo recortado, libera el lote a DISPONIBLE y devuelve la venta actualizada', async () => {
      // Arrange
      const memoria = lotesYReservasEnMemoria({
        lotes: [{ id: 5, proyectoId: 1, codigo: 'A-01', estado: 'VENDIDO', precio: 75000 }],
        reservas: [],
      });
      const ventaVigente = vistaVenta({ id: 4, loteId: 5, estado: 'VIGENTE' });
      const ventaAnulada = vistaVenta({ id: 4, loteId: 5, estado: 'ANULADA' });
      const repos = {
        ...memoria.repos,
        ventas: {
          buscarPorId: vi.fn().mockResolvedValueOnce(ventaVigente).mockResolvedValueOnce(ventaAnulada),
          anular: vi.fn().mockResolvedValue(true),
        },
      };
      const servicio = new VentaServicio(unidadDeTrabajoFalsa(repos, memoria), relojEnHoy());
      // Act
      const resultado = await servicio.anular(4, '  Desistimiento acordado  ', usuarioAdmin);
      // Assert
      expect(repos.ventas.anular).toHaveBeenCalledWith(4, {
        motivo: 'Desistimiento acordado',
        anuladaPorId: usuarioAdmin.id,
        fecha: HOY,
      });
      expect(memoria.lote(5)?.estado).toBe('DISPONIBLE');
      expect(resultado.estado).toBe('ANULADA');
    });

    it('lanza NO_ENCONTRADO cuando la venta no existe al anular', async () => {
      // Arrange
      const repos = {
        ventas: { buscarPorId: vi.fn().mockResolvedValue(null), anular: vi.fn() },
        lotes: { cambiarEstadoSi: vi.fn() },
      };
      const servicio = new VentaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const anular = () => servicio.anular(999, 'Motivo válido', usuarioAdmin);
      // Assert
      await expect(anular()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
      expect(repos.ventas.anular).not.toHaveBeenCalled();
      expect(repos.lotes.cambiarEstadoSi).not.toHaveBeenCalled();
    });

    it.each([
      ['VENTA_NO_VIGENTE', { id: 4, loteId: 5, estado: 'ANULADA' as const }, 'Motivo válido'],
      ['MOTIVO_REQUERIDO', { id: 4, loteId: 5, estado: 'VIGENTE' as const }, 'Mal'],
    ] as const)('lanza %s sin modificar la venta ni liberar el lote', async (codigoEsperado, venta, motivo) => {
      // Arrange
      const repos = {
        ventas: { buscarPorId: vi.fn().mockResolvedValue(venta), anular: vi.fn() },
        lotes: { cambiarEstadoSi: vi.fn() },
      };
      const servicio = new VentaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const anular = () => servicio.anular(4, motivo, usuarioAdmin);
      // Assert
      await expect(anular()).rejects.toMatchObject({ codigo: codigoEsperado });
      expect(repos.ventas.anular).not.toHaveBeenCalled();
      expect(repos.lotes.cambiarEstadoSi).not.toHaveBeenCalled();
    });

    it('lanza VENTA_NO_VIGENTE sin liberar el lote cuando otra operación anuló la venta un instante antes', async () => {
      // Arrange
      const repos = {
        ventas: {
          buscarPorId: vi.fn().mockResolvedValue({ id: 4, loteId: 5, estado: 'VIGENTE' }),
          anular: vi.fn().mockResolvedValue(false),
        },
        lotes: { cambiarEstadoSi: vi.fn() },
      };
      const servicio = new VentaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const anular = () => servicio.anular(4, 'Error en contrato', usuarioAdmin);
      // Assert
      await expect(anular()).rejects.toMatchObject({ codigo: 'VENTA_NO_VIGENTE' });
      expect(repos.lotes.cambiarEstadoSi).not.toHaveBeenCalled();
    });
  });
});
