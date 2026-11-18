import { describe, expect, it } from 'vitest';
import { validarMotivo, validarVentaAnulable } from './venta';

describe('venta', () => {
  describe('validarMotivo', () => {
    it('acepta motivos con longitud suficiente', () => {
      expect(() => validarMotivo('Cliente desestimo la operacion')).not.toThrow();
    });

    it('lanza MOTIVO_REQUERIDO si el motivo tiene menos de 5 caracteres', () => {
      expect(() => validarMotivo('')).toThrow(
        expect.objectContaining({ codigo: 'MOTIVO_REQUERIDO' }),
      );
      expect(() => validarMotivo('   ')).toThrow(
        expect.objectContaining({ codigo: 'MOTIVO_REQUERIDO' }),
      );
      expect(() => validarMotivo('abcd')).toThrow(
        expect.objectContaining({ codigo: 'MOTIVO_REQUERIDO' }),
      );
    });
  });

  describe('validarVentaAnulable', () => {
    it('permite anular una venta en estado VIGENTE con motivo valido', () => {
      expect(() => validarVentaAnulable({ estado: 'VIGENTE' }, 'Error en registro')).not.toThrow();
    });

    it('lanza VENTA_NO_VIGENTE si la venta ya estaba anulada', () => {
      expect(() => validarVentaAnulable({ estado: 'ANULADA' }, 'Error en registro')).toThrow(
        expect.objectContaining({ codigo: 'VENTA_NO_VIGENTE' }),
      );
    });
  });
});
