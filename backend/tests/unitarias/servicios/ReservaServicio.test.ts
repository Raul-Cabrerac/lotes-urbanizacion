// Consigna §5, §7 y §12: Vencimiento, cancelación y verificación de cambiarEstadoSi en reservas (Incidencia #5).
import { describe, expect, it, vi } from 'vitest';
import { MOTIVO_VENCIMIENTO_RESERVA } from '../../../src/aplicacion/servicios/expirarReserva';
import { ReservaServicio } from '../../../src/aplicacion/servicios/ReservaServicio';
import { ErrorConflicto } from '../../../src/dominio/errores';
import { OPERACIONES_LOTE } from '../../../src/dominio/lote';
import {
  AYER,
  fechaEnDias,
  HOY,
  lotesYReservasEnMemoria,
  MANIANA,
  relojEnHoy,
  unidadDeTrabajoFalsa,
  usuarioAsesor,
} from '../../apoyo/dobles';

const loteDisponible = { id: 1, proyectoId: 1, codigo: 'A-01', estado: 'DISPONIBLE' as const, precio: 45000 };
const vistaReserva = (id = 10, sobrescribir: Record<string, unknown> = {}) => ({
  id,
  loteId: 1,
  clienteId: 7,
  asesorId: usuarioAsesor.id,
  fecha: HOY,
  fechaVencimiento: MANIANA,
  observacion: 'Señal pagada',
  estado: 'ACTIVA',
  motivoFinalizacion: null,
  finalizadaEn: null,
  ...sobrescribir,
});

