import { useState, type FormEvent } from 'react';
import { api } from '../api/api';
import { LONGITUD_MINIMA_PASSWORD, ROLES, seVinculaACliente, type Rol } from '../dominio';
import { useSesion } from '../auth/Sesion';
import { useAvisos } from '../componentes/Avisos';
import { Campo, Cargando, ContenedorTabla, Encabezado, MensajeError } from '../componentes/Basicos';
import { Icono } from '../componentes/Icono';
import { Modal } from '../componentes/Modal';
import { SelectCliente } from '../componentes/SelectorCliente';
import { Tabla } from '../componentes/Tabla';
import { NOMBRE_ROL } from '../utilidades/estados';
import { fecha } from '../utilidades/formato';
import { useDatos } from '../utilidades/useDatos';
import { useEnvio } from '../utilidades/useEnvio';
import { useOperacion } from '../utilidades/useOperacion';

/** Administración de usuarios del sistema (solo administrador). */
export function Usuarios() {
  const { usuario: actual } = useSesion();
  const avisos = useAvisos();
  const { datos: usuarios, error, cargando, recargar } = useDatos(() => api.usuarios.listar(), []);
  const [creando, setCreando] = useState(false);
  const ejecutar = useOperacion(recargar);

  const cambiarActivo = (id: number, activo: boolean) =>
    ejecutar(
      () => api.usuarios.cambiarActivo(id, activo),
      activo ? 'Usuario activado.' : 'Usuario desactivado: ya no puede iniciar sesión.',
    );

  return (
    <div className="pagina">
      <Encabezado titulo="Usuarios" subtitulo="Cuentas de acceso: administradores, asesores y clientes (portal).">
        <button type="button" className="boton boton-primario" onClick={() => setCreando(true)} data-testid="nuevo-usuario">
          <Icono nombre="mas" />
          Nuevo usuario
        </button>
      </Encabezado>
      <MensajeError mensaje={error} />
      {cargando && !usuarios && <Cargando />}
      {usuarios && (
        <ContenedorTabla etiqueta="Usuarios">
          <Tabla
            testid="tabla-usuarios"
            filas={usuarios}
            clave={(u) => u.id}
            atributosFila={(u) => ({ className: u.activo ? '' : 'fila-anulada', 'data-testid': `fila-usuario-${u.email}` })}
            columnas={[
              { titulo: 'Nombre', encabezaFicha: true, celda: (u) => <strong>{u.nombre}</strong> },
              { titulo: 'Correo', celda: (u) => u.email },
              { titulo: 'Rol', celda: (u) => NOMBRE_ROL[u.rol] },
              { titulo: 'Cliente vinculado', celda: (u) => u.cliente?.nombre ?? '—' },
              { titulo: 'Creado', celda: (u) => fecha(u.creadoEn) },
              { titulo: 'Estado', celda: (u) => (u.activo ? 'Activo' : 'Inactivo') },
              {
                titulo: '',
                clase: 'numero',
                celda: (u) =>
                  u.id !== actual?.id && (
                    <button
                      className="boton boton-chico"
                      onClick={() => cambiarActivo(u.id, !u.activo)}
                      data-testid={`usuario-activo-${u.email}`}
                    >
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  ),
              },
            ]}
          />
        </ContenedorTabla>
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
  const { enviar, enviando, error } = useEnvio();

  const guardar = (e: FormEvent) => {
    e.preventDefault();
    void enviar(async () => {
      await api.usuarios.crear({ nombre, email, password, rol, clienteId: seVinculaACliente(rol) ? clienteId : null });
      onCreado();
    });
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
          <Campo etiqueta="Contraseña *" ayuda={`Mínimo ${LONGITUD_MINIMA_PASSWORD} caracteres`}>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="usuario-password" />
          </Campo>
        </div>
        <Campo etiqueta="Rol">
          <select value={rol} onChange={(e) => setRol(e.target.value as Rol)} data-testid="usuario-rol-select">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {NOMBRE_ROL[r]}
              </option>
            ))}
          </select>
        </Campo>
        {seVinculaACliente(rol) && (
          <Campo etiqueta="Cliente vinculado *" ayuda="El usuario solo podrá ver las operaciones de este cliente.">
            <SelectCliente
              clientes={clientes ?? []}
              valor={clienteId}
              onCambiar={setClienteId}
              opcionVacia="— Seleccione —"
              required
              testid="usuario-cliente"
            />
          </Campo>
        )}
        <MensajeError mensaje={error} testid="usuario-error" />
        <div className="modal-pie">
          <button type="button" className="boton" onClick={onCerrar} data-testid="usuario-cancelar">
            Cancelar
          </button>
          <button type="submit" className="boton boton-primario" disabled={enviando} data-testid="usuario-guardar">
            {enviando ? 'Guardando…' : 'Crear usuario'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
