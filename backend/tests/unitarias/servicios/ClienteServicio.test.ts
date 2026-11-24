// Consigna §6 y §12: Gestión de clientes, historial de operaciones y documento único.
import { describe, expect, it, vi } from 'vitest';
import { ClienteServicio } from '../../../src/aplicacion/servicios/ClienteServicio';
import type { VentaServicio } from '../../../src/aplicacion/servicios/VentaServicio';
import { unidadDeTrabajoFalsa, usuarioAsesor } from '../../apoyo/dobles';

const clienteBase = (sobrescribir: Record<string, unknown> = {}) => ({
  id: 7,
  nombreCompleto: 'Carlos Mendoza',
  documento: '8901234',
  telefono: '71234567',
  email: 'carlos@ejemplo.bo',
  direccion: 'Av. Banzer 450',
  ...sobrescribir,
});

describe('ClienteServicio', () => {
  describe('listar', () => {
    it('reenvía el criterio de búsqueda al repositorio y devuelve los clientes encontrados', async () => {
      // Arrange
      const lista = [clienteBase()];
      const repos = {
        clientes: { listar: vi.fn().mockResolvedValue(lista) },
      };
      const servicio = new ClienteServicio(unidadDeTrabajoFalsa(repos), {} as VentaServicio);
      // Act
      const resultado = await servicio.listar('Carlos');
      // Assert
      expect(repos.clientes.listar).toHaveBeenCalledWith('Carlos');
      expect(resultado).toEqual(lista);
    });
  });

  describe('obtener', () => {
    it('devuelve el cliente junto con sus reservas y ventas consultando ambos servicios', async () => {
      // Arrange
      const cliente = clienteBase();
      const reservas = [{ id: 10, loteId: 5, estado: 'ACTIVA' }];
      const ventasCliente = [{ id: 30, loteId: 6, estado: 'VIGENTE' }];
      const repos = {
        clientes: { buscarPorId: vi.fn().mockResolvedValue(cliente) },
        reservas: { listar: vi.fn().mockResolvedValue(reservas) },
      };
      const ventas = { listar: vi.fn().mockResolvedValue(ventasCliente) };
      const servicio = new ClienteServicio(unidadDeTrabajoFalsa(repos), ventas as unknown as VentaServicio);
      // Act
      const resultado = await servicio.obtener(7, usuarioAsesor);
      // Assert
      expect(repos.reservas.listar).toHaveBeenCalledWith({ clienteId: 7 });
      expect(ventas.listar).toHaveBeenCalledWith({ clienteId: 7 }, usuarioAsesor);
      expect(resultado).toEqual({ ...cliente, reservas, ventas: ventasCliente });
    });

    it('lanza NO_ENCONTRADO sin consultar reservas ni ventas cuando el cliente no existe', async () => {
      // Arrange
      const repos = {
        clientes: { buscarPorId: vi.fn().mockResolvedValue(null) },
        reservas: { listar: vi.fn() },
      };
      const ventas = { listar: vi.fn() };
      const servicio = new ClienteServicio(unidadDeTrabajoFalsa(repos), ventas as unknown as VentaServicio);
      // Act
      const consultar = () => servicio.obtener(999, usuarioAsesor);
      // Assert
      await expect(consultar()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
      expect(repos.reservas.listar).not.toHaveBeenCalled();
      expect(ventas.listar).not.toHaveBeenCalled();
    });
  });

  describe('crear', () => {
    it('valida documento único y registra el cliente cuando no existe otro con ese documento', async () => {
      // Arrange
      const datos = {
        nombreCompleto: 'Carlos Mendoza',
        documento: '8901234',
        telefono: '71234567',
        email: 'carlos@ejemplo.bo',
        direccion: 'Av. Banzer 450',
      };
      const creado = clienteBase();
      const repos = {
        clientes: {
          buscarPorDocumento: vi.fn().mockResolvedValue(null),
          crear: vi.fn().mockResolvedValue(creado),
        },
      };
      const servicio = new ClienteServicio(unidadDeTrabajoFalsa(repos), {} as VentaServicio);
      // Act
      const resultado = await servicio.crear(datos);
      // Assert
      expect(repos.clientes.buscarPorDocumento).toHaveBeenCalledWith('8901234');
      expect(repos.clientes.crear).toHaveBeenCalledWith(datos);
      expect(resultado).toEqual(creado);
    });

    it('lanza DOCUMENTO_DUPLICADO sin guardar cuando ya existe un cliente con ese documento', async () => {
      // Arrange
      const datos = {
        nombreCompleto: 'Otro Cliente',
        documento: '8901234',
        telefono: '70000000',
        email: 'otro@ejemplo.bo',
        direccion: 'Calle 1',
      };
      const repos = {
        clientes: {
          buscarPorDocumento: vi.fn().mockResolvedValue(clienteBase()),
          crear: vi.fn(),
        },
      };
      const servicio = new ClienteServicio(unidadDeTrabajoFalsa(repos), {} as VentaServicio);
      // Act
      const crear = () => servicio.crear(datos);
      // Assert
      await expect(crear()).rejects.toMatchObject({ codigo: 'DOCUMENTO_DUPLICADO' });
      expect(repos.clientes.crear).not.toHaveBeenCalled();
    });
  });

  describe('actualizar', () => {
    it('actualiza sin revalidar unicidad cuando se conserva el mismo documento', async () => {
      // Arrange
      const actual = clienteBase({ documento: '8901234' });
      const actualizado = { ...actual, telefono: '79999999' };
      const repos = {
        clientes: {
          buscarPorId: vi.fn().mockResolvedValue(actual),
          buscarPorDocumento: vi.fn(),
          actualizar: vi.fn().mockResolvedValue(actualizado),
        },
      };
      const servicio = new ClienteServicio(unidadDeTrabajoFalsa(repos), {} as VentaServicio);
      // Act
      const resultado = await servicio.actualizar(7, { documento: '8901234', telefono: '79999999' });
      // Assert
      expect(repos.clientes.buscarPorDocumento).not.toHaveBeenCalled();
      expect(repos.clientes.actualizar).toHaveBeenCalledWith(7, { documento: '8901234', telefono: '79999999' });
      expect(resultado).toEqual(actualizado);
    });

    it('valida el nuevo documento y actualiza cuando no está ocupado por otro cliente', async () => {
      // Arrange
      const actual = clienteBase({ documento: '8901234' });
      const actualizado = { ...actual, documento: '9998887' };
      const repos = {
        clientes: {
          buscarPorId: vi.fn().mockResolvedValue(actual),
          buscarPorDocumento: vi.fn().mockResolvedValue(null),
          actualizar: vi.fn().mockResolvedValue(actualizado),
        },
      };
      const servicio = new ClienteServicio(unidadDeTrabajoFalsa(repos), {} as VentaServicio);
      // Act
      const resultado = await servicio.actualizar(7, { documento: '9998887' });
      // Assert
      expect(repos.clientes.buscarPorDocumento).toHaveBeenCalledWith('9998887');
      expect(repos.clientes.actualizar).toHaveBeenCalledWith(7, { documento: '9998887' });
      expect(resultado).toEqual(actualizado);
    });

    it('lanza NO_ENCONTRADO cuando el cliente a actualizar no existe', async () => {
      // Arrange
      const repos = {
        clientes: { buscarPorId: vi.fn().mockResolvedValue(null), actualizar: vi.fn() },
      };
      const servicio = new ClienteServicio(unidadDeTrabajoFalsa(repos), {} as VentaServicio);
      // Act
      const actualizar = () => servicio.actualizar(999, { telefono: '79999999' });
      // Assert
      await expect(actualizar()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
      expect(repos.clientes.actualizar).not.toHaveBeenCalled();
    });

    it('lanza DOCUMENTO_DUPLICADO sin actualizar cuando el nuevo documento ya pertenece a otro cliente', async () => {
      // Arrange
      const repos = {
        clientes: {
          buscarPorId: vi.fn().mockResolvedValue(clienteBase({ id: 7, documento: '8901234' })),
          buscarPorDocumento: vi.fn().mockResolvedValue(clienteBase({ id: 8, documento: '5554443' })),
          actualizar: vi.fn(),
        },
      };
      const servicio = new ClienteServicio(unidadDeTrabajoFalsa(repos), {} as VentaServicio);
      // Act
      const actualizar = () => servicio.actualizar(7, { documento: '5554443' });
      // Assert
      await expect(actualizar()).rejects.toMatchObject({ codigo: 'DOCUMENTO_DUPLICADO' });
      expect(repos.clientes.actualizar).not.toHaveBeenCalled();
    });
  });
});
