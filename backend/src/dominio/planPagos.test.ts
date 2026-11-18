import { describe, expect, it } from 'vitest';
import {
  calcularEstadoCuota,
  generarPlanDePagos,
  resumirPlan,
  validarPago,
  validarPagoAnulable,
} from './planPagos';

describe('planPagos', () => {
  describe('generarPlanDePagos', () => {
    it('genera una sola cuota para venta al contado', () => {
      const cuotas = generarPlanDePagos({
        precioPactado: 80000,
        modalidad: 'CONTADO',
        fechaVenta: '2026-03-01',
      });

      expect(cuotas).toHaveLength(1);
      expect(cuotas[0].numero).toBe(0);
      expect(cuotas[0].monto).toBe(80000);
      expect(cuotas[0].fechaVencimiento).toBe('2026-03-01');
    });

    it('genera plan financiado con cuota inicial y reparte centavos sobrantes en la ultima cuota', () => {
      const cuotas = generarPlanDePagos({
        precioPactado: 100,
        modalidad: 'FINANCIADO',
        cuotaInicial: 0,
        numeroCuotas: 3,
        fechaVenta: '2026-01-15',
      });

      expect(cuotas).toHaveLength(3);
      expect(cuotas[0].monto).toBe(33.33);
      expect(cuotas[1].monto).toBe(33.33);
      expect(cuotas[2].monto).toBe(33.34);
      expect(cuotas[0].monto + cuotas[1].monto + cuotas[2].monto).toBe(100);
      expect(cuotas[0].fechaVencimiento).toBe('2026-02-15');
      expect(cuotas[1].fechaVencimiento).toBe('2026-03-15');
      expect(cuotas[2].fechaVencimiento).toBe('2026-04-15');
    });

    it('incluye cuota inicial numero 0 cuando es mayor a 0', () => {
      const cuotas = generarPlanDePagos({
        precioPactado: 75000,
        modalidad: 'FINANCIADO',
        cuotaInicial: 15000,
        numeroCuotas: 12,
        fechaVenta: '2026-01-15',
      });

      expect(cuotas).toHaveLength(13);
      expect(cuotas[0].numero).toBe(0);
      expect(cuotas[0].monto).toBe(15000);
      expect(cuotas[0].fechaVencimiento).toBe('2026-01-15');
      expect(cuotas[1].numero).toBe(1);
      expect(cuotas[1].monto).toBe(5000);
      expect(cuotas[12].numero).toBe(12);
      expect(cuotas[12].monto).toBe(5000);
    });

    it('lanza PRECIO_PACTADO_INVALIDO si el precio no es valido', () => {
      expect(() =>
        generarPlanDePagos({
          precioPactado: 0,
          modalidad: 'CONTADO',
          fechaVenta: '2026-01-15',
        }),
      ).toThrow(expect.objectContaining({ codigo: 'PRECIO_PACTADO_INVALIDO' }));
    });

    it('lanza CUOTA_INICIAL_INVALIDA si la cuota inicial iguala o supera el precio', () => {
      expect(() =>
        generarPlanDePagos({
          precioPactado: 50000,
          modalidad: 'FINANCIADO',
          cuotaInicial: 50000,
          numeroCuotas: 5,
          fechaVenta: '2026-01-15',
        }),
      ).toThrow(expect.objectContaining({ codigo: 'CUOTA_INICIAL_INVALIDA' }));
    });

    it('lanza NUMERO_CUOTAS_INVALIDO si el numero de cuotas es menor a 1 o mayor al maximo', () => {
      expect(() =>
        generarPlanDePagos({
          precioPactado: 50000,
          modalidad: 'FINANCIADO',
          numeroCuotas: 0,
          fechaVenta: '2026-01-15',
        }),
      ).toThrow(expect.objectContaining({ codigo: 'NUMERO_CUOTAS_INVALIDO' }));

      expect(() =>
        generarPlanDePagos({
          precioPactado: 50000,
          modalidad: 'FINANCIADO',
          numeroCuotas: 241,
          fechaVenta: '2026-01-15',
        }),
      ).toThrow(expect.objectContaining({ codigo: 'NUMERO_CUOTAS_INVALIDO' }));
    });

    it('lanza FECHA_PRIMERA_CUOTA_INVALIDA si la primera cuota vence antes de la venta', () => {
      expect(() =>
        generarPlanDePagos({
          precioPactado: 50000,
          modalidad: 'FINANCIADO',
          numeroCuotas: 5,
          fechaVenta: '2026-02-15',
          fechaPrimeraCuota: '2026-02-10',
        }),
      ).toThrow(expect.objectContaining({ codigo: 'FECHA_PRIMERA_CUOTA_INVALIDA' }));
    });
  });

  describe('calcularEstadoCuota', () => {
    it('devuelve PAGADA cuando el monto pagado cubre o excede el monto de la cuota', () => {
      expect(calcularEstadoCuota(5000, 5000, '2026-03-01', '2026-03-10')).toBe('PAGADA');
      expect(calcularEstadoCuota(5000, 5500, '2026-03-01', '2026-03-10')).toBe('PAGADA');
    });

    it('devuelve VENCIDA cuando el monto pagado es insuficiente y la fecha de vencimiento ya paso', () => {
      expect(calcularEstadoCuota(5000, 2000, '2026-03-01', '2026-03-02')).toBe('VENCIDA');
    });

    it('devuelve PENDIENTE cuando todavia no vence', () => {
      expect(calcularEstadoCuota(5000, 0, '2026-03-15', '2026-03-15')).toBe('PENDIENTE');
      expect(calcularEstadoCuota(5000, 0, '2026-03-20', '2026-03-15')).toBe('PENDIENTE');
    });
  });

  describe('resumirPlan', () => {
    const cuotas = [
      { id: 1, numero: 0, concepto: 'Cuota inicial', monto: 15000, fechaVencimiento: '2026-01-15' },
      { id: 2, numero: 1, concepto: 'Cuota 1', monto: 5000, fechaVencimiento: '2026-02-15' },
      { id: 3, numero: 2, concepto: 'Cuota 2', monto: 5000, fechaVencimiento: '2026-03-15' },
    ];

    it('calcula correctamente total pagado y saldo pendiente sin contar pagos anulados', () => {
      const pagos = [
        { cuotaId: 1, monto: 15000, estado: 'VALIDO' as const },
        { cuotaId: 2, monto: 5000, estado: 'VALIDO' as const },
        { cuotaId: 3, monto: 5000, estado: 'ANULADO' as const },
      ];

      const resumen = resumirPlan(75000, cuotas, pagos, '2026-02-20');

      expect(resumen.totalPagado).toBe(20000);
      expect(resumen.saldoPendiente).toBe(55000);
      expect(resumen.cuotasPagadas).toBe(2);
      expect(resumen.saldada).toBe(false);
      expect(resumen.proximaCuota?.numero).toBe(2);
    });

    it('marca saldada en true cuando el saldo llega a 0', () => {
      const cuotaUnica = [{ id: 1, numero: 0, concepto: 'Contado', monto: 50000, fechaVencimiento: '2026-01-15' }];
      const pagos = [{ cuotaId: 1, monto: 50000, estado: 'VALIDO' as const }];

      const resumen = resumirPlan(50000, cuotaUnica, pagos, '2026-01-15');

      expect(resumen.totalPagado).toBe(50000);
      expect(resumen.saldoPendiente).toBe(0);
      expect(resumen.saldada).toBe(true);
      expect(resumen.proximaCuota).toBeNull();
    });
  });

  describe('validarPago', () => {
    const cuotaPendiente = { concepto: 'Cuota 1', estado: 'PENDIENTE' as const, montoPendiente: 5000 };

    it('permite un pago valido exacto a la cuota y al saldo', () => {
      expect(() => validarPago(5000, 'VIGENTE', cuotaPendiente, 5000)).not.toThrow();
    });

    it('lanza MONTO_INVALIDO si el monto es menor o igual a 0 o tiene mas de 2 decimales', () => {
      expect(() => validarPago(0, 'VIGENTE', cuotaPendiente, 5000)).toThrow(
        expect.objectContaining({ codigo: 'MONTO_INVALIDO' }),
      );
      expect(() => validarPago(-100, 'VIGENTE', cuotaPendiente, 5000)).toThrow(
        expect.objectContaining({ codigo: 'MONTO_INVALIDO' }),
      );
      expect(() => validarPago(100.555, 'VIGENTE', cuotaPendiente, 5000)).toThrow(
        expect.objectContaining({ codigo: 'MONTO_INVALIDO' }),
      );
    });

    it('lanza VENTA_NO_VIGENTE si la venta esta anulada', () => {
      expect(() => validarPago(1000, 'ANULADA', cuotaPendiente, 5000)).toThrow(
        expect.objectContaining({ codigo: 'VENTA_NO_VIGENTE' }),
      );
    });

    it('lanza CUOTA_YA_PAGADA si la cuota ya esta en estado PAGADA', () => {
      const cuotaPagada = { concepto: 'Cuota 1', estado: 'PAGADA' as const, montoPendiente: 0 };
      expect(() => validarPago(1000, 'VIGENTE', cuotaPagada, 5000)).toThrow(
        expect.objectContaining({ codigo: 'CUOTA_YA_PAGADA' }),
      );
    });

    it('lanza MONTO_EXCEDE_SALDO si el monto supera el saldo pendiente', () => {
      expect(() => validarPago(5000.01, 'VIGENTE', cuotaPendiente, 5000)).toThrow(
        expect.objectContaining({ codigo: 'MONTO_EXCEDE_SALDO' }),
      );
    });

    it('lanza MONTO_EXCEDE_CUOTA si el monto supera lo pendiente de la cuota', () => {
      const cuotaParcial = { concepto: 'Cuota 1', estado: 'PENDIENTE' as const, montoPendiente: 2000 };
      expect(() => validarPago(3000, 'VIGENTE', cuotaParcial, 10000)).toThrow(
        expect.objectContaining({ codigo: 'MONTO_EXCEDE_CUOTA' }),
      );
    });
  });

  describe('validarPagoAnulable', () => {
    it('permite anular un pago valido con motivo justificado', () => {
      expect(() => validarPagoAnulable({ estado: 'VALIDO' }, 'Error en numero de transaccion bancaria')).not.toThrow();
    });

    it('lanza PAGO_YA_ANULADO si el pago ya estaba anulado', () => {
      expect(() => validarPagoAnulable({ estado: 'ANULADO' }, 'Motivo cualquiera')).toThrow(
        expect.objectContaining({ codigo: 'PAGO_YA_ANULADO' }),
      );
    });

    it('lanza MOTIVO_REQUERIDO si el motivo esta vacio o tiene menos de 5 caracteres', () => {
      expect(() => validarPagoAnulable({ estado: 'VALIDO' }, '')).toThrow(
        expect.objectContaining({ codigo: 'MOTIVO_REQUERIDO' }),
      );
      expect(() => validarPagoAnulable({ estado: 'VALIDO' }, 'abc')).toThrow(
        expect.objectContaining({ codigo: 'MOTIVO_REQUERIDO' }),
      );
    });
  });
});
