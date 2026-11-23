// Consigna §12: Reglas de estado, eliminación y precio en lotes (Incidencia #4).
import { describe, expect, it } from 'vitest';
import { MONTO_MAXIMO } from '../../../src/dominio/dinero';
import {
  LARGO_MAXIMO,
  OPERACIONES_LOTE,
  operacionesDelLote,
  tienePrecio,
  validarCambioEstadoManual,
  validarDatosComerciales,
  validarLoteEliminable,
  validarLoteReservable,
  validarLoteVendible,
  validarPrecioLoteReservado,
} from '../../../src/dominio/lote';
import type { EstadoLote, EstadoProyecto } from '../../../src/dominio/tipos';

const lote = (estado: 'DISPONIBLE' | 'RESERVADO' | 'VENDIDO' | 'BLOQUEADO', precio = 45000) => ({
  codigo: 'A-01',
  estado,
  precio,
});

const datosComerciales = (
  sobrescribir: Partial<{
    codigo: string;
    manzano?: string;
    etapa?: string;
    dimensiones?: string;
    precio: number;
    superficieM2: number;
  }> = {},
) => ({
  codigo: 'A-01',
  manzano: 'A',
  etapa: '1',
  dimensiones: '12 x 30 m',
  precio: 45000,
  superficieM2: 360,
  ...sobrescribir,
});

