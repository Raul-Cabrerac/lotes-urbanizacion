// Consigna §12: Calcular el saldo pendiente de un cliente: suma solo sus ventas VIGENTES.
import { describe, expect, it } from 'vitest';
import { ErrorConflicto } from '../../../src/dominio/errores';
import type { EstadoVenta } from '../../../src/dominio/tipos';
import { admite } from '../../../src/dominio/transiciones';
import {
  LONGITUD_MINIMA_MOTIVO,
  OPERACIONES_VENTA,
  saldoPendienteDelCliente,
  validarMotivo,
  validarVentaAnulable,
  ventaYaAnulada,
} from '../../../src/dominio/venta';

const venta = (estado: EstadoVenta, saldoPendiente: number) => ({ estado, resumen: { saldoPendiente } });

describe('venta', () => {
  describe('saldoPendienteDelCliente', () => {
    it('devuelve 0.3 exacto cuando el cliente tiene dos ventas VIGENTES con saldo 0.1 y 0.2', () => {
      // Arrange
      const ventas = [venta('VIGENTE', 0.1), venta('VIGENTE', 0.2)];
      // Act
      const saldo = saldoPendienteDelCliente(ventas);
      // Assert
      expect(saldo).toBe(0.3);
    });

    it('no suma el saldo de una venta ANULADA', () => {
      // Arrange
      const ventas = [venta('VIGENTE', 55000), venta('ANULADA', 20000)];
      // Act
      const saldo = saldoPendienteDelCliente(ventas);
      // Assert
      expect(saldo).toBe(55000);
    });

    it('devuelve 0 cuando el cliente no tiene ventas', () => {
      // Arrange
      const ventas: ReturnType<typeof venta>[] = [];
      // Act
      const saldo = saldoPendienteDelCliente(ventas);
      // Assert
      expect(saldo).toBe(0);
    });

    it('devuelve 0 cuando todas las ventas del cliente están ANULADA', () => {
      // Arrange
      const ventas = [venta('ANULADA', 15000), venta('ANULADA', 25000)];
      // Act
      const saldo = saldoPendienteDelCliente(ventas);
      // Assert
      expect(saldo).toBe(0);
    });
  });

  describe('OPERACIONES_VENTA', () => {
    it.each([
      ['VIGENTE', true],
      ['ANULADA', false],
    ] as const)('admite anular cuando el estado es %s -> %s', (estado, esperado) => {
      // Arrange
      const transicion = OPERACIONES_VENTA.anular;
      // Act
      const permitida = admite(transicion, estado);
      // Assert
      expect(permitida).toBe(esperado);
    });

    it('define ANULADA como estado destino de anular', () => {
      // Arrange
      const transicion = OPERACIONES_VENTA.anular;
      // Act
      const destino = transicion.a;
      // Assert
      expect(destino).toBe('ANULADA');
    });
  });

  describe('validarMotivo', () => {
    it('no lanza error cuando el motivo tiene al menos el mínimo de caracteres requerido', () => {
      // Arrange
      const motivo = 'Error en la modalidad de pago registrada';
      // Act
      const validar = () => validarMotivo(motivo);
      // Assert
      expect(validar).not.toThrow();
    });

    it.each([
      ['exactamente 5 caracteres sin espacios', 'Error'],
      ['exactamente 5 caracteres útiles rodeados de espacios', '  Error  '],
    ] as const)('no lanza error en el límite válido (%s)', (_desc, motivo) => {
      // Arrange
      const texto = motivo;
      // Act
      const validar = () => validarMotivo(texto);
      // Assert
      expect(validar).not.toThrow();
    });

    it.each([
      ['cadena vacía', ''],
      ['solo espacios', '     '],
      ['4 caracteres (bajo el límite de 5)', 'abcd'],
      ['4 caracteres útiles rodeados de espacios', '  abcd  '],
    ] as const)('lanza MOTIVO_REQUERIDO cuando el motivo es %s', (_desc, motivo) => {
      // Arrange
      const texto = motivo;
      // Act
      const validar = () => validarMotivo(texto);
      // Assert
      expect(validar).toThrow(
        expect.objectContaining({ codigo: 'MOTIVO_REQUERIDO' }),
      );
    });
  });

  describe('validarVentaAnulable', () => {
    it('no lanza error cuando la venta está VIGENTE y el motivo es válido', () => {
      // Arrange
      const ventaVigente = { estado: 'VIGENTE' as const };
      // Act
      const validar = () => validarVentaAnulable(ventaVigente, 'Cliente desistió de la compra');
      // Assert
      expect(validar).not.toThrow();
    });

    it('no lanza error cuando la venta está VIGENTE y el motivo tiene exactamente el largo mínimo', () => {
      // Arrange
      const ventaVigente = { estado: 'VIGENTE' as const };
      const motivoMinimo = 'X'.repeat(LONGITUD_MINIMA_MOTIVO);
      // Act
      const validar = () => validarVentaAnulable(ventaVigente, motivoMinimo);
      // Assert
      expect(validar).not.toThrow();
    });

    it('lanza VENTA_NO_VIGENTE cuando la venta ya está ANULADA', () => {
      // Arrange
      const ventaAnulada = { estado: 'ANULADA' as const };
      // Act
      const validar = () => validarVentaAnulable(ventaAnulada, 'Motivo válido suficiente');
      // Assert
      expect(validar).toThrow(
        expect.objectContaining({ codigo: 'VENTA_NO_VIGENTE' }),
      );
    });

    it('lanza MOTIVO_REQUERIDO cuando la venta está VIGENTE pero el motivo es inválido', () => {
      // Arrange
      const ventaVigente = { estado: 'VIGENTE' as const };
      // Act
      const validar = () => validarVentaAnulable(ventaVigente, 'abc');
      // Assert
      expect(validar).toThrow(
        expect.objectContaining({ codigo: 'MOTIVO_REQUERIDO' }),
      );
    });

    it('prioriza VENTA_NO_VIGENTE sobre MOTIVO_REQUERIDO cuando la venta está ANULADA y el motivo es inválido', () => {
      // Arrange
      const ventaAnulada = { estado: 'ANULADA' as const };
      // Act
      const validar = () => validarVentaAnulable(ventaAnulada, '');
      // Assert
      expect(validar).toThrow(
        expect.objectContaining({ codigo: 'VENTA_NO_VIGENTE' }),
      );
    });
  });

  describe('ventaYaAnulada', () => {
    it('devuelve un ErrorConflicto con código VENTA_NO_VIGENTE', () => {
      // Arrange
      const construirError = ventaYaAnulada;
      // Act
      const error = construirError();
      // Assert
      expect(error).toBeInstanceOf(ErrorConflicto);
      expect(error).toMatchObject({
        codigo: 'VENTA_NO_VIGENTE',
        tipo: 'conflicto',
      });
    });
  });
});
