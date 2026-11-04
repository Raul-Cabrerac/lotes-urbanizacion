import { useState, type FormEvent } from 'react';
import { api } from '../api/api';
import { mensajeDeError } from '../api/http';
import type { Rol } from '../api/tipos';
import { useSesion } from '../auth/Sesion';
import { useAvisos } from '../componentes/Avisos';
import { Campo, Cargando, Encabezado, MensajeError } from '../componentes/Basicos';
import { Modal } from '../componentes/Modal';
import { fecha, NOMBRE_ROL } from '../utilidades/formato';
import { useDatos } from '../utilidades/useDatos';

/** Administración de usuarios del sistema (solo administrador). */
export function Usuarios() {
  const { usuario: actual } = useSesion();
  const avisos = useAvisos();
  const { datos: usuarios, error, cargando, recargar } = useDatos(() => api.usuarios.listar(), []);
  const [creando, setCreando] = useState(false);

  const cambiarActivo = async (id: number, activo: boolean) => {
    try {
      await api.usuarios.cambiarActivo(id, activo);
      avisos.exito(activo ? 'Usuario activado.' : 'Usuario desactivado: ya no puede iniciar sesión.');
      await recargar();
    } catch (err) {
      avisos.error(err);
    }
  };

  return (
    <div className="pagina">
      <Encabezado titulo="Usuarios" subtitulo="Cuentas de acceso: administradores, asesores y clientes (portal).">
        <button className="boton boton-primario" onClick={() => setCreando(true)} data-testid="nuevo-usuario">
          + Nuevo usuario
        </button>
      </Encabezado>
      <MensajeError mensaje={error} />
      {cargando && !usuarios && <Cargando />}
      {usuarios && (
        <div className="tarjeta sin-relleno">
          <table className="tabla" data-testid="tabla-usuarios">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Cliente vinculado</th>
                <th>Creado</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className={u.activo ? '' : 'fila-anulada'} data-testid={`fila-usuario-${u.email}`}>
                  <td>{u.nombre}</td>
                  <td>{u.email}</td>
                  <td>{NOMBRE_ROL[u.rol]}</td>
                  <td>{u.cliente?.nombre ?? '—'}</td>
                  <td>{fecha(u.creadoEn)}</td>
                  <td>{u.activo ? 'Activo' : 'Inactivo'}</td>
                  <td className="numero">
                    {u.id !== actual?.id && (
                      <button
                        className="boton boton-chico"
                        onClick={() => cambiarActivo(u.id, !u.activo)}
                        data-testid={`usuario-activo-${u.email}`}
                      >
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {creando && (
        <ModalUsuario
          onCerrar={() => setCreando(false)}
          onCreado={async () => {
            setCreando(false);
            avisos.exito('Usuario creado.');
            await recargar();
          }}
        />
      )}
    </div>
  );
}

function ModalUsuario({ onCerrar, onCreado }: { onCerrar: () => void; onCreado: () => void }) {
  const { datos: clientes } = useDatos(() => api.clientes.listar(), []);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<Rol>('ASESOR');
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await api.usuarios.crear({ nombre, email, password, rol, clienteId: rol === 'CLIENTE' ? clienteId : null });
      onCreado();
    } catch (err) {
      setError(mensajeDeError(err));
      setGuardando(false);
    }
  };

  return (
    <Modal titulo="Nuevo usuario" onCerrar={onCerrar} testid="modal-usuario">
      <form onSubmit={guardar} className="formulario">
        <Campo etiqueta="Nombre *">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required data-testid="usuario-nombre-input" />
        </Campo>
        <div className="fila-campos">
          <Campo etiqueta="Correo *">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="usuario-email" />
          </Campo>
          <Campo etiqueta="Contraseña *" ayuda="Mínimo 6 caracteres">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="usuario-password" />
          </Campo>
        </div>
        <Campo etiqueta="Rol">
          <select value={rol} onChange={(e) => setRol(e.target.value as Rol)} data-testid="usuario-rol-select">
            {(Object.keys(NOMBRE_ROL) as Rol[]).map((r) => (
              <option key={r} value={r}>
                {NOMBRE_ROL[r]}
              </option>
            ))}
          </select>
        </Campo>
        {rol === 'CLIENTE' && (
          <Campo etiqueta="Cliente vinculado *" ayuda="El usuario solo podrá ver las operaciones de este cliente.">
            <select value={clienteId ?? ''} onChange={(e) => setClienteId(e.target.value ? Number(e.target.value) : null)} data-testid="usuario-cliente">
              <option value="">— Seleccione —</option>
              {clientes?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombreCompleto} ({c.documento})
                </option>
              ))}
            </select>
          </Campo>
        )}
        <MensajeError mensaje={error} testid="usuario-error" />
        <div className="modal-pie">
          <button type="button" className="boton" onClick={onCerrar} data-testid="usuario-cancelar">
            Cancelar
          </button>
          <button type="submit" className="boton boton-primario" disabled={guardando} data-testid="usuario-guardar">
            {guardando ? 'Guardando...' : 'Crear usuario'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