describe('lote', () => {
  describe('validarLoteEliminable', () => {
    it('no lanza error cuando el lote está DISPONIBLE, sin operaciones y el proyecto queda con lotes', () => {
      // Arrange
      const disponible = lote('DISPONIBLE');
      // Act
      const validar = () => validarLoteEliminable(disponible, false, 'PUBLICADO', 2);
      // Assert
      expect(validar).not.toThrow();
    });

    it('lanza LOTE_CON_OPERACIONES cuando el lote tiene operaciones previas', () => {
      // Arrange
      const disponible = lote('DISPONIBLE');
      // Act + Assert
      expect(() => validarLoteEliminable(disponible, true, 'PUBLICADO', 3)).toThrow(
        expect.objectContaining({ codigo: 'LOTE_CON_OPERACIONES' }),
      );
    });

    it('lanza PROYECTO_PUBLICADO_SIN_LOTES cuando es el último lote de un proyecto PUBLICADO', () => {
      // Arrange
      const disponible = lote('DISPONIBLE');
      // Act + Assert
      expect(() => validarLoteEliminable(disponible, false, 'PUBLICADO', 1)).toThrow(
        expect.objectContaining({ codigo: 'PROYECTO_PUBLICADO_SIN_LOTES' }),
      );
    });

    it('permite eliminar el último lote cuando el proyecto sigue en BORRADOR', () => {
      // Arrange
      const disponible = lote('DISPONIBLE');
      // Act
      const validar = () => validarLoteEliminable(disponible, false, 'BORRADOR', 1);
      // Assert
      expect(validar).not.toThrow();
    });
  });

  describe('validarPrecioLoteReservado', () => {
    it('no lanza error cuando el lote está DISPONIBLE y recibe precio 0', () => {
      // Arrange + Act
      const validar = () => validarPrecioLoteReservado('DISPONIBLE', 0);
      // Assert
      expect(validar).not.toThrow();
    });

    it('no lanza error cuando el lote está RESERVADO y mantiene precio positivo', () => {
      // Arrange + Act
      const validar = () => validarPrecioLoteReservado('RESERVADO', 50000);
      // Assert
      expect(validar).not.toThrow();
    });

    it('lanza LOTE_SIN_PRECIO cuando el lote está RESERVADO y se intenta fijar precio 0', () => {
      // Arrange + Act + Assert
      expect(() => validarPrecioLoteReservado('RESERVADO', 0)).toThrow(
        expect.objectContaining({ codigo: 'LOTE_SIN_PRECIO' }),
      );
    });
  });

  describe('operacionesDelLote', () => {
    const ninguna = { reservar: false, vender: false, bloquear: false, desbloquear: false, eliminar: false };
    type Caso = [caso: string, estado: EstadoLote, precio: number, estadoProyecto: EstadoProyecto, esperadas: typeof ninguna];
    const casos: Caso[] = [
      [
        'admite reservar, vender, bloquear y eliminar cuando está DISPONIBLE, con precio y el proyecto PUBLICADO',
        'DISPONIBLE', 45000, 'PUBLICADO', { ...ninguna, reservar: true, vender: true, bloquear: true, eliminar: true },
      ],
      [
        'no admite reservar ni vender cuando está DISPONIBLE pero el proyecto está en BORRADOR',
        'DISPONIBLE', 45000, 'BORRADOR', { ...ninguna, bloquear: true, eliminar: true },
      ],
      [
        'no admite reservar ni vender cuando está DISPONIBLE pero su precio es 0',
        'DISPONIBLE', 0, 'PUBLICADO', { ...ninguna, bloquear: true, eliminar: true },
      ],
      ['solo admite vender cuando está RESERVADO', 'RESERVADO', 45000, 'PUBLICADO', { ...ninguna, vender: true }],
      [
        'admite desbloquear y eliminar cuando está BLOQUEADO',
        'BLOQUEADO', 45000, 'PUBLICADO', { ...ninguna, desbloquear: true, eliminar: true },
      ],
      ['no admite ninguna operación cuando está VENDIDO', 'VENDIDO', 45000, 'PUBLICADO', ninguna],
    ];

    it.each(casos)('%s', (_caso, estado, precio, estadoProyecto, esperadas) => {
      // Arrange
      const loteActual = lote(estado, precio);
      // Act
      const operaciones = operacionesDelLote(loteActual, estadoProyecto);
      // Assert
      expect(operaciones).toEqual(esperadas);
    });
  });

  describe('tienePrecio', () => {
    it.each([
      [false, 'Bs 0', 0],
      [true, 'Bs 0.01', 0.01],
    ] as const)('devuelve %s cuando el precio es %s', (esperado, _texto, precio) => {
      // Arrange
      const precioDelLote = precio;
      // Act
      const resultado = tienePrecio(precioDelLote);
      // Assert
      expect(resultado).toBe(esperado);
    });
  });

  describe('validarCambioEstadoManual', () => {
    it.each([
      ['DISPONIBLE', 'BLOQUEADO', OPERACIONES_LOTE.bloquear],
      ['BLOQUEADO', 'DISPONIBLE', OPERACIONES_LOTE.desbloquear],
    ] as const)(
      'devuelve la transición correspondiente cuando cambia manualmente de %s a %s',
      (actual, nuevo, esperada) => {
        // Arrange
        const estadoActual: EstadoLote = actual;
        const estadoNuevo: EstadoLote = nuevo;
        // Act
        const transicion = validarCambioEstadoManual(estadoActual, estadoNuevo);
        // Assert
        expect(transicion).toEqual(esperada);
      },
    );

    it.each([
      ['DISPONIBLE', 'DISPONIBLE'],
      ['DISPONIBLE', 'RESERVADO'],
      ['DISPONIBLE', 'VENDIDO'],
      ['BLOQUEADO', 'BLOQUEADO'],
      ['BLOQUEADO', 'RESERVADO'],
      ['BLOQUEADO', 'VENDIDO'],
      ['RESERVADO', 'DISPONIBLE'],
      ['RESERVADO', 'RESERVADO'],
      ['RESERVADO', 'VENDIDO'],
      ['RESERVADO', 'BLOQUEADO'],
      ['VENDIDO', 'DISPONIBLE'],
      ['VENDIDO', 'RESERVADO'],
      ['VENDIDO', 'VENDIDO'],
      ['VENDIDO', 'BLOQUEADO'],
    ] as const)(
      'lanza CAMBIO_ESTADO_NO_PERMITIDO cuando intenta cambiar manualmente de %s a %s',
      (actual, nuevo) => {
        // Arrange
        const estadoActual: EstadoLote = actual;
        const estadoNuevo: EstadoLote = nuevo;
        // Act
        const cambiar = () => validarCambioEstadoManual(estadoActual, estadoNuevo);
        // Assert
        expect(cambiar).toThrow(
          expect.objectContaining({ codigo: 'CAMBIO_ESTADO_NO_PERMITIDO' }),
        );
      },
    );
  });

  describe('validarLoteReservable', () => {
    it('no lanza error cuando el lote está DISPONIBLE, tiene precio positivo y el proyecto está PUBLICADO', () => {
      // Arrange
      const disponible = lote('DISPONIBLE', 45000);
      // Act
      const reservar = () => validarLoteReservable(disponible, 'PUBLICADO');
      // Assert
      expect(reservar).not.toThrow();
    });

    it('no lanza error en el límite inferior de precio válido (Bs 0.01)', () => {
      // Arrange
      const disponible = lote('DISPONIBLE', 0.01);
      // Act
      const reservar = () => validarLoteReservable(disponible, 'PUBLICADO');
      // Assert
      expect(reservar).not.toThrow();
    });

    it('lanza PROYECTO_NO_PUBLICADO cuando el proyecto está en BORRADOR', () => {
      // Arrange
      const disponible = lote('DISPONIBLE', 45000);
      // Act
      const reservar = () => validarLoteReservable(disponible, 'BORRADOR');
      // Assert
      expect(reservar).toThrow(
        expect.objectContaining({ codigo: 'PROYECTO_NO_PUBLICADO' }),
      );
    });

    it.each(['RESERVADO', 'VENDIDO', 'BLOQUEADO'] as const)(
      'lanza LOTE_NO_DISPONIBLE cuando el lote está %s',
      (estado) => {
        // Arrange
        const ocupado = lote(estado, 45000);
        // Act
        const reservar = () => validarLoteReservable(ocupado, 'PUBLICADO');
        // Assert
        expect(reservar).toThrow(
          expect.objectContaining({ codigo: 'LOTE_NO_DISPONIBLE' }),
        );
      },
    );

    it.each([0, -100] as const)(
      'lanza LOTE_SIN_PRECIO cuando el lote DISPONIBLE tiene precio %s',
      (precio) => {
        // Arrange
        const sinPrecio = lote('DISPONIBLE', precio);
        // Act
        const reservar = () => validarLoteReservable(sinPrecio, 'PUBLICADO');
        // Assert
        expect(reservar).toThrow(
          expect.objectContaining({ codigo: 'LOTE_SIN_PRECIO' }),
        );
      },
    );

    it('prioriza PROYECTO_NO_PUBLICADO sobre LOTE_NO_DISPONIBLE cuando el proyecto está en BORRADOR y el lote no está DISPONIBLE', () => {
      // Arrange
      const vendido = lote('VENDIDO', 45000);
      // Act
      const reservar = () => validarLoteReservable(vendido, 'BORRADOR');
      // Assert
      expect(reservar).toThrow(
        expect.objectContaining({ codigo: 'PROYECTO_NO_PUBLICADO' }),
      );
    });

    it('prioriza LOTE_NO_DISPONIBLE sobre LOTE_SIN_PRECIO cuando el lote no está DISPONIBLE y no tiene precio', () => {
      // Arrange
      const reservadoSinPrecio = lote('RESERVADO', 0);
      // Act
      const reservar = () => validarLoteReservable(reservadoSinPrecio, 'PUBLICADO');
      // Assert
      expect(reservar).toThrow(
        expect.objectContaining({ codigo: 'LOTE_NO_DISPONIBLE' }),
      );
    });
  });

  describe('validarLoteVendible', () => {
    it('no lanza error cuando el lote está DISPONIBLE, tiene precio positivo y el proyecto está PUBLICADO', () => {
      // Arrange
      const disponible = lote('DISPONIBLE', 45000);
      // Act
      const vender = () => validarLoteVendible(disponible, 'PUBLICADO', 10, null);
      // Assert
      expect(vender).not.toThrow();
    });

    it('no lanza error cuando el lote está RESERVADO por el mismo cliente', () => {
      // Arrange
      const reservado = lote('RESERVADO', 45000);
      // Act
      const vender = () => validarLoteVendible(reservado, 'PUBLICADO', 10, { clienteId: 10 });
      // Assert
      expect(vender).not.toThrow();
    });

    it('no lanza error en el límite inferior de precio válido (Bs 0.01)', () => {
      // Arrange
      const disponible = lote('DISPONIBLE', 0.01);
      // Act
      const vender = () => validarLoteVendible(disponible, 'PUBLICADO', 10, null);
      // Assert
      expect(vender).not.toThrow();
    });

    it('lanza PROYECTO_NO_PUBLICADO cuando el proyecto está en BORRADOR', () => {
      // Arrange
      const disponible = lote('DISPONIBLE', 45000);
      // Act
      const vender = () => validarLoteVendible(disponible, 'BORRADOR', 10, null);
      // Assert
      expect(vender).toThrow(
        expect.objectContaining({ codigo: 'PROYECTO_NO_PUBLICADO' }),
      );
    });

    it('lanza LOTE_YA_VENDIDO cuando el lote está VENDIDO', () => {
      // Arrange
      const vendido = lote('VENDIDO', 45000);
      // Act
      const vender = () => validarLoteVendible(vendido, 'PUBLICADO', 10, null);
      // Assert
      expect(vender).toThrow(
        expect.objectContaining({ codigo: 'LOTE_YA_VENDIDO' }),
      );
    });

    it('lanza LOTE_BLOQUEADO cuando el lote está BLOQUEADO', () => {
      // Arrange
      const bloqueado = lote('BLOQUEADO', 45000);
      // Act
      const vender = () => validarLoteVendible(bloqueado, 'PUBLICADO', 10, null);
      // Assert
      expect(vender).toThrow(
        expect.objectContaining({ codigo: 'LOTE_BLOQUEADO' }),
      );
    });

    it('lanza LOTE_RESERVADO_POR_OTRO_CLIENTE cuando el lote está RESERVADO para otro cliente', () => {
      // Arrange
      const reservado = lote('RESERVADO', 45000);
      // Act
      const vender = () => validarLoteVendible(reservado, 'PUBLICADO', 10, { clienteId: 99 });
      // Assert
      expect(vender).toThrow(
        expect.objectContaining({ codigo: 'LOTE_RESERVADO_POR_OTRO_CLIENTE' }),
      );
    });

    it('lanza LOTE_RESERVADO_POR_OTRO_CLIENTE cuando el lote está RESERVADO y no hay reserva activa', () => {
      // Arrange
      const reservado = lote('RESERVADO', 45000);
      // Act
      const vender = () => validarLoteVendible(reservado, 'PUBLICADO', 10, null);
      // Assert
      expect(vender).toThrow(
        expect.objectContaining({ codigo: 'LOTE_RESERVADO_POR_OTRO_CLIENTE' }),
      );
    });

    it.each([0, -50] as const)(
      'lanza LOTE_SIN_PRECIO cuando el lote vendible tiene precio %s',
      (precio) => {
        // Arrange
        const sinPrecio = lote('DISPONIBLE', precio);
        // Act
        const vender = () => validarLoteVendible(sinPrecio, 'PUBLICADO', 10, null);
        // Assert
        expect(vender).toThrow(
          expect.objectContaining({ codigo: 'LOTE_SIN_PRECIO' }),
        );
      },
    );

    it('prioriza PROYECTO_NO_PUBLICADO sobre LOTE_YA_VENDIDO cuando el proyecto está en BORRADOR y el lote está VENDIDO', () => {
      // Arrange
      const vendido = lote('VENDIDO', 45000);
      // Act
      const vender = () => validarLoteVendible(vendido, 'BORRADOR', 10, null);
      // Assert
      expect(vender).toThrow(
        expect.objectContaining({ codigo: 'PROYECTO_NO_PUBLICADO' }),
      );
    });

    it('prioriza LOTE_RESERVADO_POR_OTRO_CLIENTE sobre LOTE_SIN_PRECIO cuando está reservado por otro cliente y no tiene precio', () => {
      // Arrange
      const reservadoSinPrecio = lote('RESERVADO', 0);
      // Act
      const vender = () => validarLoteVendible(reservadoSinPrecio, 'PUBLICADO', 10, { clienteId: 99 });
      // Assert
      expect(vender).toThrow(
        expect.objectContaining({ codigo: 'LOTE_RESERVADO_POR_OTRO_CLIENTE' }),
      );
    });
  });

  describe('validarDatosComerciales', () => {
    it('no lanza error cuando todos los datos comerciales son válidos', () => {
      // Arrange
      const datos = datosComerciales();
      // Act
      const validar = () => validarDatosComerciales(datos);
      // Assert
      expect(validar).not.toThrow();
    });

    it('no lanza error cuando los campos opcionales (manzano, etapa, dimensiones) se omiten', () => {
      // Arrange
      const datos = { codigo: 'A-01', precio: 45000, superficieM2: 360 };
      // Act
      const validar = () => validarDatosComerciales(datos);
      // Assert
      expect(validar).not.toThrow();
    });

    it('no lanza error cuando codigo, manzano, etapa y dimensiones alcanzan exactamente su largo máximo', () => {
      // Arrange
      const datos = datosComerciales({
        codigo: 'C'.repeat(LARGO_MAXIMO.codigo),
        manzano: 'M'.repeat(LARGO_MAXIMO.manzano),
        etapa: 'E'.repeat(LARGO_MAXIMO.etapa),
        dimensiones: 'D'.repeat(LARGO_MAXIMO.dimensiones),
      });
      // Act
      const validar = () => validarDatosComerciales(datos);
      // Assert
      expect(validar).not.toThrow();
    });

    it.each([
      ['límite inferior (0)', 0],
      ['límite superior (MONTO_MAXIMO)', MONTO_MAXIMO],
    ] as const)('no lanza error cuando el precio está en el %s', (_desc, precio) => {
      // Arrange
      const datos = datosComerciales({ precio });
      // Act
      const validar = () => validarDatosComerciales(datos);
      // Assert
      expect(validar).not.toThrow();
    });

    it.each([
      ['límite inferior positivo (0.01 m²)', 0.01],
      ['límite superior (10.000.000 m²)', 10_000_000],
    ] as const)('no lanza error cuando la superficieM2 está en el %s', (_desc, superficieM2) => {
      // Arrange
      const datos = datosComerciales({ superficieM2 });
      // Act
      const validar = () => validarDatosComerciales(datos);
      // Assert
      expect(validar).not.toThrow();
    });

    it.each([
      ['cadena vacía', ''],
      ['solo espacios', '   '],
    ] as const)('lanza CODIGO_LOTE_REQUERIDO cuando el código es %s', (_desc, codigo) => {
      // Arrange
      const datos = datosComerciales({ codigo });
      // Act
      const validar = () => validarDatosComerciales(datos);
      // Assert
      expect(validar).toThrow(
        expect.objectContaining({ codigo: 'CODIGO_LOTE_REQUERIDO' }),
      );
    });

    it.each([
      ['codigo', LARGO_MAXIMO.codigo + 1],
      ['manzano', LARGO_MAXIMO.manzano + 1],
      ['etapa', LARGO_MAXIMO.etapa + 1],
      ['dimensiones', LARGO_MAXIMO.dimensiones + 1],
    ] as const)(
      'lanza TEXTO_DEMASIADO_LARGO cuando %s supera el máximo permitido (%s caracteres)',
      (campo, largo) => {
        // Arrange
        const datos = datosComerciales({ [campo]: 'X'.repeat(largo) });
        // Act
        const validar = () => validarDatosComerciales(datos);
        // Assert
        expect(validar).toThrow(
          expect.objectContaining({ codigo: 'TEXTO_DEMASIADO_LARGO' }),
        );
      },
    );

    it.each([
      ['negativo (-0.01)', -0.01],
      ['superior a MONTO_MAXIMO', MONTO_MAXIMO + 0.01],
      ['NaN', Number.NaN],
      ['Infinity', Number.POSITIVE_INFINITY],
    ] as const)('lanza PRECIO_INVALIDO cuando el precio es %s', (_desc, precio) => {
      // Arrange
      const datos = datosComerciales({ precio });
      // Act
      const validar = () => validarDatosComerciales(datos);
      // Assert
      expect(validar).toThrow(
        expect.objectContaining({ codigo: 'PRECIO_INVALIDO' }),
      );
    });

    it.each([
      ['cero', 0],
      ['negativa (-1)', -1],
      ['superior a 10.000.000 m²', 10_000_001],
      ['NaN', Number.NaN],
      ['Infinity', Number.POSITIVE_INFINITY],
    ] as const)('lanza SUPERFICIE_INVALIDA cuando la superficieM2 es %s', (_desc, superficieM2) => {
      // Arrange
      const datos = datosComerciales({ superficieM2 });
      // Act
      const validar = () => validarDatosComerciales(datos);
      // Assert
      expect(validar).toThrow(
        expect.objectContaining({ codigo: 'SUPERFICIE_INVALIDA' }),
      );
    });
  });
});
