// Consigna §12: Generar cuotas de un plan de pagos, reglas de pagos y trazabilidad de anulaciones.
import { describe, expect, it } from 'vitest';
import { MONTO_MAXIMO, sumar } from '../../../src/dominio/dinero';
import {
  calcularEstadoCuota,
  generarPlanDePagos,
  MAX_CUOTAS,
  operacionesDeLaVenta,
  resumirPlan,
  validarPago,
  validarPagoAnulable,
  type CondicionesVenta,
  type CuotaBase,
  type PagoBase,
} from '../../../src/dominio/planPagos';
import type { EstadoCuota, EstadoPago, EstadoVenta } from '../../../src/dominio/tipos';

describe('planPagos', () => {
  describe('generarPlanDePagos', () => {
    it('genera una única cuota número 0 al contado con vencimiento en la fecha de venta cuando la modalidad es CONTADO', () => {
      // Arrange
      const condiciones: CondicionesVenta = {
        precioPactado: 50000,
        modalidad: 'CONTADO',
        fechaVenta: '2026-03-15',
      };
      // Act
      const cuotas = generarPlanDePagos(condiciones);
      // Assert
      expect(cuotas).toEqual([
        {
          numero: 0,
          concepto: 'Pago al contado',
          monto: 50000,
          fechaVencimiento: '2026-03-15',
        },
      ]);
    });

    it('ignora cuotaInicial, numeroCuotas y fechaPrimeraCuota cuando la modalidad es CONTADO', () => {
      // Arrange
      const condiciones: CondicionesVenta = {
        precioPactado: 35000,
        modalidad: 'CONTADO',
        cuotaInicial: 5000,
        numeroCuotas: 12,
        fechaVenta: '2026-03-15',
        fechaPrimeraCuota: '2026-04-15',
      };
      // Act
      const cuotas = generarPlanDePagos(condiciones);
      // Assert
      expect(cuotas).toEqual([
        {
          numero: 0,
          concepto: 'Pago al contado',
          monto: 35000,
          fechaVencimiento: '2026-03-15',
        },
      ]);
    });

    it('genera N cuotas mensuales empezando en la cuota 1 cuando es FINANCIADO sin cuota inicial', () => {
      // Arrange
      const condiciones: CondicionesVenta = {
        precioPactado: 60000,
        modalidad: 'FINANCIADO',
        numeroCuotas: 3,
        fechaVenta: '2026-05-10',
      };
      // Act
      const cuotas = generarPlanDePagos(condiciones);
      // Assert
      expect(cuotas).toEqual([
        { numero: 1, concepto: 'Cuota 1', monto: 20000, fechaVencimiento: '2026-06-10' },
        { numero: 2, concepto: 'Cuota 2', monto: 20000, fechaVencimiento: '2026-07-10' },
        { numero: 3, concepto: 'Cuota 3', monto: 20000, fechaVencimiento: '2026-08-10' },
      ]);
    });

    it('genera la cuota inicial número 0 en la fecha de venta y N cuotas mensuales cuando es FINANCIADO con cuota inicial', () => {
      // Arrange
      const condiciones: CondicionesVenta = {
        precioPactado: 100000,
        modalidad: 'FINANCIADO',
        cuotaInicial: 20000,
        numeroCuotas: 4,
        fechaVenta: '2026-01-15',
      };
      // Act
      const cuotas = generarPlanDePagos(condiciones);
      // Assert
      expect(cuotas).toEqual([
        { numero: 0, concepto: 'Cuota inicial', monto: 20000, fechaVencimiento: '2026-01-15' },
        { numero: 1, concepto: 'Cuota 1', monto: 20000, fechaVencimiento: '2026-02-15' },
        { numero: 2, concepto: 'Cuota 2', monto: 20000, fechaVencimiento: '2026-03-15' },
        { numero: 3, concepto: 'Cuota 3', monto: 20000, fechaVencimiento: '2026-04-15' },
        { numero: 4, concepto: 'Cuota 4', monto: 20000, fechaVencimiento: '2026-05-15' },
      ]);
    });

    it('omite la cuota inicial número 0 cuando se pasa cuotaInicial en 0 de forma explícita', () => {
      // Arrange
      const condiciones: CondicionesVenta = {
        precioPactado: 24000,
        modalidad: 'FINANCIADO',
        cuotaInicial: 0,
        numeroCuotas: 2,
        fechaVenta: '2026-05-10',
      };
      // Act
      const cuotas = generarPlanDePagos(condiciones);
      // Assert
      expect(cuotas).toEqual([
        { numero: 1, concepto: 'Cuota 1', monto: 12000, fechaVencimiento: '2026-06-10' },
        { numero: 2, concepto: 'Cuota 2', monto: 12000, fechaVencimiento: '2026-07-10' },
      ]);
    });

    it('asigna los centavos sobrantes a la última cuota cuando la división es inexacta (100 Bs en 3 cuotas)', () => {
      // Arrange
      const condiciones: CondicionesVenta = {
        precioPactado: 100,
        modalidad: 'FINANCIADO',
        numeroCuotas: 3,
        fechaVenta: '2026-01-01',
      };
      // Act
      const cuotas = generarPlanDePagos(condiciones);
      // Assert
      expect(cuotas.map((c) => c.monto)).toEqual([33.33, 33.33, 33.34]);
    });

    it('conserva exactamente el precio pactado al sumar la cuota inicial y todas las cuotas financiadas', () => {
      // Arrange
      const condiciones: CondicionesVenta = {
        precioPactado: 75432.85,
        modalidad: 'FINANCIADO',
        cuotaInicial: 15432.10,
        numeroCuotas: 7,
        fechaVenta: '2026-04-01',
      };
      // Act
      const cuotas = generarPlanDePagos(condiciones);
      const sumaTotal = sumar(...cuotas.map((c) => c.monto));
      // Assert
      expect(sumaTotal).toBe(75432.85);
    });

    it('proyecta las cuotas mensualmente a partir de un mes después de la venta cuando no se especifica fechaPrimeraCuota', () => {
      // Arrange
      const condiciones: CondicionesVenta = {
        precioPactado: 30000,
        modalidad: 'FINANCIADO',
        numeroCuotas: 3,
        fechaVenta: '2026-02-10',
      };
      // Act
      const cuotas = generarPlanDePagos(condiciones);
      // Assert
      expect(cuotas.map((c) => c.fechaVencimiento)).toEqual([
        '2026-03-10',
        '2026-04-10',
        '2026-05-10',
      ]);
    });

    it('proyecta las cuotas a partir de fechaPrimeraCuota cuando se indica explícitamente', () => {
      // Arrange
      const condiciones: CondicionesVenta = {
        precioPactado: 20000,
        modalidad: 'FINANCIADO',
        numeroCuotas: 2,
        fechaVenta: '2026-02-10',
        fechaPrimeraCuota: '2026-04-01',
      };
      // Act
      const cuotas = generarPlanDePagos(condiciones);
      // Assert
      expect(cuotas.map((c) => c.fechaVencimiento)).toEqual([
        '2026-04-01',
        '2026-05-01',
      ]);
    });

    it('ajusta los vencimientos al último día del mes en meses con menos días sin desplazamientos acumulativos', () => {
      // Arrange
      const condiciones: CondicionesVenta = {
        precioPactado: 30000,
        modalidad: 'FINANCIADO',
        numeroCuotas: 3,
        fechaVenta: '2026-01-31',
      };
      // Act
      const cuotas = generarPlanDePagos(condiciones);
      // Assert
      expect(cuotas.map((c) => c.fechaVencimiento)).toEqual([
        '2026-02-28',
        '2026-03-31',
        '2026-04-30',
      ]);
    });

    it('permite que fechaPrimeraCuota sea igual a la fecha de venta y genera los vencimientos a partir de ese día', () => {
      // Arrange
      const condiciones: CondicionesVenta = {
        precioPactado: 20000,
        modalidad: 'FINANCIADO',
        numeroCuotas: 2,
        fechaVenta: '2026-06-15',
        fechaPrimeraCuota: '2026-06-15',
      };
      // Act
      const cuotas = generarPlanDePagos(condiciones);
      // Assert
      expect(cuotas.map((c) => c.fechaVencimiento)).toEqual([
        '2026-06-15',
        '2026-07-15',
      ]);
    });

    it.each([0, -100, 50000.555, MONTO_MAXIMO + 0.01])(
      'lanza PRECIO_PACTADO_INVALIDO cuando precioPactado es %s',
      (precioPactado) => {
        // Arrange
        const condiciones: CondicionesVenta = {
          precioPactado,
          modalidad: 'CONTADO',
          fechaVenta: '2026-05-10',
        };
        // Act + Assert
        expect(() => generarPlanDePagos(condiciones)).toThrow(
          expect.objectContaining({ codigo: 'PRECIO_PACTADO_INVALIDO' }),
        );
      },
    );

    it.each([0.01, MONTO_MAXIMO])(
      'acepta precioPactado en el límite válido de %s Bs',
      (precioPactado) => {
        // Arrange
        const condiciones: CondicionesVenta = {
          precioPactado,
          modalidad: 'CONTADO',
          fechaVenta: '2026-05-10',
        };
        // Act
        const cuotas = generarPlanDePagos(condiciones);
        // Assert
        expect(cuotas).toHaveLength(1);
        expect(cuotas[0].monto).toBe(precioPactado);
      },
    );

    it.each([-0.01, 1000.123])(
      'lanza CUOTA_INICIAL_INVALIDA cuando cuotaInicial tiene valor o decimales inválidos (%s)',
      (cuotaInicial) => {
        // Arrange
        const condiciones: CondicionesVenta = {
          precioPactado: 50000,
          modalidad: 'FINANCIADO',
          cuotaInicial,
          numeroCuotas: 3,
          fechaVenta: '2026-05-10',
        };
        // Act + Assert
        expect(() => generarPlanDePagos(condiciones)).toThrow(
          expect.objectContaining({ codigo: 'CUOTA_INICIAL_INVALIDA' }),
        );
      },
    );

    it.each([
      ['igual al precio pactado', 50000, 50000],
      ['superior al precio pactado', 60000, 50000],
    ] as const)(
      'lanza CUOTA_INICIAL_INVALIDA cuando cuotaInicial es %s',
      (_descripcion, cuotaInicial, precioPactado) => {
        // Arrange
        const condiciones: CondicionesVenta = {
          precioPactado,
          modalidad: 'FINANCIADO',
          cuotaInicial,
          numeroCuotas: 3,
          fechaVenta: '2026-05-10',
        };
        // Act + Assert
        expect(() => generarPlanDePagos(condiciones)).toThrow(
          expect.objectContaining({ codigo: 'CUOTA_INICIAL_INVALIDA' }),
        );
      },
    );

    it('acepta cuotaInicial mínima válida de Bs 0,01', () => {
      // Arrange
      const condiciones: CondicionesVenta = {
        precioPactado: 100,
        modalidad: 'FINANCIADO',
        cuotaInicial: 0.01,
        numeroCuotas: 1,
        fechaVenta: '2026-05-10',
      };
      // Act
      const cuotas = generarPlanDePagos(condiciones);
      // Assert
      expect(cuotas.map((c) => c.monto)).toEqual([0.01, 99.99]);
    });

    it.each([0, -1, 2.5, MAX_CUOTAS + 1, undefined])(
      'lanza NUMERO_CUOTAS_INVALIDO cuando numeroCuotas es %s en modalidad FINANCIADO',
      (numeroCuotas) => {
        // Arrange
        const condiciones: CondicionesVenta = {
          precioPactado: 50000,
          modalidad: 'FINANCIADO',
          numeroCuotas,
          fechaVenta: '2026-05-10',
        };
        // Act + Assert
        expect(() => generarPlanDePagos(condiciones)).toThrow(
          expect.objectContaining({ codigo: 'NUMERO_CUOTAS_INVALIDO' }),
        );
      },
    );

    it('permite financiar en el límite inferior de 1 sola cuota', () => {
      // Arrange
      const condiciones: CondicionesVenta = {
        precioPactado: 50000,
        modalidad: 'FINANCIADO',
        cuotaInicial: 10000,
        numeroCuotas: 1,
        fechaVenta: '2026-05-10',
      };
      // Act
      const cuotas = generarPlanDePagos(condiciones);
      // Assert
      expect(cuotas).toEqual([
        { numero: 0, concepto: 'Cuota inicial', monto: 10000, fechaVencimiento: '2026-05-10' },
        { numero: 1, concepto: 'Cuota 1', monto: 40000, fechaVencimiento: '2026-06-10' },
      ]);
    });

    it('permite financiar en el límite superior de MAX_CUOTAS (240 cuotas)', () => {
      // Arrange
      const condiciones: CondicionesVenta = {
        precioPactado: 240000,
        modalidad: 'FINANCIADO',
        numeroCuotas: MAX_CUOTAS,
        fechaVenta: '2026-01-15',
      };
      // Act
      const cuotas = generarPlanDePagos(condiciones);
      // Assert
      expect(cuotas).toHaveLength(MAX_CUOTAS);
      expect(cuotas[0]).toEqual({
        numero: 1,
        concepto: 'Cuota 1',
        monto: 1000,
        fechaVencimiento: '2026-02-15',
      });
      expect(cuotas[MAX_CUOTAS - 1].numero).toBe(MAX_CUOTAS);
    });

    it('lanza NUMERO_CUOTAS_INVALIDO cuando hay demasiadas cuotas para el monto restante y alguna quedaría en 0', () => {
      // Arrange
      const condiciones: CondicionesVenta = {
        precioPactado: 1,
        modalidad: 'FINANCIADO',
        numeroCuotas: 101,
        fechaVenta: '2026-05-10',
      };
      // Act + Assert
      expect(() => generarPlanDePagos(condiciones)).toThrow(
        expect.objectContaining({ codigo: 'NUMERO_CUOTAS_INVALIDO' }),
      );
    });

    it('genera todas las cuotas con montos positivos en el límite exacto de 1 centavo por cuota', () => {
      // Arrange
      const condiciones: CondicionesVenta = {
        precioPactado: 1,
        modalidad: 'FINANCIADO',
        numeroCuotas: 100,
        fechaVenta: '2026-05-10',
      };
      // Act
      const cuotas = generarPlanDePagos(condiciones);
      // Assert
      expect(cuotas).toHaveLength(100);
      expect(cuotas.every((c) => c.monto > 0)).toBe(true);
    });

    it('lanza FECHA_PRIMERA_CUOTA_INVALIDA cuando fechaPrimeraCuota es anterior a fechaVenta', () => {
      // Arrange
      const condiciones: CondicionesVenta = {
        precioPactado: 50000,
        modalidad: 'FINANCIADO',
        numeroCuotas: 3,
        fechaVenta: '2026-05-15',
        fechaPrimeraCuota: '2026-05-14',
      };
      // Act + Assert
      expect(() => generarPlanDePagos(condiciones)).toThrow(
        expect.objectContaining({ codigo: 'FECHA_PRIMERA_CUOTA_INVALIDA' }),
      );
    });
  });

  describe('calcularEstadoCuota', () => {
    const AYER = '2026-05-14';
    const HOY = '2026-05-15';
    const MANANA = '2026-05-16';

    it('devuelve PAGADA cuando el monto pagado es exactamente igual al monto de la cuota', () => {
      // Arrange
      const monto = 1000;
      const montoPagado = 1000;
      // Act
      const estado = calcularEstadoCuota(monto, montoPagado, MANANA, HOY);
      // Assert
      expect(estado).toBe('PAGADA');
    });

    it('devuelve PAGADA cuando el monto pagado supera el monto de la cuota', () => {
      // Arrange
      const monto = 1000;
      const montoPagado = 1200;
      // Act
      const estado = calcularEstadoCuota(monto, montoPagado, MANANA, HOY);
      // Assert
      expect(estado).toBe('PAGADA');
    });

    it.each([
      ['ya venció (ayer)', AYER],
      ['vence exactamente hoy', HOY],
    ] as const)(
      'prioriza el estado PAGADA cuando el monto está cubierto aunque la fecha de vencimiento %s',
      (_descripcion, fechaVencimiento) => {
        // Arrange
        const monto = 1000;
        const montoPagado = 1000;
        // Act
        const estado = calcularEstadoCuota(monto, montoPagado, fechaVencimiento, HOY);
        // Assert
        expect(estado).toBe('PAGADA');
      },
    );

    it('devuelve VENCIDA cuando no tiene pagos y la fecha de vencimiento es anterior a hoy', () => {
      // Arrange
      const monto = 1000;
      const montoPagado = 0;
      // Act
      const estado = calcularEstadoCuota(monto, montoPagado, AYER, HOY);
      // Assert
      expect(estado).toBe('VENCIDA');
    });

    it('devuelve VENCIDA cuando tiene un pago parcial faltando 1 centavo y la fecha de vencimiento ya pasó', () => {
      // Arrange
      const monto = 1000;
      const montoPagado = 999.99;
      // Act
      const estado = calcularEstadoCuota(monto, montoPagado, AYER, HOY);
      // Assert
      expect(estado).toBe('VENCIDA');
    });

    it.each([
      ['sin pagos y con vencimiento posterior a hoy', 0, MANANA],
      ['sin pagos y con vencimiento igual a hoy', 0, HOY],
      ['con pago parcial faltando 1 centavo y vencimiento posterior a hoy', 999.99, MANANA],
    ] as const)(
      'devuelve PENDIENTE cuando está %s',
      (_descripcion, montoPagado, fechaVencimiento) => {
        // Arrange
        const monto = 1000;
        // Act
        const estado = calcularEstadoCuota(monto, montoPagado, fechaVencimiento, HOY);
        // Assert
        expect(estado).toBe('PENDIENTE');
      },
    );
  });

  describe('resumirPlan', () => {
    const AYER = '2026-05-14';
    const HOY = '2026-05-15';
    const MANANA = '2026-05-16';

    const cuota = (id: number, numero: number, monto: number, fechaVencimiento: string): CuotaBase => ({
      id,
      numero,
      concepto: numero === 0 ? 'Cuota inicial' : `Cuota ${numero}`,
      monto,
      fechaVencimiento,
    });

    it('calcula total pagado en 0, saldo completo y todas las cuotas PENDIENTE cuando no hay pagos', () => {
      // Arrange
      const cuotas = [
        cuota(1, 0, 15000, HOY),
        cuota(2, 1, 30000, MANANA),
        cuota(3, 2, 30000, '2026-06-15'),
      ];
      // Act
      const resumen = resumirPlan(75000, cuotas, [], HOY);
      // Assert
      expect(resumen.totalPagado).toBe(0);
      expect(resumen.saldoPendiente).toBe(75000);
      expect(resumen.cuotasPagadas).toBe(0);
      expect(resumen.cuotasVencidas).toBe(0);
      expect(resumen.montoVencido).toBe(0);
      expect(resumen.saldada).toBe(false);
      expect(resumen.proximaCuota?.numero).toBe(0);
      expect(resumen.cuotas.map((c) => [c.montoPagado, c.montoPendiente, c.estado])).toEqual([
        [0, 15000, 'PENDIENTE'],
        [0, 30000, 'PENDIENTE'],
        [0, 30000, 'PENDIENTE'],
      ]);
    });

    it('marca el plan como saldado y proximaCuota en null cuando una única cuota está completamente pagada', () => {
      // Arrange
      const cuotas = [{ id: 1, numero: 0, concepto: 'Pago al contado', monto: 50000, fechaVencimiento: HOY }];
      const pagos: PagoBase[] = [{ cuotaId: 1, monto: 50000, estado: 'VALIDO' }];
      // Act
      const resumen = resumirPlan(50000, cuotas, pagos, HOY);
      // Assert
      expect(resumen.totalPagado).toBe(50000);
      expect(resumen.saldoPendiente).toBe(0);
      expect(resumen.cuotasPagadas).toBe(1);
      expect(resumen.cuotasVencidas).toBe(0);
      expect(resumen.montoVencido).toBe(0);
      expect(resumen.proximaCuota).toBeNull();
      expect(resumen.saldada).toBe(true);
    });

    it('ordena las cuotas por numero ascendente sin mutar el arreglo original', () => {
      // Arrange
      const cuotasDesordenadas = [
        cuota(3, 2, 20000, '2026-07-15'),
        cuota(1, 0, 10000, HOY),
        cuota(2, 1, 20000, '2026-06-15'),
      ];
      // Act
      const resumen = resumirPlan(50000, cuotasDesordenadas, [], HOY);
      // Assert
      expect(resumen.cuotas.map((c) => c.numero)).toEqual([0, 1, 2]);
      expect(cuotasDesordenadas.map((c) => c.numero)).toEqual([2, 0, 1]);
    });

    it('acumula múltiples pagos válidos de una misma cuota conservando la precisión decimal', () => {
      // Arrange
      const cuotas = [
        cuota(1, 1, 300.3, MANANA),
        cuota(2, 2, 300.3, '2026-06-15'),
      ];
      const pagos: PagoBase[] = [
        { cuotaId: 1, monto: 100.1, estado: 'VALIDO' },
        { cuotaId: 1, monto: 200.2, estado: 'VALIDO' },
        { cuotaId: 2, monto: 100.1, estado: 'VALIDO' },
      ];
      // Act
      const resumen = resumirPlan(600.6, cuotas, pagos, HOY);
      // Assert
      expect(resumen.totalPagado).toBe(400.4);
      expect(resumen.saldoPendiente).toBe(200.2);
      expect(resumen.cuotasPagadas).toBe(1);
      expect(resumen.saldada).toBe(false);
      expect(resumen.proximaCuota?.numero).toBe(2);
      expect(resumen.cuotas[0]).toMatchObject({ montoPagado: 300.3, montoPendiente: 0, estado: 'PAGADA' });
      expect(resumen.cuotas[1]).toMatchObject({ montoPagado: 100.1, montoPendiente: 200.2, estado: 'PENDIENTE' });
    });

    it('excluye los pagos ANULADO del cálculo de cada cuota, totalPagado y saldoPendiente', () => {
      // Arrange
      const cuotas = [
        cuota(1, 0, 20000, HOY),
        cuota(2, 1, 27500, MANANA),
        cuota(3, 2, 27500, '2026-06-15'),
      ];
      const pagos: PagoBase[] = [
        { cuotaId: 1, monto: 20000, estado: 'VALIDO' },
        { cuotaId: 1, monto: 20000, estado: 'ANULADO' },
        { cuotaId: 2, monto: 27500, estado: 'ANULADO' },
      ];
      // Act
      const resumen = resumirPlan(75000, cuotas, pagos, HOY);
      // Assert
      expect(resumen.totalPagado).toBe(20000);
      expect(resumen.saldoPendiente).toBe(55000);
      expect(resumen.cuotasPagadas).toBe(1);
      expect(resumen.saldada).toBe(false);
      expect(resumen.proximaCuota?.numero).toBe(1);
      expect(resumen.cuotas[0]).toMatchObject({ montoPagado: 20000, montoPendiente: 0, estado: 'PAGADA' });
      expect(resumen.cuotas[1]).toMatchObject({ montoPagado: 0, montoPendiente: 27500, estado: 'PENDIENTE' });
    });

    it('contabiliza cuotas vencidas y montoVencido considerando pagos parciales y excluyendo pagadas o anulados', () => {
      // Arrange
      const cuotas = [
        cuota(1, 0, 1000, AYER),
        cuota(2, 1, 2000, AYER),
        cuota(3, 2, 2000, AYER),
        cuota(4, 3, 2000, MANANA),
      ];
      const pagos: PagoBase[] = [
        { cuotaId: 1, monto: 1000, estado: 'VALIDO' }, // pagada aunque venció ayer
        { cuotaId: 2, monto: 500, estado: 'ANULADO' }, // anulado: no reduce monto vencido
        { cuotaId: 3, monto: 500, estado: 'VALIDO' },  // parcial vencida: pendiente 1500
      ];
      // Act
      const resumen = resumirPlan(7000, cuotas, pagos, HOY);
      // Assert
      expect(resumen.cuotasPagadas).toBe(1);
      expect(resumen.cuotasVencidas).toBe(2);
      expect(resumen.montoVencido).toBe(3500);
      expect(resumen.totalPagado).toBe(1500);
      expect(resumen.saldoPendiente).toBe(5500);
      expect(resumen.proximaCuota?.numero).toBe(1);
    });

    it('limita el montoPendiente de una cuota a 0 cuando sus pagos superan su monto individual sin exceder el precio', () => {
      // Arrange
      const cuotas = [
        cuota(1, 1, 1000, MANANA),
        cuota(2, 2, 1000, '2026-06-15'),
      ];
      const pagos: PagoBase[] = [{ cuotaId: 1, monto: 1200, estado: 'VALIDO' }];
      // Act
      const resumen = resumirPlan(2000, cuotas, pagos, HOY);
      // Assert
      expect(resumen.cuotas[0]).toMatchObject({ montoPagado: 1200, montoPendiente: 0, estado: 'PAGADA' });
      expect(resumen.totalPagado).toBe(1200);
      expect(resumen.saldoPendiente).toBe(800);
      expect(resumen.proximaCuota?.numero).toBe(2);
    });

    it('lanza Error de inconsistencia cuando lo pagado válido supera el precio pactado (saldo negativo)', () => {
      // Arrange
      const cuotas = [cuota(1, 1, 1000, MANANA)];
      const pagos: PagoBase[] = [{ cuotaId: 1, monto: 1000.01, estado: 'VALIDO' }];
      // Act + Assert
      expect(() => resumirPlan(1000, cuotas, pagos, HOY)).toThrow(Error);
    });
  });

  describe('validarPago', () => {
    it('permite un pago exacto del total de una cuota PENDIENTE', () => {
      // Arrange
      const monto = 1500;
      const estadoVenta: EstadoVenta = 'VIGENTE';
      const cuota = { concepto: 'Cuota 1', estado: 'PENDIENTE' as EstadoCuota, montoPendiente: 1500 };
      const saldoPendiente = 5000;
      // Act
      const validar = () => validarPago(monto, estadoVenta, cuota, saldoPendiente);
      // Assert
      expect(validar).not.toThrow();
    });

    it('permite un pago parcial menor al monto pendiente de la cuota', () => {
      // Arrange
      const monto = 500;
      const estadoVenta: EstadoVenta = 'VIGENTE';
      const cuota = { concepto: 'Cuota 1', estado: 'PENDIENTE' as EstadoCuota, montoPendiente: 1500 };
      const saldoPendiente = 5000;
      // Act
      const validar = () => validarPago(monto, estadoVenta, cuota, saldoPendiente);
      // Assert
      expect(validar).not.toThrow();
    });

    it('permite cobrar una cuota con estado VENCIDA (cuotaCobrable admite cuotas pendientes y vencidas)', () => {
      // Arrange
      const monto = 1000;
      const estadoVenta: EstadoVenta = 'VIGENTE';
      const cuota = { concepto: 'Cuota 2', estado: 'VENCIDA' as EstadoCuota, montoPendiente: 1000 };
      const saldoPendiente = 3000;
      // Act
      const validar = () => validarPago(monto, estadoVenta, cuota, saldoPendiente);
      // Assert
      expect(validar).not.toThrow();
    });

    it('permite un pago en el límite inferior mínimo de 1 centavo (Bs 0.01)', () => {
      // Arrange
      const monto = 0.01;
      const estadoVenta: EstadoVenta = 'VIGENTE';
      const cuota = { concepto: 'Cuota inicial', estado: 'PENDIENTE' as EstadoCuota, montoPendiente: 100 };
      const saldoPendiente = 100;
      // Act
      const validar = () => validarPago(monto, estadoVenta, cuota, saldoPendiente);
      // Assert
      expect(validar).not.toThrow();
    });

    it('permite un pago que coincide exactamente con el saldo pendiente de la venta y de la cuota', () => {
      // Arrange
      const monto = 2500;
      const estadoVenta: EstadoVenta = 'VIGENTE';
      const cuota = { concepto: 'Cuota final', estado: 'PENDIENTE' as EstadoCuota, montoPendiente: 2500 };
      const saldoPendiente = 2500;
      // Act
      const validar = () => validarPago(monto, estadoVenta, cuota, saldoPendiente);
      // Assert
      expect(validar).not.toThrow();
    });

    it.each([
      ['cero', 0],
      ['negativo de un centavo', -0.01],
      ['negativo grande', -500],
      ['más de dos decimales', 100.555],
      ['menor a un centavo positivo', 0.005],
      ['NaN', NaN],
      ['Infinity', Infinity],
      ['-Infinity', -Infinity],
      ['cadena de texto', '100' as unknown as number],
      ['null', null as unknown as number],
      ['undefined', undefined as unknown as number],
      ['superior a MONTO_MAXIMO', MONTO_MAXIMO + 0.01],
    ])('lanza MONTO_INVALIDO cuando el monto es %s (%s)', (_desc, montoInvalido) => {
      // Arrange
      const cuota = { concepto: 'Cuota 1', estado: 'PENDIENTE' as EstadoCuota, montoPendiente: 1000 };
      // Act + Assert
      expect(() => validarPago(montoInvalido, 'VIGENTE', cuota, 5000)).toThrow(
        expect.objectContaining({ codigo: 'MONTO_INVALIDO' }),
      );
    });

    it('lanza VENTA_NO_VIGENTE cuando la venta está ANULADA', () => {
      // Arrange
      const cuota = { concepto: 'Cuota 1', estado: 'PENDIENTE' as EstadoCuota, montoPendiente: 1000 };
      // Act + Assert
      expect(() => validarPago(500, 'ANULADA', cuota, 5000)).toThrow(
        expect.objectContaining({ codigo: 'VENTA_NO_VIGENTE' }),
      );
    });

    it('lanza CUOTA_YA_PAGADA cuando la cuota tiene estado PAGADA (cuotaCobrable rechaza cuotas pagadas)', () => {
      // Arrange
      const cuota = { concepto: 'Cuota 1', estado: 'PAGADA' as EstadoCuota, montoPendiente: 0 };
      // Act + Assert
      expect(() => validarPago(500, 'VIGENTE', cuota, 5000)).toThrow(
        expect.objectContaining({ codigo: 'CUOTA_YA_PAGADA' }),
      );
    });

    it('lanza MONTO_EXCEDE_SALDO cuando el pago supera el saldo pendiente de la venta', () => {
      // Arrange
      const cuota = { concepto: 'Cuota 1', estado: 'PENDIENTE' as EstadoCuota, montoPendiente: 2000 };
      const saldoPendiente = 1000;
      const monto = 1200;
      // Act + Assert
      expect(() => validarPago(monto, 'VIGENTE', cuota, saldoPendiente)).toThrow(
        expect.objectContaining({ codigo: 'MONTO_EXCEDE_SALDO' }),
      );
    });

    it('lanza MONTO_EXCEDE_SALDO en el límite de 1 centavo por encima del saldo pendiente', () => {
      // Arrange
      const cuota = { concepto: 'Cuota 1', estado: 'PENDIENTE' as EstadoCuota, montoPendiente: 2000 };
      const saldoPendiente = 1000;
      const monto = 1000.01;
      // Act + Assert
      expect(() => validarPago(monto, 'VIGENTE', cuota, saldoPendiente)).toThrow(
        expect.objectContaining({ codigo: 'MONTO_EXCEDE_SALDO' }),
      );
    });

    it('lanza MONTO_EXCEDE_CUOTA cuando el pago supera el monto pendiente de la cuota pero no el saldo de la venta', () => {
      // Arrange
      const cuota = { concepto: 'Cuota 1', estado: 'PENDIENTE' as EstadoCuota, montoPendiente: 1000 };
      const saldoPendiente = 5000;
      const monto = 1200;
      // Act + Assert
      expect(() => validarPago(monto, 'VIGENTE', cuota, saldoPendiente)).toThrow(
        expect.objectContaining({ codigo: 'MONTO_EXCEDE_CUOTA' }),
      );
    });

    it('lanza MONTO_EXCEDE_CUOTA en el límite de 1 centavo por encima del monto pendiente de la cuota', () => {
      // Arrange
      const cuota = { concepto: 'Cuota 1', estado: 'PENDIENTE' as EstadoCuota, montoPendiente: 1000 };
      const saldoPendiente = 5000;
      const monto = 1000.01;
      // Act + Assert
      expect(() => validarPago(monto, 'VIGENTE', cuota, saldoPendiente)).toThrow(
        expect.objectContaining({ codigo: 'MONTO_EXCEDE_CUOTA' }),
      );
    });

    it('prioriza MONTO_INVALIDO sobre VENTA_NO_VIGENTE cuando ambos fallan', () => {
      // Arrange
      const cuota = { concepto: 'Cuota 1', estado: 'PENDIENTE' as EstadoCuota, montoPendiente: 1000 };
      // Act + Assert
      expect(() => validarPago(-50, 'ANULADA', cuota, 5000)).toThrow(
        expect.objectContaining({ codigo: 'MONTO_INVALIDO' }),
      );
    });

    it('prioriza VENTA_NO_VIGENTE sobre CUOTA_YA_PAGADA cuando la venta está anulada y la cuota pagada', () => {
      // Arrange
      const cuota = { concepto: 'Cuota 1', estado: 'PAGADA' as EstadoCuota, montoPendiente: 0 };
      // Act + Assert
      expect(() => validarPago(500, 'ANULADA', cuota, 5000)).toThrow(
        expect.objectContaining({ codigo: 'VENTA_NO_VIGENTE' }),
      );
    });

    it('prioriza CUOTA_YA_PAGADA sobre MONTO_EXCEDE_SALDO y MONTO_EXCEDE_CUOTA cuando la cuota está pagada', () => {
      // Arrange
      const cuota = { concepto: 'Cuota 1', estado: 'PAGADA' as EstadoCuota, montoPendiente: 0 };
      // Act + Assert
      expect(() => validarPago(9999, 'VIGENTE', cuota, 1000)).toThrow(
        expect.objectContaining({ codigo: 'CUOTA_YA_PAGADA' }),
      );
    });

    it('prioriza MONTO_EXCEDE_SALDO sobre MONTO_EXCEDE_CUOTA cuando el monto supera tanto el saldo como la cuota', () => {
      // Arrange
      const cuota = { concepto: 'Cuota 1', estado: 'PENDIENTE' as EstadoCuota, montoPendiente: 500 };
      const saldoPendiente = 500;
      const monto = 600;
      // Act + Assert
      expect(() => validarPago(monto, 'VIGENTE', cuota, saldoPendiente)).toThrow(
        expect.objectContaining({ codigo: 'MONTO_EXCEDE_SALDO' }),
      );
    });
  });

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

  describe('operacionesDeLaVenta', () => {
    describe('operacion anular', () => {
      it.each([
        ['permite anular cuando la venta está VIGENTE', 'VIGENTE', true],
        ['no permite anular cuando la venta ya está ANULADA', 'ANULADA', false],
      ] as const)('%s', (_desc, estadoVenta, esperado) => {
        // Arrange
        const venta = { estado: estadoVenta as EstadoVenta };
        // Act
        const operaciones = operacionesDeLaVenta(venta);
        // Assert
        expect(operaciones.anular).toBe(esperado);
      });
    });

    describe('operacion pagar', () => {
      it.each([
        ['VIGENTE', 'PENDIENTE', true, 'permite pagar una cuota PENDIENTE en una venta VIGENTE'],
        ['VIGENTE', 'VENCIDA', true, 'permite pagar una cuota VENCIDA en una venta VIGENTE'],
        ['VIGENTE', 'PAGADA', false, 'no permite pagar una cuota PAGADA en una venta VIGENTE'],
        ['ANULADA', 'PENDIENTE', false, 'no permite pagar una cuota PENDIENTE en una venta ANULADA'],
        ['ANULADA', 'VENCIDA', false, 'no permite pagar una cuota VENCIDA en una venta ANULADA'],
        ['ANULADA', 'PAGADA', false, 'no permite pagar una cuota PAGADA en una venta ANULADA'],
      ] as const)(
        'cuando la venta está %s y la cuota está %s -> devuelve %s (%s)',
        (estadoVenta, estadoCuota, esperado, _desc) => {
          // Arrange
          const venta = { estado: estadoVenta as EstadoVenta };
          const cuota = { estado: estadoCuota as EstadoCuota };
          // Act
          const operaciones = operacionesDeLaVenta(venta);
          const puedePagar = operaciones.pagar(cuota);
          // Assert
          expect(puedePagar).toBe(esperado);
        },
      );
    });

    describe('operacion anularPago', () => {
      it.each([
        ['VIGENTE', 'VALIDO', true, 'permite anular un pago VALIDO en una venta VIGENTE'],
        ['VIGENTE', 'ANULADO', false, 'no permite anular un pago ya ANULADO en una venta VIGENTE'],
        ['ANULADA', 'VALIDO', false, 'no permite anular un pago VALIDO en una venta ANULADA'],
        ['ANULADA', 'ANULADO', false, 'no permite anular un pago ya ANULADO en una venta ANULADA'],
      ] as const)(
        'cuando la venta está %s y el pago está %s -> devuelve %s (%s)',
        (estadoVenta, estadoPago, esperado, _desc) => {
          // Arrange
          const venta = { estado: estadoVenta as EstadoVenta };
          const pago = { estado: estadoPago as EstadoPago };
          // Act
          const operaciones = operacionesDeLaVenta(venta);
          const puedeAnularPago = operaciones.anularPago(pago);
          // Assert
          expect(puedeAnularPago).toBe(esperado);
        },
      );
    });
  });
});
