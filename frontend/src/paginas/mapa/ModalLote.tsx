import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api/api';
import { mensajeDeError } from '../../api/http';
import type { Lote, Poligono } from '../../api/tipos';
import { Campo, MensajeError } from '../../componentes/Basicos';
import { Modal } from '../../componentes/Modal';
import { m2, numeroOIndefinido } from '../../utilidades/formato';

/**
 * Asignar los datos de un lote (paso 4 del flujo de la consigna):
 * - crear: después de dibujar un polígono (`geometria`)
 * - editar: un lote existente (`lote`)
 */
export function ModalLote({
  proyectoId,
  geometria,
  lote,
  sugerencias,
  onCerrar,
  onGuardado,
}: {
  proyectoId: number;
  geometria?: Poligono;
  lote?: Lote;
  sugerencias: { etapas: string[]; manzanos: string[] };
  onCerrar: () => void;
  onGuardado: (lote: Lote) => void;
}) {
  const [codigo, setCodigo] = useState(lote?.codigo ?? '');
  const [manzano, setManzano] = useState(lote?.manzano ?? '');
  const [etapa, setEtapa] = useState(lote?.etapa ?? '');
  const [precio, setPrecio] = useState(lote ? String(lote.precio) : '');
  const [superficie, setSuperficie] = useState(lote ? String(lote.superficieM2) : '');
  const [dimensiones, setDimensiones] = useState(lote?.dimensiones ?? '');
  const [calculado, setCalculado] = useState<{ superficieM2: number; dimensiones: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Superficie y dimensiones calculadas por el backend a partir del polígono dibujado.
  useEffect(() => {
    if (!geometria) return;
    const analizar = async () => {
      try {
        setCalculado(await api.lotes.analizarGeometria(geometria));
      } catch (err) {
        setError(mensajeDeError(err));
      }
    };
    void analizar();
  }, [geometria]);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    const datos = {
      codigo,
      manzano,
      etapa,
      precio: numeroOIndefinido(precio) ?? 0,
      superficieM2: numeroOIndefinido(superficie) ?? null, // vacío = calcular desde el polígono
      dimensiones: dimensiones || undefined,
    };
    try {
      onGuardado(lote ? await api.lotes.actualizar(lote.id, datos) : await api.proyectos.crearLote(proyectoId, { ...datos, geometria }));
    } catch (err) {
      setError(mensajeDeError(err));
      setGuardando(false);
    }
  };

  return (
    <Modal titulo={lote ? `Editar lote ${lote.codigo}` : 'Datos del nuevo lote'} onCerrar={onCerrar} testid="modal-lote">
      <form onSubmit={guardar} className="formulario">
        {calculado && (
          <div className="caja caja-verde" data-testid="lote-calculado">
            Polígono válido · superficie calculada <strong>{m2(calculado.superficieM2)}</strong> · {calculado.dimensiones}
          </div>
        )}
        <div className="fila-campos">
          <Campo etiqueta="Código *" ayuda="Ej.: A-01">
            <input value={codigo} onChange={(e) => setCodigo(e.target.value)} required data-testid="lote-codigo" />
          </Campo>
          <Campo etiqueta="Precio (Bs)" ayuda="0 = sin precio (no se puede vender)">
            <input type="number" min="0" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} data-testid="lote-precio" />
          </Campo>
        </div>
        <div className="fila-campos">
          <Campo etiqueta="Manzano">
            <input list="lista-manzanos" value={manzano} onChange={(e) => setManzano(e.target.value)} data-testid="lote-manzano" />
          </Campo>
          <Campo etiqueta="Etapa / sector">
            <input list="lista-etapas" value={etapa} onChange={(e) => setEtapa(e.target.value)} data-testid="lote-etapa" />
          </Campo>
        </div>
        <div className="fila-campos">
          <Campo etiqueta="Superficie (m²)" ayuda="Vacío = se calcula del polígono">
            <input
              type="number"
              min="0"
              step="0.01"
              value={superficie}
              placeholder={calculado ? String(calculado.superficieM2) : ''}
              onChange={(e) => setSuperficie(e.target.value)}
              data-testid="lote-superficie"
            />
          </Campo>
          <Campo etiqueta="Dimensiones" ayuda="Medidas referenciales">
            <input
              value={dimensiones}
              placeholder={calculado?.dimensiones ?? 'Ej.: 12 x 30 m'}
              onChange={(e) => setDimensiones(e.target.value)}
              data-testid="lote-dimensiones"
            />
          </Campo>
        </div>
        <datalist id="lista-manzanos">
          {sugerencias.manzanos.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <datalist id="lista-etapas">
          {sugerencias.etapas.map((e) => (
            <option key={e} value={e} />
          ))}
        </datalist>
        <MensajeError mensaje={error} testid="lote-error" />
        <div className="modal-pie">
          <button type="button" className="boton" onClick={onCerrar} data-testid="lote-cancelar">
            Cancelar
          </button>
          <button type="submit" className="boton boton-primario" disabled={guardando} data-testid="lote-guardar">
            {guardando ? 'Guardando...' : 'Guardar lote'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
