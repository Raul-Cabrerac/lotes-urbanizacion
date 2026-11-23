import { describe, it, expect } from 'vitest';
import { estiloLote } from '../../src/componentes/mapa/aspectoLote';
import { ASPECTO_ESTADO, COLOR_SELECCION } from '../../src/utilidades/estados';

describe('aspectoLote', () => {
  it('genera estilo correcto para un lote no seleccionado', () => {
    const estilo = estiloLote('DISPONIBLE', false);
    expect(estilo).toEqual({
      strokeColor: ASPECTO_ESTADO.DISPONIBLE.color,
      strokeWeight: 2,
      fillColor: ASPECTO_ESTADO.DISPONIBLE.color,
      fillOpacity: 0.5,
      zIndex: 1,
    });
  });

  it('genera estilo destacado para un lote seleccionado', () => {
    const estilo = estiloLote('RESERVADO', true);
    expect(estilo).toEqual({
      strokeColor: COLOR_SELECCION,
      strokeWeight: 4,
      fillColor: ASPECTO_ESTADO.RESERVADO.color,
      fillOpacity: 0.75,
      zIndex: 2,
    });
  });

  it('aplica el color especifico del estado en fill para vendidos y bloqueados', () => {
    const estiloVendido = estiloLote('VENDIDO', false);
    expect(estiloVendido.fillColor).toBe('#cf4a47');

    const estiloBloqueado = estiloLote('BLOQUEADO', false);
    expect(estiloBloqueado.fillColor).toBe('#80867f');
  });
});
