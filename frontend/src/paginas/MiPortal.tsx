import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api/api';
import { useSesion } from '../auth/Sesion';
import { Cargando, Encabezado, Insignia, MensajeError, Vacio } from '../componentes/Basicos';
import { LeyendaEstados } from '../componentes/mapa/LeyendaEstados';
import { MapaLotes, type LoteEnMapa } from '../componentes/mapa/MapaLotes';
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

  const lotes = useMemo<LoteEnMapa[]>(() => {
    if (!datos) return [];
    const propios = [
      ...datos.ventas.filter((v) => v.estado === 'VIGENTE').map((v) => v.lote),
      ...datos.reservas.filter((r) => r.estado === 'ACTIVA').map((r) => r.lote),
    ];
    return propios.filter((lote, i) => propios.findIndex((l) => l.id === lote.id) === i);
  }, [datos]);

  // Al abrir el portal se enfoca el primer lote del cliente.
  const loteEnfocado = seleccionado ?? lotes[0]?.id ?? null;

  if (error) return <div className="pagina"><MensajeError mensaje={error} /></div>;
  if (!datos) return <Cargando />;

  const ventasVigentes = datos.ventas.filter((v) => v.estado === 'VIGENTE');
  const reservasActivas = datos.reservas.filter((r) => r.estado === 'ACTIVA');

  return (
    <div className="pagina">
      <Encabezado
        titulo={`Hola, ${usuario?.nombre.split(' ')[0]}`}
        subtitulo="Aquí puede ver sus lotes, su plan de pagos y su saldo. Haga clic en una compra para ubicarla en el mapa."
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
                <h3>Lote {v.lote.codigo}</h3>
                <Insignia estado={v.lote.estado} />
              </div>
              <div className="texto-suave">
                {v.lote.proyecto.nombre} · Mz {v.lote.manzano || '—'} · {m2(v.lote.superficieM2)}
              </div>
              <div className="grilla-datos tres compacta">
                <div className="dato">
                  <div className="dato-etiqueta">Precio</div>
                  <div className="dato-valor">{bs(v.precioPactado)}</div>
                </div>
                <div className="dato">
                  <div className="dato-etiqueta">Pagado</div>
                  <div className="dato-valor" data-testid="mi-compra-pagado">{bs(v.resumen.totalPagado)}</div>
                </div>
                <div className="dato">
                  <div className="dato-etiqueta">Saldo</div>
                  <div className="dato-valor monto-rojo" data-testid="mi-compra-saldo">{bs(v.resumen.saldoPendiente)}</div>
                </div>
              </div>
              {v.resumen.proximaCuota && (
                <div className={`pequeno ${v.resumen.proximaCuota.estado === 'VENCIDA' ? 'texto-alerta' : 'texto-suave'}`}>
                  Próxima cuota: {fecha(v.resumen.proximaCuota.fechaVencimiento)} · {bs(v.resumen.proximaCuota.montoPendiente)}
                  {v.resumen.proximaCuota.estado === 'VENCIDA' && ' (VENCIDA)'}
                </div>
              )}
              <Link to={`/ventas/${v.id}`} className="boton boton-chico boton-primario" data-testid={`mi-plan-${v.lote.codigo}`}>
                Ver plan de pagos y pagos
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
                <h3>Lote {r.lote.codigo}</h3>
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
              <MapaLotes lotes={lotes} seleccionadoId={loteEnfocado} onSeleccionar={setSeleccionado} claveVista="portal" />
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
