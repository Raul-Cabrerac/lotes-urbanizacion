import { Link } from 'react-router';
import type { LoteDetalle } from '../../api/tipos';
import { impedimentoComercial, operacionesDelLote, tienePrecio } from '../../dominio';
import { useSesion } from '../../auth/Sesion';
import { Cargando, Dato, Insignia, MensajeError } from '../../componentes/Basicos';
import { Icono } from '../../componentes/Icono';
import { ETIQUETA_MODALIDAD } from '../../utilidades/estados';
import { bs, fecha, m2 } from '../../utilidades/formato';

/** Cambios de estado que el administrador hace a mano (las transiciones de OPERACIONES_LOTE). */
export type CambioEstadoLote = 'bloquear' | 'desbloquear';

/** Por qué no se muestran los botones de reservar y vender, según impedimentoComercial. */
const AVISO_IMPEDIMENTO: Record<NonNullable<ReturnType<typeof impedimentoComercial>>, string> = {
  PROYECTO_NO_PUBLICADO: 'El proyecto está en BORRADOR: publíquelo para poder reservar o vender sus lotes.',
  LOTE_SIN_PRECIO: 'Asigne un precio al lote para poder comercializarlo.',
};

export interface AccionesLote {
  reservar(): void;
  vender(): void;
  cancelarReserva(): void;
  editarDatos(): void;
  editarForma(): void;
  cambiarEstado(operacion: CambioEstadoLote): void;
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
          <button type="button" className="boton-icono" onClick={onCerrar} aria-label="Cerrar detalle" data-testid="detalle-cerrar">
            <Icono nombre="cerrar" tamano={18} />
          </button>
        </div>
        {error ? <MensajeError mensaje={error} /> : <Cargando />}
      </aside>
    );
  }

  const impedimento = impedimentoComercial(lote, lote.proyecto.estado);
  const admite = operacionesDelLote(lote, lote.proyecto.estado);
  const { reservaActiva: reserva, ventaVigente: venta } = lote;

  return (
    <aside className="panel-detalle" data-testid="panel-lote" data-lote={lote.codigo}>
      <div className="panel-cabecera">
        <div>
          <div className="texto-suave pequeno">{lote.proyecto.nombre}</div>
          <h2 data-testid="detalle-codigo">Lote {lote.codigo}</h2>
          <Insignia estado={lote.estado} testid="detalle-estado" />
        </div>
        <button type="button" className="boton-icono" onClick={onCerrar} aria-label="Cerrar detalle" data-testid="detalle-cerrar">
          <Icono nombre="cerrar" tamano={18} />
        </button>
      </div>

      <div className="grilla-datos">
        <Dato etiqueta="Manzano">{lote.manzano || '—'}</Dato>
        <Dato etiqueta="Etapa / sector">{lote.etapa || '—'}</Dato>
        <Dato etiqueta="Superficie" testid="detalle-superficie">{m2(lote.superficieM2)}</Dato>
        <Dato etiqueta="Dimensiones" testid="detalle-dimensiones">{lote.dimensiones || '—'}</Dato>
        <Dato etiqueta="Precio de lista" testid="detalle-precio">
          {tienePrecio(lote.precio) ? bs(lote.precio) : <span className="texto-alerta">Sin precio</span>}
        </Dato>
      </div>

      {reserva && (
        <div className="caja caja-ambar" data-testid="detalle-reserva">
          <strong>Reservado para {reserva.cliente.nombreCompleto}</strong>
          <div>CI/NIT {reserva.cliente.documento} · Tel. {reserva.cliente.telefono}</div>
          <div>
            Desde {fecha(reserva.fecha)} · {reserva.fechaVencimiento ? `vence el ${fecha(reserva.fechaVencimiento)}` : 'sin vencimiento'}
          </div>
          {reserva.anticipo > 0 && (
            <div data-testid="detalle-anticipo">
              Anticipo: {bs(reserva.anticipo)} · {reserva.metodoAnticipo}
            </div>
          )}
          <div className="texto-suave">Asesor: {reserva.asesor.nombre}</div>
          {reserva.observacion && <div className="texto-suave">“{reserva.observacion}”</div>}
        </div>
      )}

      {venta && (
        <div className="caja caja-roja" data-testid="detalle-venta">
          <strong>Vendido a {venta.cliente.nombreCompleto}</strong>
          <div>
            {fecha(venta.fecha)} · {ETIQUETA_MODALIDAD[venta.modalidad]} · Asesor: {venta.asesor.nombre}
          </div>
          <div className="grilla-datos compacta">
            <Dato etiqueta="Precio pactado">{bs(venta.precioPactado)}</Dato>
            <Dato etiqueta="Pagado">{bs(venta.totalPagado)}</Dato>
            <Dato etiqueta="Saldo">{bs(venta.saldoPendiente)}</Dato>
          </div>
          <Link to={`/ventas/${venta.id}`} className="boton boton-chico" data-testid="detalle-ver-venta">
            Ver plan de pagos
            <Icono nombre="flecha" tamano={14} />
          </Link>
        </div>
      )}

      {impedimento && <div className="caja caja-gris">{AVISO_IMPEDIMENTO[impedimento]}</div>}

      {/* Acciones comerciales (asesor y administrador), ocultas mientras se edita la forma */}
      {!editandoForma && (
        <div className="acciones-panel acciones-comerciales">
          {admite.reservar && puede('reservas:gestionar') && (
            <button type="button" className="boton" onClick={acciones.reservar} data-testid="accion-reservar">
              Reservar
            </button>
          )}
          {admite.vender && puede('ventas:registrar') && (
            <button type="button" className="boton boton-primario" onClick={acciones.vender} data-testid="accion-vender">
              {reserva ? `Vender a ${reserva.cliente.nombreCompleto.split(' ')[0]}` : 'Vender'}
            </button>
          )}
          {reserva && puede('reservas:gestionar') && (
            <button type="button" className="boton boton-fantasma" onClick={acciones.cancelarReserva} data-testid="accion-cancelar-reserva">
              Cancelar reserva
            </button>
          )}
        </div>
      )}

      {/* Acciones del administrador */}
      {puede('lotes:gestionar') && !editandoForma && (
        <div className="acciones-panel acciones-admin">
          <span className="texto-suave pequeno">Administración del lote</span>
          <div className="acciones-panel">
            <button type="button" className="boton boton-chico" onClick={acciones.editarDatos} data-testid="accion-editar-lote">
              Editar datos y precio
            </button>
            <button type="button" className="boton boton-chico" onClick={acciones.editarForma} data-testid="accion-editar-forma">
              Editar forma
            </button>
            {admite.bloquear && (
              <button type="button" className="boton boton-chico" onClick={() => acciones.cambiarEstado('bloquear')} data-testid="accion-bloquear">
                Bloquear
              </button>
            )}
            {admite.desbloquear && (
              <button type="button" className="boton boton-chico" onClick={() => acciones.cambiarEstado('desbloquear')} data-testid="accion-desbloquear">
                Desbloquear
              </button>
            )}
            {admite.eliminar && (
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
