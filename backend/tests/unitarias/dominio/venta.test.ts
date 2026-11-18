// Consigna §12: Calcular el saldo pendiente de un cliente: suma solo sus ventas VIGENTES.
import { describe, expect, it } from 'vitest';
import type { EstadoVenta } from '../../../src/dominio/tipos';
import { saldoPendienteDelCliente } from '../../../src/dominio/venta';

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
  });
});
