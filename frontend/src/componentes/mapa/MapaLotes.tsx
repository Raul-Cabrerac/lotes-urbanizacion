/**
 * Mapa de lotes sobre Google Maps.
 *
 * - Pinta cada lote como un polígono con el color de su estado y su código como etiqueta.
 * - Clic en un polígono (o en su etiqueta): onSeleccionar(id).
 * - `dibujando`: el usuario marca los vértices de un polígono nuevo (ver HerramientaDibujo).
 * - `editandoId`: los vértices de ese lote se pueden arrastrar; cada cambio llega a
 *   onGeometriaEditada.
 *
 * Para los E2E, la etiqueta de cada lote lleva data-testid="poligono-<código>" y data-estado.
 */
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import type { Poligono } from '../../api/tipos';
import { crearEtiqueta, estiloLote, type LoteEnMapa } from './aspectoLote';
import { crearCapaHtml, type CapaHtml } from './capaHtml';
import { cargarGoogleMaps, type GoogleMaps } from './cargarGoogleMaps';
import { COLOR_PERIMETRO } from './colores';
import { aPoligono, aRuta, centroDe } from './geometriaMapa';
import { HerramientaDibujo } from './HerramientaDibujo';

export type { LoteEnMapa } from './aspectoLote';

interface Props {
  lotes: LoteEnMapa[];
  limite?: Poligono | null;
  seleccionadoId?: number | null;
  onSeleccionar?: (id: number) => void;
  dibujando?: boolean;
  onPoligonoDibujado?: (geometria: Poligono) => void;
  editandoId?: number | null;
  onGeometriaEditada?: (geometria: Poligono) => void;
  /**
   * Cuando cambia este valor, el mapa se acomoda para mostrar todos los lotes. Mientras los lotes
   * cargan debe ser undefined, para no encuadrar una lista que todavía está vacía.
   */
  claveVista?: string | number;
  className?: string;
}

/** Lo que existe recién cuando Google Maps terminó de cargar. */
interface Motor {
  api: GoogleMaps;
  mapa: google.maps.Map;
  etiquetas: CapaHtml;
  vertices: CapaHtml;
}

const CENTRO_SANTA_CRUZ = { lat: -17.7833, lng: -63.1821 };
const ZOOM_MAXIMO_AL_ENCUADRAR = 19;

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

export function MapaLotes(props: Props) {
  const { lotes, limite, seleccionadoId, dibujando, editandoId, claveVista } = props;
  const contenedor = useRef<HTMLDivElement>(null);
  const [motor, setMotor] = useState<Motor | null>(null);
  const [error, setError] = useState('');
  const poligonos = useRef(new Map<number, google.maps.Polygon>());
  const claveEncuadrada = useRef<string | number | undefined>(undefined);
  const loteEnfocado = useRef<number | null>(null);

  // Eventos que leen siempre las props actuales sin volver a crear los polígonos.
  const seleccionar = useEffectEvent((id: number) => props.onSeleccionar?.(id));
  const avisarEdicion = useEffectEvent((geometria: Poligono) => props.onGeometriaEditada?.(geometria));

  // 1) Cargar Google Maps y crear el mapa (una sola vez).
  useEffect(() => {
    const div = contenedor.current;
    if (!div) return;
    let cancelado = false;
    window.gm_authFailure = () => setError(ERROR_DE_CLAVE);
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

  // 2) Polígonos y etiquetas de los lotes.
  useEffect(() => {
    if (!motor) return;
    const creados = new Map<number, google.maps.Polygon>();
    const etiquetas = lotes.map((lote) => {
      const ruta = aRuta(lote.geometria);
      const poligono = new motor.api.maps.Polygon({
        map: motor.mapa,
        paths: ruta,
        ...estiloLote(lote.estado, false),
      });
      poligono.addListener('click', () => seleccionar(lote.id));
      creados.set(lote.id, poligono);
      const limites = new motor.api.core.LatLngBounds();
      ruta.forEach((punto) => limites.extend(punto));
      return {
        posicion: centroDe(ruta),
        limites,
        elemento: crearEtiqueta(lote, () => seleccionar(lote.id)),
      };
    });
    motor.etiquetas.mostrar(etiquetas);
    poligonos.current = creados;
    return () => {
      creados.forEach((poligono) => poligono.setMap(null));
      motor.etiquetas.mostrar([]);
    };
  }, [motor, lotes]);

  // 3) Perímetro del proyecto (línea discontinua).
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

  // 4) Encuadrar todos los lotes al abrir el proyecto o cuando cambia claveVista. Solo una vez por
  //    clave: si el proyecto estaba vacío, el mapa no salta cuando se dibuja el primer lote.
  useEffect(() => {
    if (!motor || claveVista === undefined || claveEncuadrada.current === claveVista) return;
    claveEncuadrada.current = claveVista;
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
  }, [motor, claveVista, lotes, limite]);

  // 5) Resaltar el lote seleccionado y llevarlo a la vista si quedó fuera de la pantalla.
  useEffect(() => {
    if (!motor) return;
    for (const lote of lotes) {
      poligonos.current.get(lote.id)?.setOptions(estiloLote(lote.estado, lote.id === seleccionadoId));
    }
    const lote = lotes.find((l) => l.id === seleccionadoId);
    if (!lote || loteEnfocado.current === lote.id) return;
    loteEnfocado.current = lote.id;
    const centro = centroDe(aRuta(lote.geometria));
    if (!motor.mapa.getBounds()?.contains(centro)) motor.mapa.panTo(centro);
  }, [motor, lotes, seleccionadoId]);

  // 6) Mientras se dibuja o se edita una forma, los demás lotes no se pueden seleccionar.
  useEffect(() => {
    if (!motor) return;
    const libre = !dibujando && !editandoId;
    poligonos.current.forEach((poligono, id) => {
      poligono.setOptions({ clickable: libre || id === editandoId });
    });
    motor.etiquetas.interactiva(libre);
  }, [motor, lotes, dibujando, editandoId]);

  // 7) Edición de la forma: los vértices del lote se pueden arrastrar.
  useEffect(() => {
    const poligono = editandoId ? poligonos.current.get(editandoId) : undefined;
    if (!motor || !poligono) return;
    poligono.setEditable(true);
    const ruta = poligono.getPath();
    const avisar = () => avisarEdicion(aPoligono(ruta.getArray().map((punto) => punto.toJSON())));
    const escuchas = ['set_at', 'insert_at', 'remove_at'].map((evento) =>
      ruta.addListener(evento, avisar),
    );
    return () => {
      escuchas.forEach((escucha) => escucha.remove());
      poligono.setEditable(false);
    };
  }, [motor, lotes, editandoId]);

  // Vértices de todos los lotes y del perímetro: el dibujo se "pega" a ellos.
  const verticesExistentes = useMemo(
    () => [...lotes.flatMap((lote) => aRuta(lote.geometria)), ...(limite ? aRuta(limite) : [])],
    [lotes, limite],
  );

  return (
    <div className={`mapa-contenedor ${props.className ?? ''}`}>
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