describe('ReservaServicio', () => {
  describe('listar', () => {
    it('lista reservas usando filtros vacíos por defecto cuando no recibe argumentos', async () => {
      // Arrange
      const listaEsperada = [vistaReserva(1), vistaReserva(2)];
      const repos = {
        reservas: { listar: vi.fn().mockResolvedValue(listaEsperada) },
      };
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const resultado = await servicio.listar();
      // Assert
      expect(repos.reservas.listar).toHaveBeenCalledWith({});
      expect(resultado).toEqual(listaEsperada);
    });

    it('reenvía los filtros indicados al repositorio al listar reservas', async () => {
      // Arrange
      const filtros = { estado: 'ACTIVA' as const, proyectoId: 3 };
      const listaEsperada = [vistaReserva(1)];
      const repos = {
        reservas: { listar: vi.fn().mockResolvedValue(listaEsperada) },
      };
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const resultado = await servicio.listar(filtros);
      // Assert
      expect(repos.reservas.listar).toHaveBeenCalledWith(filtros);
      expect(resultado).toEqual(listaEsperada);
    });
  });

  describe('obtener', () => {
    it('devuelve la reserva encontrada cuando existe', async () => {
      // Arrange
      const reserva = vistaReserva(10);
      const repos = {
        reservas: { buscarPorId: vi.fn().mockResolvedValue(reserva) },
      };
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const resultado = await servicio.obtener(10);
      // Assert
      expect(resultado).toEqual(reserva);
    });

    it('lanza NO_ENCONTRADO cuando la reserva no existe', async () => {
      // Arrange
      const repos = {
        reservas: { buscarPorId: vi.fn().mockResolvedValue(null) },
      };
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const consultar = () => servicio.obtener(999);
      // Assert
      await expect(consultar()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
    });
  });

  describe('crear', () => {
    it('lanza LOTE_NO_DISPONIBLE sin crear reserva cuando cambiarEstadoSi falla', async () => {
      // Arrange
      const repos = {
        lotes: {
          buscarPorId: vi.fn().mockResolvedValue({ id: 1, proyectoId: 1, codigo: 'A-01', estado: 'DISPONIBLE', precio: 45000 }),
          cambiarEstadoSi: vi.fn().mockResolvedValue(false), // otro usuario lo reservó un instante antes
        },
        clientes: { buscarPorId: vi.fn().mockResolvedValue({ id: 7 }) },
        proyectos: { buscarPorId: vi.fn().mockResolvedValue({ id: 1, estado: 'PUBLICADO' }) },
        reservas: { buscarActivaPorLote: vi.fn().mockResolvedValue(null), crear: vi.fn() },
      };
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act + Assert
      await expect(servicio.crear({ loteId: 1, clienteId: 7, anticipo: 8000 }, usuarioAsesor)).rejects.toMatchObject({
        codigo: 'LOTE_NO_DISPONIBLE',
      });
      expect(repos.reservas.crear).not.toHaveBeenCalled();
    });

    it('crea la reserva con fechaVencimiento y observación recortada y devuelve la vista completa', async () => {
      // Arrange
      const reservaCreada = vistaReserva(15);
      const repos = {
        lotes: {
          buscarPorId: vi.fn().mockResolvedValue(loteDisponible),
          cambiarEstadoSi: vi.fn().mockResolvedValue(true),
        },
        clientes: { buscarPorId: vi.fn().mockResolvedValue({ id: 7 }) },
        proyectos: { buscarPorId: vi.fn().mockResolvedValue({ id: 1, estado: 'PUBLICADO' }) },
        reservas: {
          buscarActivaPorLote: vi.fn().mockResolvedValue(null),
          crear: vi.fn().mockResolvedValue({ id: 15 }),
          buscarPorId: vi.fn().mockResolvedValue(reservaCreada),
        },
      };
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const resultado = await servicio.crear(
        { loteId: 1, clienteId: 7, fechaVencimiento: MANIANA, observacion: '  Señal pagada  ', anticipo: 8000 },
        usuarioAsesor,
      );
      // Assert
      expect(repos.lotes.cambiarEstadoSi).toHaveBeenCalledWith(1, OPERACIONES_LOTE.reservar);
      expect(repos.reservas.crear).toHaveBeenCalledWith({
        loteId: 1,
        clienteId: 7,
        asesorId: usuarioAsesor.id,
        fecha: HOY,
        fechaVencimiento: MANIANA,
        observacion: 'Señal pagada',
        anticipo: 8000,
        metodoAnticipo: 'EFECTIVO',
      });
      expect(resultado).toEqual(reservaCreada);
    });

    it('guarda fechaVencimiento en null y observación vacía cuando se omiten', async () => {
      // Arrange
      const reservaCreada = vistaReserva(16, { fechaVencimiento: null, observacion: '' });
      const repos = {
        lotes: {
          buscarPorId: vi.fn().mockResolvedValue(loteDisponible),
          cambiarEstadoSi: vi.fn().mockResolvedValue(true),
        },
        clientes: { buscarPorId: vi.fn().mockResolvedValue({ id: 7 }) },
        proyectos: { buscarPorId: vi.fn().mockResolvedValue({ id: 1, estado: 'PUBLICADO' }) },
        reservas: {
          buscarActivaPorLote: vi.fn().mockResolvedValue(null),
          crear: vi.fn().mockResolvedValue({ id: 16 }),
          buscarPorId: vi.fn().mockResolvedValue(reservaCreada),
        },
      };
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const resultado = await servicio.crear({ loteId: 1, clienteId: 7, anticipo: 8000 }, usuarioAsesor);
      // Assert
      expect(repos.reservas.crear).toHaveBeenCalledWith(
        expect.objectContaining({ fechaVencimiento: null, observacion: '' }),
      );
      expect(resultado).toEqual(reservaCreada);
    });

    it('vence una reserva expirada previa del lote y registra la nueva reserva', async () => {
      // Arrange
      const memoria = lotesYReservasEnMemoria({
        lotes: [{ id: 5, proyectoId: 1, codigo: 'A-03', estado: 'RESERVADO', precio: 72000 }],
        reservas: [{ id: 10, loteId: 5, clienteId: 99, estado: 'ACTIVA', fechaVencimiento: AYER }],
      });
      const nuevaVista = vistaReserva(21, { loteId: 5, clienteId: 7, fechaVencimiento: MANIANA, anticipo: 8000 });
      const repos = {
        ...memoria.repos,
        clientes: { buscarPorId: vi.fn().mockResolvedValue({ id: 7 }) },
        proyectos: { buscarPorId: vi.fn().mockResolvedValue({ id: 1, estado: 'PUBLICADO' }) },
        reservas: {
          ...memoria.repos.reservas,
          crear: vi.fn().mockResolvedValue({ id: 21 }),
          buscarPorId: vi.fn(async (id: number) =>
            id === 21 ? nuevaVista : memoria.repos.reservas.buscarPorId(id),
          ),
        },
      };
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(repos, memoria), relojEnHoy());
      // Act
      const resultado = await servicio.crear(
        { loteId: 5, clienteId: 7, fechaVencimiento: MANIANA, anticipo: 8000 },
        usuarioAsesor,
      );
      // Assert
      expect(memoria.reserva(10)).toMatchObject({ estado: 'VENCIDA', motivoFinalizacion: MOTIVO_VENCIMIENTO_RESERVA });
      expect(memoria.lote(5)?.estado).toBe('RESERVADO');
      expect(resultado).toEqual(nuevaVista);
    });

    it('lanza FECHA_VENCIMIENTO_INVALIDA sin consultar ni guardar cuando la fecha es anterior a hoy', async () => {
      // Arrange
      const repos = {
        lotes: { buscarPorId: vi.fn(), cambiarEstadoSi: vi.fn() },
        reservas: { buscarActivaPorLote: vi.fn(), crear: vi.fn() },
      };
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const crear = () => servicio.crear({ loteId: 1, clienteId: 7, fechaVencimiento: AYER, anticipo: 8000 }, usuarioAsesor);
      // Assert
      await expect(crear()).rejects.toMatchObject({ codigo: 'FECHA_VENCIMIENTO_INVALIDA' });
      expect(repos.lotes.buscarPorId).not.toHaveBeenCalled();
      expect(repos.reservas.crear).not.toHaveBeenCalled();
    });

    it('lanza NO_ENCONTRADO cuando el lote no existe', async () => {
      // Arrange
      const repos = {
        lotes: { buscarPorId: vi.fn().mockResolvedValue(null), cambiarEstadoSi: vi.fn() },
        clientes: { buscarPorId: vi.fn() },
        proyectos: { buscarPorId: vi.fn() },
        reservas: { buscarActivaPorLote: vi.fn().mockResolvedValue(null), crear: vi.fn() },
      };
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const crear = () => servicio.crear({ loteId: 999, clienteId: 7, anticipo: 8000 }, usuarioAsesor);
      // Assert
      await expect(crear()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
      expect(repos.reservas.crear).not.toHaveBeenCalled();
    });

    it('lanza NO_ENCONTRADO cuando el cliente no existe', async () => {
      // Arrange
      const repos = {
        lotes: { buscarPorId: vi.fn().mockResolvedValue(loteDisponible), cambiarEstadoSi: vi.fn() },
        clientes: { buscarPorId: vi.fn().mockResolvedValue(null) },
        proyectos: { buscarPorId: vi.fn() },
        reservas: { buscarActivaPorLote: vi.fn().mockResolvedValue(null), crear: vi.fn() },
      };
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const crear = () => servicio.crear({ loteId: 1, clienteId: 999, anticipo: 8000 }, usuarioAsesor);
      // Assert
      await expect(crear()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
      expect(repos.reservas.crear).not.toHaveBeenCalled();
    });

    it('lanza NO_ENCONTRADO cuando el proyecto del lote no existe', async () => {
      // Arrange
      const repos = {
        lotes: { buscarPorId: vi.fn().mockResolvedValue(loteDisponible), cambiarEstadoSi: vi.fn() },
        clientes: { buscarPorId: vi.fn().mockResolvedValue({ id: 7 }) },
        proyectos: { buscarPorId: vi.fn().mockResolvedValue(null) },
        reservas: { buscarActivaPorLote: vi.fn().mockResolvedValue(null), crear: vi.fn() },
      };
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const crear = () => servicio.crear({ loteId: 1, clienteId: 7, anticipo: 8000 }, usuarioAsesor);
      // Assert
      await expect(crear()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
      expect(repos.reservas.crear).not.toHaveBeenCalled();
    });

    it.each([
      ['lote no DISPONIBLE', { ...loteDisponible, estado: 'RESERVADO' as const }, 'PUBLICADO', 'LOTE_NO_DISPONIBLE'],
      ['lote sin precio', { ...loteDisponible, precio: 0 }, 'PUBLICADO', 'LOTE_SIN_PRECIO'],
      ['proyecto en BORRADOR', loteDisponible, 'BORRADOR', 'PROYECTO_NO_PUBLICADO'],
    ] as const)(
      'lanza %s (%s) sin cambiar estado ni guardar reserva cuando falla la validación de dominio',
      async (_desc, lote, estadoProyecto, codigoEsperado) => {
        // Arrange
        const repos = {
          lotes: { buscarPorId: vi.fn().mockResolvedValue(lote), cambiarEstadoSi: vi.fn() },
          clientes: { buscarPorId: vi.fn().mockResolvedValue({ id: 7 }) },
          proyectos: { buscarPorId: vi.fn().mockResolvedValue({ id: 1, estado: estadoProyecto }) },
          reservas: { buscarActivaPorLote: vi.fn().mockResolvedValue(null), crear: vi.fn() },
        };
        const servicio = new ReservaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
        // Act
        const crear = () => servicio.crear({ loteId: 1, clienteId: 7, anticipo: 8000 }, usuarioAsesor);
        // Assert
        await expect(crear()).rejects.toMatchObject({ codigo: codigoEsperado });
        expect(repos.lotes.cambiarEstadoSi).not.toHaveBeenCalled();
        expect(repos.reservas.crear).not.toHaveBeenCalled();
      },
    );

    it('guarda el anticipo y el método con que se cobró cuando se indican', async () => {
      // Arrange
      const repos = {
        lotes: {
          buscarPorId: vi.fn().mockResolvedValue(loteDisponible),
          cambiarEstadoSi: vi.fn().mockResolvedValue(true),
        },
        clientes: { buscarPorId: vi.fn().mockResolvedValue({ id: 7 }) },
        proyectos: { buscarPorId: vi.fn().mockResolvedValue({ id: 1, estado: 'PUBLICADO' }) },
        reservas: {
          buscarActivaPorLote: vi.fn().mockResolvedValue(null),
          crear: vi.fn().mockResolvedValue({ id: 17 }),
          buscarPorId: vi.fn().mockResolvedValue(vistaReserva(17)),
        },
      };
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      await servicio.crear({ loteId: 1, clienteId: 7, anticipo: 8000.5, metodoAnticipo: 'QR' }, usuarioAsesor);
      // Assert
      expect(repos.reservas.crear).toHaveBeenCalledWith(
        expect.objectContaining({ loteId: 1, clienteId: 7, anticipo: 8000.5, metodoAnticipo: 'QR' }),
      );
    });

    it('reserva en el límite: el anticipo es exactamente el 10 % del precio del lote (Bs 4.500 de Bs 45.000)', async () => {
      // Arrange
      const repos = {
        lotes: {
          buscarPorId: vi.fn().mockResolvedValue(loteDisponible),
          cambiarEstadoSi: vi.fn().mockResolvedValue(true),
        },
        clientes: { buscarPorId: vi.fn().mockResolvedValue({ id: 7 }) },
        proyectos: { buscarPorId: vi.fn().mockResolvedValue({ id: 1, estado: 'PUBLICADO' }) },
        reservas: {
          buscarActivaPorLote: vi.fn().mockResolvedValue(null),
          crear: vi.fn().mockResolvedValue({ id: 21 }),
          buscarPorId: vi.fn().mockResolvedValue(vistaReserva(21)),
        },
      };
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      await servicio.crear({ loteId: 1, clienteId: 7, anticipo: 4500 }, usuarioAsesor);
      // Assert
      expect(repos.reservas.crear).toHaveBeenCalledWith(expect.objectContaining({ anticipo: 4500 }));
    });

    it('reserva en el límite: el anticipo es 1 centavo menor al precio del lote (Bs 45.000)', async () => {
      // Arrange
      const repos = {
        lotes: {
          buscarPorId: vi.fn().mockResolvedValue(loteDisponible),
          cambiarEstadoSi: vi.fn().mockResolvedValue(true),
        },
        clientes: { buscarPorId: vi.fn().mockResolvedValue({ id: 7 }) },
        proyectos: { buscarPorId: vi.fn().mockResolvedValue({ id: 1, estado: 'PUBLICADO' }) },
        reservas: {
          buscarActivaPorLote: vi.fn().mockResolvedValue(null),
          crear: vi.fn().mockResolvedValue({ id: 18 }),
          buscarPorId: vi.fn().mockResolvedValue(vistaReserva(18)),
        },
      };
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      await servicio.crear({ loteId: 1, clienteId: 7, anticipo: 44999.99 }, usuarioAsesor);
      // Assert
      expect(repos.lotes.cambiarEstadoSi).toHaveBeenCalledWith(1, OPERACIONES_LOTE.reservar);
      expect(repos.reservas.crear).toHaveBeenCalledWith(expect.objectContaining({ anticipo: 44999.99 }));
    });

    it.each([
      ['ANTICIPO_INVALIDO', 'es 0 (reservar sin pagar)', 0],
      ['ANTICIPO_INVALIDO', 'es negativo', -500],
      ['ANTICIPO_INVALIDO', 'tiene 3 decimales', 5000.005],
      ['ANTICIPO_INSUFICIENTE', 'es 1 centavo menor al 10 % del precio (Bs 4.500)', 4499.99],
      ['ANTICIPO_EXCEDE_PRECIO', 'es igual al precio del lote (Bs 45.000)', 45000],
      ['ANTICIPO_EXCEDE_PRECIO', 'supera el precio del lote por 1 centavo', 45000.01],
    ] as const)(
      'lanza %s sin reservar el lote ni guardar la reserva cuando el anticipo %s',
      async (codigoEsperado, _caso, anticipo) => {
        // Arrange
        const repos = {
          lotes: {
            buscarPorId: vi.fn().mockResolvedValue(loteDisponible),
            cambiarEstadoSi: vi.fn().mockResolvedValue(true),
          },
          clientes: { buscarPorId: vi.fn().mockResolvedValue({ id: 7 }) },
          proyectos: { buscarPorId: vi.fn().mockResolvedValue({ id: 1, estado: 'PUBLICADO' }) },
          reservas: {
            buscarActivaPorLote: vi.fn().mockResolvedValue(null),
            crear: vi.fn().mockResolvedValue({ id: 19 }),
            buscarPorId: vi.fn().mockResolvedValue(vistaReserva(19)),
          },
        };
        const servicio = new ReservaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
          // Act
        const crear = () => servicio.crear({ loteId: 1, clienteId: 7, anticipo }, usuarioAsesor);
        // Assert
        await expect(crear()).rejects.toMatchObject({ codigo: codigoEsperado });
        expect(repos.lotes.cambiarEstadoSi).not.toHaveBeenCalled();
        expect(repos.reservas.crear).not.toHaveBeenCalled();
      },
    );
  });

  describe('cancelar', () => {
    it('vence la reserva, libera el lote y lanza RESERVA_NO_ACTIVA cuando ya pasó fechaVencimiento', async () => {
      // Arrange
      const memoria = lotesYReservasEnMemoria({
        lotes: [{ id: 5, proyectoId: 1, codigo: 'A-03', estado: 'RESERVADO', precio: 72000 }],
        reservas: [{ id: 10, loteId: 5, clienteId: 7, estado: 'ACTIVA', fechaVencimiento: AYER }],
      });
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(memoria.repos, memoria), relojEnHoy());
      // Act + Assert
      await expect(servicio.cancelar(10, 'Cliente desiste', usuarioAsesor)).rejects.toMatchObject({
        codigo: 'RESERVA_NO_ACTIVA',
      });
      // La cancelación falla, pero el vencimiento queda guardado: se confirmó en su propia transacción.
      expect(memoria.reserva(10)).toMatchObject({ estado: 'VENCIDA', motivoFinalizacion: MOTIVO_VENCIMIENTO_RESERVA });
      expect(memoria.lote(5)?.estado).toBe('DISPONIBLE');
    });

    it('cancela la reserva y libera el lote cuando la reserva vence hoy (2026-03-15)', async () => {
      // Arrange
      const memoria = lotesYReservasEnMemoria({
        lotes: [{ id: 5, proyectoId: 1, codigo: 'A-03', estado: 'RESERVADO', precio: 72000 }],
        reservas: [{ id: 10, loteId: 5, clienteId: 7, estado: 'ACTIVA', fechaVencimiento: fechaEnDias(0) }],
      });
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(memoria.repos, memoria), relojEnHoy());
      // Act
      await servicio.cancelar(10, 'Cliente desiste', usuarioAsesor);
      // Assert
      expect(memoria.reserva(10)).toMatchObject({ estado: 'CANCELADA', motivoFinalizacion: 'Cliente desiste' });
      expect(memoria.lote(5)?.estado).toBe('DISPONIBLE');
    });

    it('lanza LOTE_MODIFICADO cuando cambiarEstadoSi devuelve false al cancelar', async () => {
      // Arrange
      const reservaVigente = { id: 10, loteId: 5, clienteId: 7, estado: 'ACTIVA', fechaVencimiento: MANIANA };
      const repos = {
        reservas: {
          buscarPorId: vi.fn().mockResolvedValue(reservaVigente),
          finalizar: vi.fn().mockResolvedValue(true),
        },
        lotes: {
          cambiarEstadoSi: vi.fn().mockResolvedValue(false),
        },
      };
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act + Assert
      await expect(servicio.cancelar(10, 'Motivo válido', usuarioAsesor)).rejects.toMatchObject({
        codigo: 'LOTE_MODIFICADO',
      });
    });

    it('usa motivo por defecto con el nombre del usuario cuando el motivo está vacío', async () => {
      // Arrange
      const memoria = lotesYReservasEnMemoria({
        lotes: [{ id: 5, proyectoId: 1, codigo: 'A-03', estado: 'RESERVADO', precio: 72000 }],
        reservas: [{ id: 10, loteId: 5, clienteId: 7, estado: 'ACTIVA', fechaVencimiento: MANIANA }],
      });
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(memoria.repos, memoria), relojEnHoy());
      // Act
      const resultado = await servicio.cancelar(10, '   ', usuarioAsesor);
      // Assert
      expect(memoria.reserva(10)).toMatchObject({
        estado: 'CANCELADA',
        motivoFinalizacion: `Cancelada por ${usuarioAsesor.nombre}`,
      });
      expect(memoria.lote(5)?.estado).toBe('DISPONIBLE');
      expect(resultado.estado).toBe('CANCELADA');
    });

    it('lanza NO_ENCONTRADO cuando la reserva no existe al cancelar', async () => {
      // Arrange
      const repos = {
        reservas: { buscarPorId: vi.fn().mockResolvedValue(null), finalizar: vi.fn() },
        lotes: { cambiarEstadoSi: vi.fn() },
      };
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const cancelar = () => servicio.cancelar(999, 'Motivo', usuarioAsesor);
      // Assert
      await expect(cancelar()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
      expect(repos.reservas.finalizar).not.toHaveBeenCalled();
      expect(repos.lotes.cambiarEstadoSi).not.toHaveBeenCalled();
    });

    it('lanza RESERVA_NO_ACTIVA cuando finalizar devuelve false por cierre concurrente', async () => {
      // Arrange
      const reservaVigente = { id: 10, loteId: 5, clienteId: 7, estado: 'ACTIVA', fechaVencimiento: MANIANA };
      const repos = {
        reservas: {
          buscarPorId: vi.fn().mockResolvedValue(reservaVigente),
          finalizar: vi.fn().mockResolvedValue(false),
        },
        lotes: { cambiarEstadoSi: vi.fn() },
      };
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const cancelar = () => servicio.cancelar(10, 'Cliente desiste', usuarioAsesor);
      // Assert
      await expect(cancelar()).rejects.toMatchObject({ codigo: 'RESERVA_NO_ACTIVA' });
      expect(repos.lotes.cambiarEstadoSi).not.toHaveBeenCalled();
    });
  });

  describe('procesarVencidas', () => {
    it('omite la reserva cuyo lote ya no estaba RESERVADO y vence las demás', async () => {
      // Arrange: la primera reserva apunta a un lote inconsistente (otro usuario lo cambió)
      const memoria = lotesYReservasEnMemoria({
        lotes: [
          { id: 11, proyectoId: 1, codigo: 'A-01', estado: 'VENDIDO', precio: 78000 },
          { id: 12, proyectoId: 1, codigo: 'A-02', estado: 'RESERVADO', precio: 72000 },
        ],
        reservas: [
          { id: 1, loteId: 11, clienteId: 7, estado: 'ACTIVA', fechaVencimiento: AYER },
          { id: 2, loteId: 12, clienteId: 8, estado: 'ACTIVA', fechaVencimiento: AYER },
        ],
      });
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(memoria.repos, memoria), relojEnHoy());
      const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      // Act
      const vencidas = await servicio.procesarVencidas();
      // Assert
      expect(vencidas).toBe(1);
      expect(memoria.reserva(1)?.estado).toBe('ACTIVA');
      expect(memoria.lote(11)?.estado).toBe('VENDIDO');
      expect(memoria.reserva(2)?.estado).toBe('VENCIDA');
      expect(memoria.lote(12)?.estado).toBe('DISPONIBLE');
      expect(aviso).toHaveBeenCalledOnce();
      aviso.mockRestore();
    });

    it('devuelve 0 sin intentar vencer cuando ninguna candidata ha expirado', async () => {
      // Arrange
      const memoria = lotesYReservasEnMemoria({
        lotes: [{ id: 12, proyectoId: 1, codigo: 'A-02', estado: 'RESERVADO', precio: 72000 }],
        reservas: [{ id: 2, loteId: 12, clienteId: 8, estado: 'ACTIVA', fechaVencimiento: MANIANA }],
      });
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(memoria.repos, memoria), relojEnHoy());
      // Act
      const vencidas = await servicio.procesarVencidas();
      // Assert
      expect(vencidas).toBe(0);
      expect(memoria.repos.reservas.finalizar).not.toHaveBeenCalled();
      expect(memoria.reserva(2)?.estado).toBe('ACTIVA');
    });

    it('no incrementa el contador cuando una candidata vencida fue cerrada concurrentemente antes de vencerla', async () => {
      // Arrange
      const repos = {
        reservas: {
          listarCandidatasAVencer: vi.fn().mockResolvedValue([
            { id: 1, loteId: 11, clienteId: 7, estado: 'ACTIVA', fechaVencimiento: AYER },
          ]),
          buscarPorId: vi.fn().mockResolvedValue({
            id: 1,
            loteId: 11,
            clienteId: 7,
            estado: 'ACTIVA',
            fechaVencimiento: AYER,
          }),
          finalizar: vi.fn().mockResolvedValue(false),
        },
        lotes: { cambiarEstadoSi: vi.fn() },
      };
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const vencidas = await servicio.procesarVencidas();
      // Assert
      expect(vencidas).toBe(0);
      expect(repos.lotes.cambiarEstadoSi).not.toHaveBeenCalled();
    });

    it.each([
      ['error técnico inesperado', new Error('Fallo de conexión')],
      ['error de aplicación distinto de LOTE_MODIFICADO', new ErrorConflicto('RESERVA_NO_ACTIVA', 'Ya cerrada.')],
    ] as const)('relanza %s cuando ocurre durante procesarVencidas', async (_desc, errorSimulado) => {
      // Arrange
      const repos = {
        reservas: {
          listarCandidatasAVencer: vi.fn().mockResolvedValue([
            { id: 1, loteId: 11, clienteId: 7, estado: 'ACTIVA', fechaVencimiento: AYER },
          ]),
          buscarPorId: vi.fn().mockRejectedValue(errorSimulado),
        },
      };
      const servicio = new ReservaServicio(unidadDeTrabajoFalsa(repos), relojEnHoy());
      // Act
      const procesar = () => servicio.procesarVencidas();
      // Assert
      await expect(procesar()).rejects.toBe(errorSimulado);
    });
  });
});
