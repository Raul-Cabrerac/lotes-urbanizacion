import { useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api/api';
import { useSesion } from '../auth/Sesion';
import { Cargando, Dato, Encabezado, Insignia, MensajeError, Vacio } from '../componentes/Basicos';
import { Icono } from '../componentes/Icono';
import { LeyendaEstados } from '../componentes/mapa/LeyendaEstados';
import { MapaLotes } from '../componentes/mapa/MapaLotes';
import { bs, fecha, m2 } from '../utilidades/formato';
import { useDatos } from '../utilidades/useDatos';

/**
 * Portal del cliente (E2E 07): sus lotes en el mapa, información de compra,
 * cronograma, pagos realizados y saldo pendiente. Solo ve SUS operaciones.
 */
export function MiPortal() {
  const { usuario } = useSesion();
  const { datos, error } = useDatos(() => api.portal.misOperaciones(), []);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);

  if (error) return <div className="pagina"><MensajeError mensaje={error} /></div>;
  if (!datos) return <Cargando />;

  const ventasVigentes = datos.ventas.filter((v) => v.estado === 'VIGENTE');
  const reservasActivas = datos.reservas.filter((r) => r.estado === 'ACTIVA');
  const propios = [...ventasVigentes.map((v) => v.lote), ...reservasActivas.map((r) => r.lote)];
  const lotes = propios.filter((lote, i) => propios.findIndex((l) => l.id === lote.id) === i);
  // Al abrir el portal se enfoca el primer lote del cliente.
  const loteEnfocado = seleccionado ?? lotes[0]?.id ?? null;

  return (
    <div className="pagina">
      <Encabezado
        titulo="Mis lotes"
        subtitulo={`${usuario?.nombre ?? ''} · sus compras, su plan de pagos y el saldo pendiente. Elija una compra para ubicarla en el mapa.`}
      />

      <div className="portal">
        <div className="portal-lista">
          <h2 className="titulo-seccion">Mis compras</h2>
          {ventasVigentes.length === 0 && <Vacio>No tiene compras vigentes.</Vacio>}
          {ventasVigentes.map((v) => (
            <div
              key={v.id}
              className={`tarjeta tarjeta-compra ${loteEnfocado === v.lote.id ? 'seleccionada' : ''}`}
              onClick={() => setSeleccionado(v.lote.id)}
              data-testid={`mi-compra-${v.lote.codigo}`}
            >
              <div className="fila-espaciada">
                <h3>
                  <button type="button" className="tarjeta-compra-titulo" onClick={() => setSeleccionado(v.lote.id)}>
                    Lote {v.lote.codigo}
                  </button>
                </h3>
                <Insignia estado={v.lote.estado} />
              </div>
              <div className="texto-suave">
                {v.lote.proyecto.nombre} · Mz {v.lote.manzano || '—'} · {m2(v.lote.superficieM2)}
              </div>
              <div className="grilla-datos tres compacta">
                <Dato etiqueta="Precio">{bs(v.precioPactado)}</Dato>
                <Dato etiqueta="Pagado" testid="mi-compra-pagado">
                  {bs(v.resumen.totalPagado)}
                </Dato>
                <Dato etiqueta="Saldo" testid="mi-compra-saldo">
                  <span className="monto-rojo">{bs(v.resumen.saldoPendiente)}</span>
                </Dato>
              </div>
              {v.resumen.proximaCuota && (
                <div className={`pequeno ${v.resumen.proximaCuota.estado === 'VENCIDA' ? 'texto-alerta' : 'texto-suave'}`}>
                  Próxima cuota: {fecha(v.resumen.proximaCuota.fechaVencimiento)} · {bs(v.resumen.proximaCuota.montoPendiente)}
                  {v.resumen.proximaCuota.estado === 'VENCIDA' && ' (vencida)'}
                </div>
              )}
              <Link to={`/ventas/${v.id}`} className="boton boton-chico" data-testid={`mi-plan-${v.lote.codigo}`}>
                Ver plan de pagos y pagos
                <Icono nombre="flecha" tamano={14} />
              </Link>
            </div>
          ))}

          {reservasActivas.length > 0 && <h2 className="titulo-seccion">Mis reservas</h2>}
          {reservasActivas.map((r) => (
            <div
              key={r.id}
              className={`tarjeta tarjeta-compra ${loteEnfocado === r.lote.id ? 'seleccionada' : ''}`}
              onClick={() => setSeleccionado(r.lote.id)}
              data-testid={`mi-reserva-${r.lote.codigo}`}
            >
              <div className="fila-espaciada">
                <h3>
                  <button type="button" className="tarjeta-compra-titulo" onClick={() => setSeleccionado(r.lote.id)}>
                    Lote {r.lote.codigo}
                  </button>
                </h3>
                <Insignia estado={r.estado} />
              </div>
              <div className="texto-suave">
                {r.lote.proyecto.nombre} · {m2(r.lote.superficieM2)} · {bs(r.lote.precio)}
              </div>
              <div className="pequeno">Reservado el {fecha(r.fecha)} · {r.fechaVencimiento ? `vence el ${fecha(r.fechaVencimiento)}` : 'sin vencimiento'}</div>
            </div>
          ))}
        </div>

        <div className="tarjeta sin-relleno portal-mapa" data-testid="mi-mapa">
          {lotes.length > 0 ? (
            <>
              <MapaLotes lotes={lotes} seleccionadoId={loteEnfocado} onSeleccionar={setSeleccionado} />
              <LeyendaEstados />
            </>
          ) : (
            <Vacio>Aún no tiene lotes para mostrar en el mapa.</Vacio>
          )}
        </div>
      </div>
    </div>
  );
}
