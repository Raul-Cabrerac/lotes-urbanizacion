import { describe, expect, it } from 'vitest';
import { permisosDeRol, tienePermiso } from './permisos';

describe('permisos', () => {
  describe('tienePermiso', () => {
    it('otorga permisos administrativos unicamente a ADMIN', () => {
      expect(tienePermiso('ADMIN', 'proyectos:gestionar')).toBe(true);
      expect(tienePermiso('ADMIN', 'usuarios:gestionar')).toBe(true);
      expect(tienePermiso('ADMIN', 'ventas:anular')).toBe(true);
      expect(tienePermiso('ASESOR', 'proyectos:gestionar')).toBe(false);
      expect(tienePermiso('CLIENTE', 'proyectos:gestionar')).toBe(false);
    });

    it('permite a ASESOR ver y gestionar operaciones comerciales', () => {
      expect(tienePermiso('ASESOR', 'lotes:ver')).toBe(true);
      expect(tienePermiso('ASESOR', 'reservas:gestionar')).toBe(true);
      expect(tienePermiso('ASESOR', 'ventas:registrar')).toBe(true);
      expect(tienePermiso('ASESOR', 'pagos:registrar')).toBe(true);
    });

    it('permite a CLIENTE ver su portal y sus ventas pero no gestionar', () => {
      expect(tienePermiso('CLIENTE', 'portal:ver')).toBe(true);
      expect(tienePermiso('CLIENTE', 'ventas:ver')).toBe(true);
      expect(tienePermiso('CLIENTE', 'lotes:gestionar')).toBe(false);
      expect(tienePermiso('CLIENTE', 'reservas:gestionar')).toBe(false);
    });
  });

  describe('permisosDeRol', () => {
    it('retorna la lista completa de permisos para ADMIN', () => {
      const lista = permisosDeRol('ADMIN');
      expect(lista).toContain('proyectos:gestionar');
      expect(lista).toContain('usuarios:gestionar');
      expect(lista).not.toContain('portal:ver');
    });

    it('retorna solo los permisos asignados a CLIENTE', () => {
      const lista = permisosDeRol('CLIENTE');
      expect(lista).toEqual(['ventas:ver', 'portal:ver']);
    });
  });
});
