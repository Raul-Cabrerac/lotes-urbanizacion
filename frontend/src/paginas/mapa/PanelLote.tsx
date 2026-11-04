import { Link } from 'react-router';
import type { EstadoLote, LoteDetalle } from '../../api/tipos';
import { useSesion } from '../../auth/Sesion';
import { Cargando, Dato, Insignia, MensajeError } from '../../componentes/Basicos';
import { bs, fecha, m2 } from '../../utilidades/formato';

export interface AccionesLote {
  reservar(): void;
  vender(): void;
  cancelarReserva(): void;
  editarDatos(): void;
  editarForma(): void;
  cambiarEstado(estado: EstadoLote): void;
  eliminar(): void;
}

/** Panel con el detalle del lote seleccionado y las acciones permitidas según su estado y el rol. */
export function PanelLote({
  lote,
  error,
  onCerrar,
  acciones,
  editandoForma,
}: {
  lote: LoteDetalle | null;
  error: string | null;
  onCerrar: () => void;
  acciones: AccionesLote;
  editandoForma: boolean;
}) {
  const { puede } = useSesion();
  if (!lote) {
    return (
      <aside className="panel-detalle" data-testid="panel-lote">
        <div className="panel-cabecera">
          <span />
          <button className="boton-icono" onClick={onCerrar} aria-label="Cerrar detalle" data-testid="detalle-cerrar">
            ×
          </button>
        </div>
        {error ? <MensajeError mensaje={error} /> : <Cargando />}
      </aside>
    );
  }

  const publicado = lote.proyecto.estado === 'PUBLICADO';
  const comercializable = publicado && lote.precio > 0;
  const { reservaActiva: reserva, ventaVigente: venta } = lote;

  return (
    <aside className="panel-detalle" data-testid="panel-lote" data-lote={lote.codigo}>
      <div className="panel-cabecera">
        <div>
          <div className="texto-suave pequeno">{lote.proyecto.nombre}</div>
          <h2 data-testid="detalle-codigo">Lote {lote.codigo}</h2>
          <Insignia estado={lote.estado} testid="detalle-estado" />
        </div>
        <button className="boton-icono" onClick={onCerrar} aria-label="Cerrar detalle" data-testid="detalle-cerrar">
          ×
        </button>
      </div>

      <div className="grilla-datos">
        <Dato etiqueta="Manzano">{lote.manzano || '—'}</Dato>
        <Dato etiqueta="Etapa / sector">{lote.etapa || '—'}</Dato>
        <Dato etiqueta="Superficie" testid="detalle-superficie">{m2(lote.superficieM2)}</Dato>
        <Dato etiqueta="Dimensiones" testid="detalle-dimensiones">{lote.dimensiones || '—'}</Dato>
        <Dato etiqueta="Precio de lista" testid="detalle-precio">
          {lote.precio > 0 ? bs(lote.precio) : <span className="texto-alerta">Sin precio</span>}
        </Dato>
      </div>

      {reserva && (
        <div className="caja caja-ambar" data-testid="detalle-reserva">
          <strong>Reservado para {reserva.cliente.nombreCompleto}</strong>
          <div>CI/NIT {reserva.cliente.documento} · Tel. {reserva.cliente.telefono}</div>
          <div>
            Desde {fecha(reserva.fecha)} · {reserva.fechaVencimiento ? `vence el ${fecha(reserva.fechaVencimiento)}` : 'sin vencimiento'}
          </div>
          <div className="texto-suave">Asesor: {reserva.asesor.nombre}</div>
          {reserva.observacion && <div className="texto-suave">“{reserva.observacion}”</div>}
        </div>
      )}

      {venta && (
        <div className="caja caja-roja" data-testid="detalle-venta">
          <strong>Vendido a {venta.cliente.nombreCompleto}</strong>
          <div>
            {fecha(venta.fecha)} · {venta.modalidad === 'CONTADO' ? 'Al contado' : 'Financiado'} · Asesor: {venta.asesor.nombre}
          </div>
          <div className="grilla-datos compacta">
            <Dato etiqueta="Precio pactado">{bs(venta.precioPactado)}</Dato>
            <Dato etiqueta="Pagado">{bs(venta.totalPagado)}</Dato>
            <Dato etiqueta="Saldo">{bs(venta.saldoPendiente)}</Dato>
          </div>
          <Link to={`/ventas/${venta.id}`} className="boton boton-chico" data-testid="detalle-ver-venta">
            Ver plan de pagos →
          </Link>
        </div>
      )}

      {!publicado && (
        <div className="caja caja-gris">El proyecto está en BORRADOR: publíquelo para poder reservar o vender sus lotes.</div>
      )}
      {publicado && lote.precio <= 0 && <div className="caja caja-gris">Asigne un precio al lote para poder comercializarlo.</div>}

      {/* Acciones comerciales (asesor y administrador) */}
      <div className="acciones-panel">
        {lote.estado === 'DISPONIBLE' && comercializable && puede('reservas:gestionar') && (
          <button className="boton boton-ambar" onClick={acciones.reservar} data-testid="accion-reservar">
            Reservar
          </button>
        )}
        {(lote.estado === 'DISPONIBLE' || lote.estado === 'RESERVADO') && comercializable && puede('ventas:registrar') && (
          <button className="boton boton-rojo" onClick={acciones.vender} data-testid="accion-vender">
            {reserva ? `Vender a ${reserva.cliente.nombreCompleto.split(' ')[0]}` : 'Vender'}
          </button>
        )}
        {reserva && puede('reservas:gestionar') && (
          <button className="boton" onClick={acciones.cancelarReserva} data-testid="accion-cancelar-reserva">
            Cancelar reserva
          </button>
        )}
      </div>

      {/* Acciones del administrador */}
      {puede('lotes:gestionar') && !editandoForma && (
        <div className="acciones-panel acciones-admin">
          <span className="texto-suave pequeno">Administración del lote</span>
          <div className="acciones-panel">
            <button className="boton boton-chico" onClick={acciones.editarDatos} data-testid="accion-editar-lote">
              Editar datos y precio
            </button>
            <button className="boton boton-chico" onClick={acciones.editarForma} data-testid="accion-editar-forma">
              Editar forma
            </button>
            {lote.estado === 'DISPONIBLE' && (
              <button className="boton boton-chico" onClick={() => acciones.cambiarEstado('BLOQUEADO')} data-testid="accion-bloquear">
                Bloquear
              </button>
            )}
            {lote.estado === 'BLOQUEADO' && (
              <button className="boton boton-chico" onClick={() => acciones.cambiarEstado('DISPONIBLE')} data-testid="accion-desbloquear">
                Desbloquear
              </button>
            )}
            {(lote.estado === 'DISPONIBLE' || lote.estado === 'BLOQUEADO') && (
              <button className="boton boton-chico boton-texto-peligro" onClick={acciones.eliminar} data-testid="accion-eliminar">
                Eliminar
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
