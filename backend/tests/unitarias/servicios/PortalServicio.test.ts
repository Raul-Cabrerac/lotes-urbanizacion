// Consigna §10, §11 y §12: Portal del cliente restringido al cliente del usuario autenticado.
import { describe, expect, it, vi } from 'vitest';
import type { UsuarioActual } from '../../../src/aplicacion/puertos';
import type { ClienteServicio } from '../../../src/aplicacion/servicios/ClienteServicio';
import { PortalServicio } from '../../../src/aplicacion/servicios/PortalServicio';
import { ErrorNoEncontrado } from '../../../src/dominio/errores';
import { permisosDeRol } from '../../../src/dominio/permisos';
import { usuarioAdmin, usuarioAsesor } from '../../apoyo/dobles';

const usuarioCliente = (clienteId: number | null = 7): UsuarioActual => ({
  id: 3,
  nombre: 'María René Banzer',
  email: 'cliente@lotes.bo',
  rol: 'CLIENTE',
  clienteId,
  permisos: permisosDeRol('CLIENTE'),
});

describe('PortalServicio', () => {
  describe('misOperaciones', () => {
    it('consulta las operaciones del cliente autenticado y devuelve cliente, ventas y reservas separados', async () => {
      // Arrange
      const usuario = usuarioCliente(7);
      const datosCliente = { id: 7, nombreCompleto: 'María René Banzer', documento: '4839201' };
      const reservas = [{ id: 20, loteId: 5, estado: 'ACTIVA' }];
      const ventas = [{ id: 30, loteId: 6, estado: 'VIGENTE' }];
      const clientes = {
        obtener: vi.fn().mockResolvedValue({ ...datosCliente, reservas, ventas }),
      };
      const servicio = new PortalServicio(clientes as unknown as ClienteServicio);
      // Act
      const resultado = await servicio.misOperaciones(usuario);
      // Assert
      expect(clientes.obtener).toHaveBeenCalledWith(7, usuario);
      expect(resultado).toEqual({
        cliente: datosCliente,
        ventas,
        reservas,
      });
    });

    it.each([
      ['ADMIN', usuarioAdmin],
      ['ASESOR', usuarioAsesor],
    ] as const)('lanza SIN_PERMISO sin consultar clientes cuando el usuario tiene rol %s', async (_rol, usuario) => {
      // Arrange
      const clientes = { obtener: vi.fn() };
      const servicio = new PortalServicio(clientes as unknown as ClienteServicio);
      // Act
      const consultar = () => servicio.misOperaciones(usuario);
      // Assert
      await expect(consultar()).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
      expect(clientes.obtener).not.toHaveBeenCalled();
    });

    it('lanza SIN_PERMISO sin consultar clientes cuando el usuario CLIENTE no está vinculado a un cliente', async () => {
      // Arrange
      const usuarioSinCliente = usuarioCliente(null);
      const clientes = { obtener: vi.fn() };
      const servicio = new PortalServicio(clientes as unknown as ClienteServicio);
      // Act
      const consultar = () => servicio.misOperaciones(usuarioSinCliente);
      // Assert
      await expect(consultar()).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
      expect(clientes.obtener).not.toHaveBeenCalled();
    });

    it('propaga NO_ENCONTRADO cuando el cliente vinculado no existe en ClienteServicio', async () => {
      // Arrange
      const usuario = usuarioCliente(999);
      const clientes = {
        obtener: vi.fn().mockRejectedValue(new ErrorNoEncontrado('Cliente no encontrado.')),
      };
      const servicio = new PortalServicio(clientes as unknown as ClienteServicio);
      // Act
      const consultar = () => servicio.misOperaciones(usuario);
      // Assert
      await expect(consultar()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
    });
  });
});
