import { describe, it, expect } from 'vitest';
import {
  ASPECTO_ESTADO,
  estiloEstado,
  COLOR_SELECCION,
  ETIQUETA_MODALIDAD,
  NOMBRE_ROL,
} from '../../src/utilidades/estados';

describe('estados', () => {
  it('define el aspecto visual correcto para los estados de lote', () => {
    expect(ASPECTO_ESTADO.DISPONIBLE).toEqual({
      tono: 'verde',
      color: '#2f8a55',
      etiqueta: 'Disponible',
      plural: 'Disponibles',
    });
    expect(ASPECTO_ESTADO.RESERVADO).toEqual({
      tono: 'ambar',
      color: '#e0a21b',
      etiqueta: 'Reservado',
      plural: 'Reservados',
    });
    expect(ASPECTO_ESTADO.VENDIDO).toEqual({
      tono: 'rojo',
      color: '#cf4a47',
      etiqueta: 'Vendido',
      plural: 'Vendidos',
    });
    expect(ASPECTO_ESTADO.BLOQUEADO).toEqual({
      tono: 'gris',
      color: '#80867f',
      etiqueta: 'Bloqueado',
      plural: 'Bloqueados',
    });
  });

  it('define el aspecto visual correcto para estados de reservas', () => {
    expect(ASPECTO_ESTADO.ACTIVA.color).toBe('#e0a21b');
    expect(ASPECTO_ESTADO.CANCELADA.color).toBe('#80867f');
    expect(ASPECTO_ESTADO.VENCIDA.color).toBe('#cf4a47');
    expect(ASPECTO_ESTADO.CONVERTIDA.color).toBe('#1d4ed8');
  });

  it('define el aspecto visual correcto para estados de cuotas y pagos', () => {
    expect(ASPECTO_ESTADO.PENDIENTE.color).toBe('#e0a21b');
    expect(ASPECTO_ESTADO.PAGADA.color).toBe('#2f8a55');
    expect(ASPECTO_ESTADO.VALIDO.color).toBe('#2f8a55');
    expect(ASPECTO_ESTADO.ANULADO.color).toBe('#80867f');
  });

  it('genera la propiedad css personalizada para el estado', () => {
    const estilo = estiloEstado('DISPONIBLE');
    expect(estilo).toEqual({ '--color-estado': '#2f8a55' });
  });

  it('define el color de seleccion en azul', () => {
    expect(COLOR_SELECCION).toBe('#1d4ed8');
  });

  it('define las etiquetas de modalidad de pago', () => {
    expect(ETIQUETA_MODALIDAD.CONTADO).toBe('Al contado');
    expect(ETIQUETA_MODALIDAD.FINANCIADO).toBe('Crédito financiado');
  });

  it('define los nombres de rol legibles en espanol', () => {
    expect(NOMBRE_ROL.ADMIN).toBe('Administrador');
    expect(NOMBRE_ROL.ASESOR).toBe('Asesor comercial');
    expect(NOMBRE_ROL.CLIENTE).toBe('Cliente');
  });
});
