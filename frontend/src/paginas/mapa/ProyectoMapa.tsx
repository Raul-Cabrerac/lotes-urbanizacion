/**
 * Pantalla principal: mapa interactivo (Google Maps) de los lotes de un proyecto.
 *
 * - Todos: ver los lotes por color de estado, filtrar, buscar y ver el detalle con un clic.
 * - Asesor y administrador: reservar, vender y cancelar reservas desde el mapa.
 * - Administrador: dibujar lotes y el perímetro, editar formas, importar KML y publicar.
 */
import { useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { api, type FiltrosLotes } from '../../api/api';
import type { LoteDetalle, Poligono } from '../../api/tipos';
import { OPERACIONES_LOTE } from '../../dominio';
import { useSesion } from '../../auth/Sesion';
import { useAvisos } from '../../componentes/Avisos';
import { Cargando, MensajeError } from '../../componentes/Basicos';
import { LeyendaEstados } from '../../componentes/mapa/LeyendaEstados';
import { MapaLotes, type ControlMapa } from '../../componentes/mapa/MapaLotes';
import { useDatos } from '../../utilidades/useDatos';
import { useOperacion } from '../../utilidades/useOperacion';
import { useValorDiferido } from '../../utilidades/useValorDiferido';
import { BarraMapa, type Modo, type ModoDibujo } from './BarraMapa';
import { DialogosLote, type DialogoLote } from './DialogosLote';
import { DialogosProyecto, type DialogoProyecto } from './DialogosProyecto';
import { ModalLote } from './ModalLote';
import { PanelLote, type AccionesLote, type CambioEstadoLote } from './PanelLote';
import { PanelProyecto } from './PanelProyecto';

/**
 * Lo que el usuario está haciendo sobre el mapa: una sola cosa a la vez. Entrar en un modo o abrir
 * un diálogo deja atrás lo anterior; al cancelar una edición de forma, el mapa recupera la forma.
 */
type Interaccion =
  | { tipo: 'normal' }
  | { tipo: ModoDibujo }
  | { tipo: 'editar-forma'; forma: Poligono | null }
  | { tipo: 'nuevo-lote'; geometria: Poligono }
  // La reserva es la que se veía al abrir el diálogo: si otro la cierra (409) y el mapa se recarga,
  // el diálogo sigue sobre esa misma reserva y muestra el error, en vez de cerrarse o pasar a otra.
  | { tipo: 'dialogo-lote'; dialogo: DialogoLote; reserva: LoteDetalle['reservaActiva'] }
  | { tipo: 'dialogo-proyecto'; dialogo: DialogoProyecto };

const NORMAL: Interaccion = { tipo: 'normal' };
const FILTROS_VACIOS: FiltrosLotes = { estado: '', etapa: '', manzano: '' };

/** Cómo queda el lote después de cada cambio de estado manual, para el aviso. */
const RESULTADO_CAMBIO: Record<CambioEstadoLote, string> = { bloquear: 'bloqueado', desbloquear: 'desbloqueado' };

/** El modo de la barra del mapa: en un diálogo, la barra sigue en 'normal'. */
function modoDe(interaccion: Interaccion): Modo {
  switch (interaccion.tipo) {
    case 'dibujar-lote':
    case 'dibujar-limite':
    case 'editar-forma':
      return interaccion.tipo;
    default:
      return 'normal';
  }
}

export function ProyectoMapa() {
  const proyectoId = Number(useParams().id);
  const [parametros, setParametros] = useSearchParams();
  const { puede } = useSesion();
  const avisos = useAvisos();
  const esAdmin = puede('lotes:gestionar');
  const mapa = useRef<ControlMapa>(null);

  const proyecto = useDatos(() => api.proyectos.obtener(proyectoId), [proyectoId]);
  const [filtros, setFiltros] = useState<FiltrosLotes>(FILTROS_VACIOS);
  const [busqueda, setBusqueda] = useState('');
  // La búsqueda por código se aplica cuando el usuario deja de escribir.
  const q = useValorDiferido(busqueda);
  const lotes = useDatos(() => api.proyectos.lotes(proyectoId, { ...filtros, q }), [proyectoId, filtros, q]);

  // El lote seleccionado vive en la URL (?lote=ID) para poder enlazarlo desde otras pantallas.
  const seleccionadoId = Number(parametros.get('lote')) || null;
  const detalle = useDatos(
    () => (seleccionadoId ? api.lotes.obtener(seleccionadoId) : Promise.resolve(null)),
    [seleccionadoId],
  );

  const [interaccion, setInteraccion] = useState<Interaccion>(NORMAL);
  const modo = modoDe(interaccion);

  // Mientras carga el detalle de otro lote no se muestran los datos (ni botones) del anterior.
  const lote = detalle.datos && detalle.datos.id === seleccionadoId ? detalle.datos : null;
  const resumen = proyecto.datos?.resumen;
  const sugerencias = useMemo(
    () => ({ etapas: resumen?.etapas ?? [], manzanos: resumen?.manzanos ?? [] }),
    [resumen],
  );

  const refrescar = async () => { await Promise.all([proyecto.recargar(), lotes.recargar(), detalle.recargar()]); };
  const volverANormal = () => setInteraccion(NORMAL);

  const seleccionar = (id: number | null) => {
    if (id === seleccionadoId) return;
    if (modo !== 'normal') volverANormal();
    setParametros(id ? { lote: String(id) } : {}, { replace: true });
  };

  /** Operación sin diálogo: si sale bien avisa y refresca; si falla muestra el error (y ante un 409 refresca). */
  const ejecutar = useOperacion(refrescar);

  /** Después de una operación exitosa: cierra el diálogo, avisa y vuelve a pedir los datos. */
  const terminarOperacion = async (mensaje: string) => {
    volverANormal();
    avisos.exito(mensaje);
    await refrescar();
  };

  /** El lote seleccionado ya no existe: se cierra su panel y no se vuelve a pedir su detalle. */
  const terminarEliminacion = async (mensaje: string) => {
    volverANormal();
    avisos.exito(mensaje);
    seleccionar(null);
    await Promise.all([proyecto.recargar(), lotes.recargar()]);
  };

  const abrirDialogoLote = (dialogo: DialogoLote) =>
    setInteraccion({ tipo: 'dialogo-lote', dialogo, reserva: lote?.reservaActiva ?? null });
  const abrirDialogoProyecto = (dialogo: DialogoProyecto) => setInteraccion({ tipo: 'dialogo-proyecto', dialogo });

  const acciones: AccionesLote = {
    reservar: () => abrirDialogoLote('reservar'),
    vender: () => abrirDialogoLote('vender'),
    cancelarReserva: () => abrirDialogoLote('cancelar-reserva'),
    editarDatos: () => abrirDialogoLote('editar-lote'),
    eliminar: () => abrirDialogoLote('eliminar-lote'),
    editarForma: () => setInteraccion({ tipo: 'editar-forma', forma: null }),
    cambiarEstado: (operacion) => {
      if (!lote) return;
      const estado = OPERACIONES_LOTE[operacion].a;
      void ejecutar(() => api.lotes.cambiarEstado(lote.id, estado), `Lote ${lote.codigo}: ${RESULTADO_CAMBIO[operacion]}.`);
    },
  };

  const formaEditada = interaccion.tipo === 'editar-forma' ? interaccion.forma : null;

  const guardarForma = async () => {
    if (!lote || !formaEditada) return volverANormal();
    const guardar = () => api.lotes.actualizar(lote.id, { geometria: formaEditada });
    if (await ejecutar(guardar, `Se actualizó la forma del lote ${lote.codigo}.`)) volverANormal();
  };

  const alEditarForma = (forma: Poligono) =>
    setInteraccion((actual) => (actual.tipo === 'editar-forma' ? { ...actual, forma } : actual));

  const alTerminarDibujo = async (geometria: Poligono) => {
    if (interaccion.tipo !== 'dibujar-limite') {
      setInteraccion({ tipo: 'nuevo-lote', geometria }); // se abre el formulario con código, manzano, precio...
      return;
    }
    volverANormal();
    await ejecutar(() => api.proyectos.definirLimite(proyectoId, geometria), 'Se guardó el perímetro del proyecto.');
  };

  if (proyecto.error) return <div className="pagina"><MensajeError mensaje={proyecto.error} /></div>;
  if (!proyecto.datos) return <Cargando />;
  const p = proyecto.datos;
  const sinFiltros = !filtros.estado && !q && !filtros.etapa && !filtros.manzano;

  return (
    <div className="pagina-mapa">
      <PanelProyecto
        proyecto={p}
        lotes={lotes.datos}
        filtros={filtros}
        onFiltros={setFiltros}
        busqueda={busqueda}
        onBusqueda={setBusqueda}
        seleccionadoId={seleccionadoId}
        onSeleccionar={seleccionar}
        onEditarProyecto={() => abrirDialogoProyecto('editar-proyecto')}
        onPublicar={() => abrirDialogoProyecto('publicar')}
      />

      <section className="zona-mapa">
        <BarraMapa
          esAdmin={esAdmin}
          modo={modo}
          codigoEditando={lote?.codigo ?? null}
          puedeGuardarForma={formaEditada !== null}
          onModo={(dibujo) => setInteraccion({ tipo: dibujo })}
          onImportarKml={() => abrirDialogoProyecto('importar-kml')}
          onActualizar={refrescar}
          onGuardarForma={guardarForma}
          onCancelar={volverANormal}
        />
        <MapaLotes
          ref={mapa}
          lotes={lotes.datos}
          limite={p.limite}
          seleccionadoId={seleccionadoId}
          onSeleccionar={seleccionar}
          dibujando={modo === 'dibujar-lote' || modo === 'dibujar-limite'}
          onPoligonoDibujado={alTerminarDibujo}
          editandoId={modo === 'editar-forma' ? seleccionadoId : null}
          onGeometriaEditada={alEditarForma}
        />
        <LeyendaEstados />
        {lotes.datos?.length === 0 && sinFiltros && modo === 'normal' && (
          <div className="mapa-vacio">
            Este proyecto todavía no tiene lotes.
            {esAdmin
              ? ' Use «Dibujar lote» para marcarlos sobre el mapa o importe un archivo KML.'
              : ' El administrador debe dibujarlos o importarlos desde un KML.'}
          </div>
        )}
      </section>

      {seleccionadoId && (
        <PanelLote
          lote={lote}
          error={detalle.error}
          onCerrar={() => seleccionar(null)}
          acciones={acciones}
          editandoForma={modo === 'editar-forma'}
        />
      )}

      {lote && interaccion.tipo === 'dialogo-lote' && (
        <DialogosLote
          dialogo={interaccion.dialogo}
          lote={lote}
          reserva={interaccion.reserva}
          sugerencias={sugerencias}
          onCerrar={volverANormal}
          onTerminado={terminarOperacion}
          onEliminado={terminarEliminacion}
          onConflicto={refrescar}
        />
      )}
      {interaccion.tipo === 'nuevo-lote' && (
        <ModalLote
          proyectoId={proyectoId}
          geometria={interaccion.geometria}
          sugerencias={sugerencias}
          onCerrar={volverANormal}
          onGuardado={async (nuevo) => {
            volverANormal();
            avisos.exito(`Lote ${nuevo.codigo} creado.`);
            await Promise.all([proyecto.recargar(), lotes.recargar()]);
            seleccionar(nuevo.id);
          }}
        />
      )}
      {interaccion.tipo === 'dialogo-proyecto' && (
        <DialogosProyecto
          dialogo={interaccion.dialogo}
          proyecto={p}
          onCerrar={volverANormal}
          onTerminado={terminarOperacion}
          onConflicto={refrescar}
          onLotesImportados={() => mapa.current?.encuadrar()}
        />
      )}
    </div>
  );
}
