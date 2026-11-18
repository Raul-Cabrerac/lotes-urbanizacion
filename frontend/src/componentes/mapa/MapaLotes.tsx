/**
 * Mapa de lotes sobre Google Maps.
 *
 * - Pinta cada lote como un polígono con el color de su estado y su código como etiqueta.
 * - Clic en un polígono (o en su etiqueta): onSeleccionar(id).
 * - `dibujando`: el usuario marca los vértices de un polígono nuevo (ver HerramientaDibujo).
 * - `editandoId`: los vértices de ese lote se pueden arrastrar; cada cambio llega a
 *   onGeometriaEditada. Al terminar la edición el polígono vuelve a su forma original; si la forma
 *   nueva se guardó, llega en `lotes` y el polígono se vuelve a dibujar con ella.
 * - Encuadre: con la primera lista de lotes el mapa se acomoda para mostrarlos todos (y el
 *   perímetro). Después solo se vuelve a encuadrar con `encuadrar()`, por la ref.
 *
 * `lotes` puede ser un arreglo nuevo en cada render: los polígonos se rehacen solo si cambia el
 * id, el código, el estado o la forma de algún lote.
 *
 * Para los E2E, la etiqueta de cada lote lleva data-testid="poligono-<código>" y data-estado.
 */
import { useEffect, useEffectEvent, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import type { Poligono } from '../../api/tipos';
import { crearEtiqueta, estiloLote, type LoteEnMapa } from './aspectoLote';
import { crearCapaHtml, type CapaHtml } from './capaHtml';
import { alRechazarClave, cargarGoogleMaps, type GoogleMaps } from './cargarGoogleMaps';
import { aPoligono, aRuta, centroDe } from './geometriaMapa';
import { HerramientaDibujo } from './HerramientaDibujo';

export interface ControlMapa {
  /** Vuelve a encuadrar los lotes y el perímetro (los del próximo render: p. ej. tras importar un KML). */
  encuadrar(): void;
}

interface Props {
  /** null mientras los lotes cargan: el primer encuadre espera a la primera lista. */
  lotes: LoteEnMapa[] | null;
  limite?: Poligono | null;
  seleccionadoId?: number | null;
  onSeleccionar?: (id: number) => void;
  dibujando?: boolean;
  onPoligonoDibujado?: (geometria: Poligono) => void;
  editandoId?: number | null;
  onGeometriaEditada?: (geometria: Poligono) => void;
  ref?: Ref<ControlMapa>;
}

/** Lo que existe recién cuando Google Maps terminó de cargar. */
interface Motor {
  api: GoogleMaps;
  mapa: google.maps.Map;
  etiquetas: CapaHtml;
  vertices: CapaHtml;
}

/** Cada lote dibujado, con el polígono que lo representa. */
type Dibujados = Map<number, { lote: LoteEnMapa; poligono: google.maps.Polygon }>;

const CENTRO_SANTA_CRUZ = { lat: -17.7833, lng: -63.1821 };
const ZOOM_MAXIMO_AL_ENCUADRAR = 19;

/** Perímetro del proyecto: celeste, visible tanto en el mapa de calles como en el satelital. */
const COLOR_PERIMETRO = '#0ea5e9';

const OPCIONES_MAPA: google.maps.MapOptions = {
  center: CENTRO_SANTA_CRUZ,
  zoom: 13,
  mapTypeId: 'hybrid', // satelital con calles: se ven los terrenos reales
  tilt: 0,
  clickableIcons: false, // un clic en un comercio de Google no abre su ficha
  gestureHandling: 'greedy', // la rueda del mouse hace zoom sin apretar Ctrl
  streetViewControl: false,
  rotateControl: false,
};

const ERROR_DE_CLAVE =
  'Google Maps rechazó la clave. Revise VITE_GOOGLE_MAPS_API_KEY en .env.local (ver docs/GOOGLE_MAPS.md).';
const ERROR_DE_CARGA =
  'No se pudo cargar Google Maps. Revise su conexión a internet. La lista de lotes sigue funcionando.';

/** Lo que cambia el dibujo de cada lote: id, código, estado y forma. */
function firmaDe(lotes: LoteEnMapa[] | null): string | null {
  return lotes && lotes.map((l) => `${l.id}|${l.codigo}|${l.estado}|${JSON.stringify(l.geometria.coordinates)}`).join(';');
}

export function MapaLotes(props: Props) {
  const { limite, seleccionadoId, dibujando, editandoId, ref } = props;
  // La misma lista mientras la firma no cambie: los efectos dependen de ella y no de la referencia.
  const firma = firmaDe(props.lotes);
  const lotes = useMemo(() => props.lotes, [firma]);

  const contenedor = useRef<HTMLDivElement>(null);
  const [motor, setMotor] = useState<Motor | null>(null);
  const [dibujados, setDibujados] = useState<Dibujados>(() => new Map());
  const [error, setError] = useState('');
  const [pedidoEncuadre, setPedidoEncuadre] = useState(1); // 1: el encuadre con la primera lista
  const encuadreAtendido = useRef(0);
  const loteEnfocado = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({ encuadrar: () => setPedidoEncuadre((n) => n + 1) }), []);

  // Eventos que leen siempre las props actuales sin volver a crear los polígonos.
  const seleccionar = useEffectEvent((id: number) => props.onSeleccionar?.(id));
  const avisarEdicion = useEffectEvent((geometria: Poligono) => props.onGeometriaEditada?.(geometria));

  useEffect(() => alRechazarClave(() => setError(ERROR_DE_CLAVE)), []);

  // Cargar Google Maps y crear el mapa (una sola vez).
  useEffect(() => {
    const div = contenedor.current;
    if (!div) return;
    let cancelado = false;
    const iniciar = async () => {
      try {
        const api = await cargarGoogleMaps();
        if (cancelado) return;
        const mapa = new api.maps.Map(div, OPCIONES_MAPA);
        const vertices = crearCapaHtml(api.maps, mapa);
        vertices.interactiva(false); // los clics sobre un vértice llegan al mapa
        setMotor({ api, mapa, etiquetas: crearCapaHtml(api.maps, mapa), vertices });
      } catch {
        if (!cancelado) setError(ERROR_DE_CARGA);
      }
    };
    void iniciar();
    return () => {
      cancelado = true;
    };
  }, []);

  // Polígonos y etiquetas de los lotes.
  useEffect(() => {
    if (!motor || !lotes) return;
    const creados: Dibujados = new Map();
    const etiquetas = lotes.map((lote) => {
      const ruta = aRuta(lote.geometria);
      const poligono = new motor.api.maps.Polygon({
        map: motor.mapa,
        paths: ruta,
        ...estiloLote(lote.estado, false),
      });
      poligono.addListener('click', () => seleccionar(lote.id));
      creados.set(lote.id, { lote, poligono });
      const limites = new motor.api.core.LatLngBounds();
      ruta.forEach((punto) => limites.extend(punto));
      return {
        posicion: centroDe(ruta),
        limites,
        elemento: crearEtiqueta(lote, () => seleccionar(lote.id)),
      };
    });
    motor.etiquetas.mostrar(etiquetas);
    setDibujados(creados);
    return () => {
      creados.forEach(({ poligono }) => poligono.setMap(null));
      motor.etiquetas.mostrar([]);
    };
  }, [motor, lotes]);

  // Perímetro del proyecto (línea discontinua).
  useEffect(() => {
    const ruta = limite ? aRuta(limite) : [];
    if (!motor || ruta.length < 3) return;
    const trazo = { path: 'M 0,-1 0,1', strokeOpacity: 1, strokeColor: COLOR_PERIMETRO, scale: 3 };
    const perimetro = new motor.api.maps.Polyline({
      map: motor.mapa,
      path: [...ruta, ruta[0]],
      clickable: false,
      strokeOpacity: 0,
      icons: [{ icon: trazo, offset: '0', repeat: '16px' }],
    });
    return () => perimetro.setMap(null);
  }, [motor, limite]);

  // Encuadrar los lotes y el perímetro, una vez por pedido. El primero se atiende con la primera
  // lista, aunque esté vacía: si el proyecto no tenía lotes, el mapa no salta al dibujar el primero.
  useEffect(() => {
    if (!motor || !lotes || encuadreAtendido.current === pedidoEncuadre) return;
    encuadreAtendido.current = pedidoEncuadre;
    const limites = new motor.api.core.LatLngBounds();
    for (const lote of lotes) aRuta(lote.geometria).forEach((punto) => limites.extend(punto));
    if (limite) aRuta(limite).forEach((punto) => limites.extend(punto));
    if (limites.isEmpty()) return;
    motor.mapa.fitBounds(limites, 40);
    // Con un solo lote, fitBounds acercaría demasiado.
    motor.api.core.event.addListenerOnce(motor.mapa, 'idle', () => {
      if ((motor.mapa.getZoom() ?? 0) > ZOOM_MAXIMO_AL_ENCUADRAR) {
        motor.mapa.setZoom(ZOOM_MAXIMO_AL_ENCUADRAR);
      }
    });
  }, [motor, lotes, limite, pedidoEncuadre]);

  // Resaltar el lote seleccionado y llevarlo a la vista si quedó fuera de la pantalla.
  useEffect(() => {
    if (!motor) return;
    dibujados.forEach(({ lote, poligono }) => poligono.setOptions(estiloLote(lote.estado, lote.id === seleccionadoId)));
    const lote = seleccionadoId ? dibujados.get(seleccionadoId)?.lote : undefined;
    if (!lote || loteEnfocado.current === lote.id) return;
    loteEnfocado.current = lote.id;
    const centro = centroDe(aRuta(lote.geometria));
    if (!motor.mapa.getBounds()?.contains(centro)) motor.mapa.panTo(centro);
  }, [motor, dibujados, seleccionadoId]);

  // Mientras se dibuja o se edita una forma, los demás lotes no se pueden seleccionar.
  useEffect(() => {
    if (!motor) return;
    const libre = !dibujando && !editandoId;
    dibujados.forEach(({ poligono }, id) => {
      poligono.setOptions({ clickable: libre || id === editandoId });
    });
    motor.etiquetas.interactiva(libre);
  }, [motor, dibujados, dibujando, editandoId]);

  // Edición de la forma: los vértices del lote se pueden arrastrar. Al terminar (guardar,
  // cancelar o elegir otro lote) el polígono recupera la forma con que empezó.
  useEffect(() => {
    const poligono = editandoId ? dibujados.get(editandoId)?.poligono : undefined;
    if (!poligono) return;
    const ruta = poligono.getPath();
    const original = ruta.getArray().map((punto) => punto.toJSON());
    poligono.setEditable(true);
    const avisar = () => avisarEdicion(aPoligono(ruta.getArray().map((punto) => punto.toJSON())));
    const escuchas = ['set_at', 'insert_at', 'remove_at'].map((evento) => ruta.addListener(evento, avisar));
    return () => {
      escuchas.forEach((escucha) => escucha.remove());
      poligono.setEditable(false);
      poligono.setPath(original);
    };
  }, [dibujados, editandoId]);

  // Vértices de todos los lotes y del perímetro: el dibujo se "pega" a ellos.
  const verticesExistentes = useMemo(
    () => [...(lotes ?? []).flatMap((lote) => aRuta(lote.geometria)), ...(limite ? aRuta(limite) : [])],
    [lotes, limite],
  );

  return (
    <div className="mapa-contenedor">
      <div ref={contenedor} className="mapa" data-testid="mapa" />
      {!motor && !error && <div className="mapa-mensaje">Cargando Google Maps…</div>}
      {error && (
        <div className="mapa-mensaje mapa-error" data-testid="mapa-error">
          {error}
        </div>
      )}
      {motor && dibujando && (
        <HerramientaDibujo
          api={motor.api}
          mapa={motor.mapa}
          capaVertices={motor.vertices}
          verticesExistentes={verticesExistentes}
          onTerminar={(poligono) => props.onPoligonoDibujado?.(poligono)}
        />
      )}
    </div>
  );
}
