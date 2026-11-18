// Consigna §12: Reglas de pagos y trazabilidad de anulaciones (Incidencia #3).
import { describe, expect, it } from 'vitest';
import { validarPagoAnulable } from '../../../src/dominio/planPagos';

describe('planPagos', () => {
  describe('validarPagoAnulable', () => {
    it('no lanza error cuando la venta está VIGENTE, el pago VALIDO y el motivo es válido', () => {
      // Arrange
      const pago = { estado: 'VALIDO' as const };
      // Act
      const validar = () => validarPagoAnulable(pago, 'Error en método de pago', 'VIGENTE');
      // Assert
      expect(validar).not.toThrow();
    });

    it('lanza VENTA_NO_VIGENTE cuando la venta está ANULADA', () => {
      // Arrange
      const pago = { estado: 'VALIDO' as const };
      // Act + Assert
      expect(() => validarPagoAnulable(pago, 'Intento tras anulación', 'ANULADA')).toThrow(
        expect.objectContaining({ codigo: 'VENTA_NO_VIGENTE' }),
      );
    });

    it('lanza PAGO_YA_ANULADO cuando el pago ya está ANULADO', () => {
      // Arrange
      const pago = { estado: 'ANULADO' as const };
      // Act + Assert
      expect(() => validarPagoAnulable(pago, 'Motivo válido', 'VIGENTE')).toThrow(
        expect.objectContaining({ codigo: 'PAGO_YA_ANULADO' }),
      );
    });

    it('lanza MOTIVO_REQUERIDO cuando el motivo tiene menos de 5 caracteres', () => {
      // Arrange
      const pago = { estado: 'VALIDO' as const };
      // Act + Assert
      expect(() => validarPagoAnulable(pago, 'abc', 'VIGENTE')).toThrow(
        expect.objectContaining({ codigo: 'MOTIVO_REQUERIDO' }),
      );
    });
  });
});
