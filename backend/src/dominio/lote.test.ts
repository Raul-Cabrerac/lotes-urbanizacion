import { describe, expect, it } from 'vitest';
import {
  LARGO_MAXIMO,
  puedeCambiarEstado,
  SUPERFICIE_MAXIMA_M2,
  TRANSICIONES_LOTE,
  validarCambioEstado,
  validarCambioEstadoManual,
  validarDatosComerciales,
  validarLoteEliminable,
  validarLoteReservable,
  validarLoteVendible,
} from './lote';

const crearLote = (estado: 'DISPONIBLE' | 'RESERVADO' | 'VENDIDO' | 'BLOQUEADO' = 'DISPONIBLE', precio = 50000) => ({
  codigo: 'A-01',
  estado,
  precio,
});

describe('lote', () => {
  describe('TRANSICIONES_LOTE y puedeCambiarEstado', () => {
    it('define las listas de transiciones del mapa de estados', () => {
      expect(TRANSICIONES_LOTE.DISPONIBLE).toEqual(['RESERVADO', 'VENDIDO', 'BLOQUEADO']);
      expect(TRANSICIONES_LOTE.RESERVADO).toEqual(['DISPONIBLE', 'VENDIDO']);
    });

    it('permite transiciones validas desde DISPONIBLE', () => {
      expect(puedeCambiarEstado('DISPONIBLE', 'RESERVADO')).toBe(true);
      expect(puedeCambiarEstado('DISPONIBLE', 'VENDIDO')).toBe(true);
      expect(puedeCambiarEstado('DISPONIBLE', 'BLOQUEADO')).toBe(true);
      expect(puedeCambiarEstado('DISPONIBLE', 'DISPONIBLE')).toBe(false);
    });

    it('permite transiciones validas desde RESERVADO', () => {
      expect(puedeCambiarEstado('RESERVADO', 'DISPONIBLE')).toBe(true);
      expect(puedeCambiarEstado('RESERVADO', 'VENDIDO')).toBe(true);
      expect(puedeCambiarEstado('RESERVADO', 'BLOQUEADO')).toBe(false);
    });

    it('permite volver a DISPONIBLE desde VENDIDO solo al anular', () => {
      expect(puedeCambiarEstado('VENDIDO', 'DISPONIBLE')).toBe(true);
      expect(puedeCambiarEstado('VENDIDO', 'RESERVADO')).toBe(false);
      expect(puedeCambiarEstado('VENDIDO', 'BLOQUEADO')).toBe(false);
    });

    it('permite volver a DISPONIBLE desde BLOQUEADO', () => {
      expect(puedeCambiarEstado('BLOQUEADO', 'DISPONIBLE')).toBe(true);
      expect(puedeCambiarEstado('BLOQUEADO', 'RESERVADO')).toBe(false);
      expect(puedeCambiarEstado('BLOQUEADO', 'VENDIDO')).toBe(false);
    });
  });

  describe('validarCambioEstado', () => {
    it('no lanza error cuando la transicion es valida', () => {
      expect(() => validarCambioEstado('DISPONIBLE', 'RESERVADO')).not.toThrow();
    });

    it('lanza TRANSICION_INVALIDA cuando la transicion no esta permitida', () => {
      expect(() => validarCambioEstado('BLOQUEADO', 'VENDIDO')).toThrow(
        expect.objectContaining({ codigo: 'TRANSICION_INVALIDA' }),
      );
    });
  });

  describe('validarCambioEstadoManual', () => {
    it('permite bloquear un lote disponible', () => {
      expect(() => validarCambioEstadoManual('DISPONIBLE', 'BLOQUEADO')).not.toThrow();
    });

    it('permite desbloquear un lote bloqueado', () => {
      expect(() => validarCambioEstadoManual('BLOQUEADO', 'DISPONIBLE')).not.toThrow();
    });

    it.each([
      ['DISPONIBLE', 'RESERVADO'],
      ['DISPONIBLE', 'VENDIDO'],
      ['RESERVADO', 'DISPONIBLE'],
      ['VENDIDO', 'DISPONIBLE'],
    ] as const)('lanza CAMBIO_ESTADO_NO_PERMITIDO de %s a %s', (actual, nuevo) => {
      expect(() => validarCambioEstadoManual(actual, nuevo)).toThrow(
        expect.objectContaining({ codigo: 'CAMBIO_ESTADO_NO_PERMITIDO' }),
      );
    });
  });

  describe('validarLoteReservable', () => {
    it('permite reservar un lote DISPONIBLE con precio en proyecto PUBLICADO', () => {
      const lote = crearLote('DISPONIBLE', 70000);
      expect(() => validarLoteReservable(lote, 'PUBLICADO')).not.toThrow();
    });

    it('lanza PROYECTO_NO_PUBLICADO si el proyecto esta en BORRADOR', () => {
      const lote = crearLote('DISPONIBLE', 70000);
      expect(() => validarLoteReservable(lote, 'BORRADOR')).toThrow(
        expect.objectContaining({ codigo: 'PROYECTO_NO_PUBLICADO' }),
      );
    });

    it.each(['RESERVADO', 'VENDIDO', 'BLOQUEADO'] as const)(
      'lanza LOTE_NO_DISPONIBLE si el estado es %s',
      (estado) => {
        const lote = crearLote(estado, 70000);
        expect(() => validarLoteReservable(lote, 'PUBLICADO')).toThrow(
          expect.objectContaining({ codigo: 'LOTE_NO_DISPONIBLE' }),
        );
      },
    );

    it('lanza LOTE_SIN_PRECIO si el precio es 0 o negativo', () => {
      const loteSinPrecio = crearLote('DISPONIBLE', 0);
      expect(() => validarLoteReservable(loteSinPrecio, 'PUBLICADO')).toThrow(
        expect.objectContaining({ codigo: 'LOTE_SIN_PRECIO' }),
      );
    });
  });

  describe('validarLoteVendible', () => {
    it('permite vender un lote DISPONIBLE en proyecto PUBLICADO', () => {
      const lote = crearLote('DISPONIBLE', 75000);
      expect(() => validarLoteVendible(lote, 'PUBLICADO', 1, null)).not.toThrow();
    });

    it('permite vender un lote RESERVADO al mismo cliente de la reserva', () => {
      const lote = crearLote('RESERVADO', 75000);
      expect(() => validarLoteVendible(lote, 'PUBLICADO', 10, { clienteId: 10 })).not.toThrow();
    });

    it('lanza LOTE_RESERVADO_POR_OTRO_CLIENTE si el cliente no coincide', () => {
      const lote = crearLote('RESERVADO', 75000);
      expect(() => validarLoteVendible(lote, 'PUBLICADO', 20, { clienteId: 10 })).toThrow(
        expect.objectContaining({ codigo: 'LOTE_RESERVADO_POR_OTRO_CLIENTE' }),
      );
    });

    it('lanza LOTE_YA_VENDIDO si el lote esta en estado VENDIDO', () => {
      const lote = crearLote('VENDIDO', 75000);
      expect(() => validarLoteVendible(lote, 'PUBLICADO', 1, null)).toThrow(
        expect.objectContaining({ codigo: 'LOTE_YA_VENDIDO' }),
      );
    });

    it('lanza LOTE_BLOQUEADO si el lote esta en estado BLOQUEADO', () => {
      const lote = crearLote('BLOQUEADO', 75000);
      expect(() => validarLoteVendible(lote, 'PUBLICADO', 1, null)).toThrow(
        expect.objectContaining({ codigo: 'LOTE_BLOQUEADO' }),
      );
    });

    it('lanza LOTE_SIN_PRECIO si no tiene precio asignado', () => {
      const lote = crearLote('DISPONIBLE', 0);
      expect(() => validarLoteVendible(lote, 'PUBLICADO', 1, null)).toThrow(
        expect.objectContaining({ codigo: 'LOTE_SIN_PRECIO' }),
      );
    });
  });

  describe('validarDatosComerciales', () => {
    const datosValidos = {
      codigo: 'L-101',
      manzano: 'Manzano 1',
      etapa: 'Etapa 1',
      dimensiones: '10x30m',
      precio: 45000,
      superficieM2: 300,
    };

    it('valida datos comerciales correctos', () => {
      expect(() => validarDatosComerciales(datosValidos)).not.toThrow();
    });

    it('lanza CODIGO_LOTE_REQUERIDO si el codigo esta vacio', () => {
      expect(() => validarDatosComerciales({ ...datosValidos, codigo: '   ' })).toThrow(
        expect.objectContaining({ codigo: 'CODIGO_LOTE_REQUERIDO' }),
      );
    });

    it('lanza TEXTO_DEMASIADO_LARGO si supera el limite permitido', () => {
      const codigoLargo = 'A'.repeat(LARGO_MAXIMO.codigo + 1);
      expect(() => validarDatosComerciales({ ...datosValidos, codigo: codigoLargo })).toThrow(
        expect.objectContaining({ codigo: 'TEXTO_DEMASIADO_LARGO' }),
      );
    });

    it('lanza PRECIO_INVALIDO si el precio es negativo o excede el maximo', () => {
      expect(() => validarDatosComerciales({ ...datosValidos, precio: -1 })).toThrow(
        expect.objectContaining({ codigo: 'PRECIO_INVALIDO' }),
      );
    });

    it('lanza SUPERFICIE_INVALIDA si la superficie es 0 o excede el limite', () => {
      expect(() => validarDatosComerciales({ ...datosValidos, superficieM2: 0 })).toThrow(
        expect.objectContaining({ codigo: 'SUPERFICIE_INVALIDA' }),
      );
      expect(() => validarDatosComerciales({ ...datosValidos, superficieM2: SUPERFICIE_MAXIMA_M2 + 1 })).toThrow(
        expect.objectContaining({ codigo: 'SUPERFICIE_INVALIDA' }),
      );
    });
  });

  describe('validarLoteEliminable', () => {
    it('permite eliminar un lote DISPONIBLE sin operaciones', () => {
      const lote = crearLote('DISPONIBLE');
      expect(() => validarLoteEliminable(lote, false)).not.toThrow();
    });

    it('lanza LOTE_CON_OPERACIONES si tiene operaciones registradas', () => {
      const lote = crearLote('DISPONIBLE');
      expect(() => validarLoteEliminable(lote, true)).toThrow(
        expect.objectContaining({ codigo: 'LOTE_CON_OPERACIONES' }),
      );
    });

    it('lanza LOTE_CON_OPERACIONES si el lote esta RESERVADO o VENDIDO', () => {
      const lote = crearLote('RESERVADO');
      expect(() => validarLoteEliminable(lote, false)).toThrow(
        expect.objectContaining({ codigo: 'LOTE_CON_OPERACIONES' }),
      );
    });
  });
});
