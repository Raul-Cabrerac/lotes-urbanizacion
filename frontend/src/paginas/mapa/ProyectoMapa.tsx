/**
 * Pantalla principal: mapa interactivo (Google Maps) de los lotes de un proyecto.
 *
 * - Todos: ver los lotes por color de estado, filtrar, buscar y ver el detalle con un clic.
 * - Asesor y administrador: reservar, vender y cancelar reservas desde el mapa.
 * - Administrador: dibujar lotes y el perímetro, editar formas, importar KML y publicar.
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { api, type FiltrosLotes } from '../../api/api';
import type { EstadoLote, Poligono } from '../../api/tipos';
import { useSesion } from '../../auth/Sesion';
import { useAvisos } from '../../componentes/Avisos';
import { Cargando, MensajeError } from '../../componentes/Basicos';
import { LeyendaEstados } from '../../componentes/mapa/LeyendaEstados';
import { MapaLotes } from '../../componentes/mapa/MapaLotes';
import { useDatos } from '../../utilidades/useDatos';
import { BarraMapa, type Modo } from './BarraMapa';
import { DialogosLote, type DialogoLote } from './DialogosLote';
import { DialogosProyecto, type DialogoProyecto } from './DialogosProyecto';
import { ModalLote } from './ModalLote';
import { PanelLote, type AccionesLote } from './PanelLote';
import { PanelProyecto } from './PanelProyecto';

const FILTROS_VACIOS: FiltrosLotes = { estado: '', etapa: '', manzano: '', q: '' };

export function ProyectoMapa() {
  const proyectoId = Number(useParams().id);
  const [parametros, setParametros] = useSearchParams();
  const { puede } = useSesion();
  const avisos = useAvisos();
  const esAdmin = puede('lotes:gestionar');

  const proyecto = useDatos(() => api.proyectos.obtener(proyectoId), [proyectoId]);
  const [filtros, setFiltros] = useState<FiltrosLotes>(FILTROS_VACIOS);
  const [busqueda, setBusqueda] = useState('');
  const lotes = useDatos(() => api.proyectos.lotes(proyectoId, filtros), [proyectoId, filtros]);

  // El lote seleccionado vive en la URL (?lote=ID) para poder enlazarlo desde otras pantallas.
  const seleccionadoId = Number(parametros.get('lote')) || null;
  const detalle = useDatos(
    () => (seleccionadoId ? api.lotes.obtener(seleccionadoId) : Promise.resolve(null)),
    [seleccionadoId],
  );

  const [modo, setModo] = useState<Modo>('normal');
  const [dialogoLote, setDialogoLote] = useState<DialogoLote | null>(null);
  const [dialogo, setDialogo] = useState<DialogoProyecto | null>(null);
  const [poligonoNuevo, setPoligonoNuevo] = useState<Poligono | null>(null);
  const [formaEditada, setFormaEditada] = useState<Poligono | null>(null);
  const [claveVista, setClaveVista] = useState(0);

  // La búsqueda por código se aplica cuando el usuario deja de escribir.
  useEffect(() => {
    const espera = setTimeout(() => setFiltros((f) => (f.q === busqueda ? f : { ...f, q: busqueda })), 300);
    return () => clearTimeout(espera);
  }, [busqueda]);

  // Mientras carga el detalle de otro lote no se muestran los datos (ni botones) del anterior.
  const lote = detalle.datos && detalle.datos.id === seleccionadoId ? detalle.datos : null;
  const resumen = proyecto.datos?.resumen;
  const sugerencias = useMemo(
    () => ({ etapas: resumen?.etapas ?? [], manzanos: resumen?.manzanos ?? [] }),
    [resumen],
  );

  const refrescar = async () => {
    await Promise.all([proyecto.recargar(), lotes.recargar(), detalle.recargar()]);
  };
  const cerrarDialogo = () => {
    setDialogo(null);
    setDialogoLote(null);
  };

  const cancelarModo = async () => {
    const estabaEditando = modo === 'editar-forma';
    setModo('normal');
    if (estabaEditando) await lotes.recargar(); // descarta los vértices movidos
  };

  const seleccionar = (id: number | null) => {
    if (id === seleccionadoId) return;
    if (modo === 'editar-forma') void cancelarModo();
    setParametros(id ? { lote: String(id) } : {}, { replace: true });
  };

  /** Ejecuta una operación sin diálogo: si sale bien avisa y refresca; si falla muestra el error. */
  const ejecutar = async (operacion: () => Promise<unknown>, mensaje: string): Promise<boolean> => {
    try {
      await operacion();
      avisos.exito(mensaje);
      await refrescar();
      return true;
    } catch (err) {
      avisos.error(err);
      return false;
    }
  };

  /** Después de una operación exitosa: cierra el diálogo, avisa y vuelve a pedir los datos. */
  const terminarOperacion = async (mensaje: string, deseleccionar = false) => {
    cerrarDialogo();
    avisos.exito(mensaje);
    if (deseleccionar) {
      seleccionar(null);
      await Promise.all([proyecto.recargar(), lotes.recargar()]);
      return;
    }
    await refrescar();
  };

  const acciones: AccionesLote = {
    reservar: () => setDialogoLote('reservar'),
    vender: () => setDialogoLote('vender'),
    cancelarReserva: () => setDialogoLote('cancelar-reserva'),
    editarDatos: () => setDialogoLote('editar-lote'),
    eliminar: () => setDialogoLote('eliminar-lote'),
    editarForma: () => {
      setFormaEditada(null);
      setModo('editar-forma');
    },
    cambiarEstado: (estado: EstadoLote) => {
      if (!lote) return;
      const accion = estado === 'BLOQUEADO' ? 'bloqueado' : 'desbloqueado';
      void ejecutar(() => api.lotes.cambiarEstado(lote.id, estado), `Lote ${lote.codigo}: ${accion}.`);
    },
  };

  const guardarForma = async () => {
    if (!lote || !formaEditada) return setModo('normal');
    const guardar = () => api.lotes.actualizar(lote.id, { geometria: formaEditada });
    if (await ejecutar(guardar, `Se actualizó la forma del lote ${lote.codigo}.`)) setModo('normal');
  };

  const alTerminarDibujo = async (geometria: Poligono) => {
    const eraPerimetro = modo === 'dibujar-limite';
    setModo('normal');
    if (!eraPerimetro) {
      setPoligonoNuevo(geometria); // se abre el formulario con código, manzano, precio...
      return;
    }
    await ejecutar(() => api.proyectos.definirLimite(proyectoId, geometria), 'Se guardó el perímetro del proyecto.');
  };

  if (proyecto.error) return <div className="pagina"><MensajeError mensaje={proyecto.error} /></div>;
  if (!proyecto.datos) return <Cargando />;
  const p = proyecto.datos;
  const sinFiltros = !filtros.estado && !filtros.q && !filtros.etapa && !filtros.manzano;

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
        onEditarProyecto={() => setDialogo('editar-proyecto')}
        onPublicar={() => setDialogo('publicar')}
      />

      <section className="zona-mapa">
        <BarraMapa
          esAdmin={esAdmin}
          modo={modo}
          codigoEditando={lote?.codigo ?? null}
          puedeGuardarForma={formaEditada !== null}
          onModo={setModo}
          onImportarKml={() => setDialogo('importar-kml')}
          onActualizar={refrescar}
          onGuardarForma={guardarForma}
          onCancelar={cancelarModo}
        />
        <MapaLotes
          lotes={lotes.datos ?? []}
          limite={p.limite}
          seleccionadoId={seleccionadoId}
          onSeleccionar={seleccionar}
          dibujando={modo === 'dibujar-lote' || modo === 'dibujar-limite'}
          onPoligonoDibujado={alTerminarDibujo}
          editandoId={modo === 'editar-forma' ? seleccionadoId : null}
          onGeometriaEditada={setFormaEditada}
          claveVista={lotes.datos ? `${proyectoId}-${claveVista}` : undefined}
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

      {lote && dialogoLote && (
        <DialogosLote
          dialogo={dialogoLote}
          lote={lote}
          sugerencias={sugerencias}
          onCerrar={cerrarDialogo}
          onTerminado={terminarOperacion}
          onConflicto={refrescar}
        />
      )}
      {poligonoNuevo && (
        <ModalLote
          proyectoId={proyectoId}
          geometria={poligonoNuevo}
          sugerencias={sugerencias}
          onCerrar={() => setPoligonoNuevo(null)}
          onGuardado={async (nuevo) => {
            setPoligonoNuevo(null);
            avisos.exito(`Lote ${nuevo.codigo} creado.`);
            await Promise.all([proyecto.recargar(), lotes.recargar()]);
            seleccionar(nuevo.id);
          }}
        />
      )}
      {dialogo && (
        <DialogosProyecto
          dialogo={dialogo}
          proyecto={p}
          onCerrar={cerrarDialogo}
          onTerminado={terminarOperacion}
          onLotesImportados={() => setClaveVista((c) => c + 1)}
        />
      )}
    </div>
  );
}
