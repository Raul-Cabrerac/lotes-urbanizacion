import { useState, type FormEvent } from 'react';
import { api } from '../api/api';
import { mensajeDeError } from '../api/http';
import type { Cliente } from '../api/tipos';
import { Campo, MensajeError } from '../componentes/Basicos';
import { Modal } from '../componentes/Modal';

/** Registrar (sin `cliente`) o editar un cliente. */
export function ModalCliente({
  cliente,
  onCerrar,
  onGuardado,
}: {
  cliente?: Cliente;
  onCerrar: () => void;
  onGuardado: (cliente: Cliente) => void;
}) {
  const [datos, setDatos] = useState({
    nombreCompleto: cliente?.nombreCompleto ?? '',
    documento: cliente?.documento ?? '',
    telefono: cliente?.telefono ?? '',
    email: cliente?.email ?? '',
    direccion: cliente?.direccion ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const cambiar = (campo: keyof typeof datos) => (e: { target: { value: string } }) =>
    setDatos((d) => ({ ...d, [campo]: e.target.value }));

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      onGuardado(cliente ? await api.clientes.actualizar(cliente.id, datos) : await api.clientes.crear(datos));
    } catch (err) {
      setError(mensajeDeError(err));
      setGuardando(false);
    }
  };

  return (
    <Modal titulo={cliente ? 'Editar cliente' : 'Registrar cliente'} onCerrar={onCerrar} testid="modal-cliente">
      <form onSubmit={guardar} className="formulario">
        <Campo etiqueta="Nombre completo *">
          <input value={datos.nombreCompleto} onChange={cambiar('nombreCompleto')} required data-testid="cliente-nombre" />
        </Campo>
        <div className="fila-campos">
          <Campo etiqueta="Documento (CI / NIT) *">
            <input value={datos.documento} onChange={cambiar('documento')} required data-testid="cliente-documento" />
          </Campo>
          <Campo etiqueta="Teléfono *">
            <input value={datos.telefono} onChange={cambiar('telefono')} required data-testid="cliente-telefono" />
          </Campo>
        </div>
        <Campo etiqueta="Correo electrónico">
          <input type="email" value={datos.email} onChange={cambiar('email')} data-testid="cliente-email" />
        </Campo>
        <Campo etiqueta="Dirección">
          <input value={datos.direccion} onChange={cambiar('direccion')} data-testid="cliente-direccion" />
        </Campo>
        <MensajeError mensaje={error} />
        <div className="modal-pie">
          <button type="button" className="boton" onClick={onCerrar} data-testid="cliente-cancelar">
            Cancelar
          </button>
          <button type="submit" className="boton boton-primario" disabled={guardando} data-testid="cliente-guardar">
            {guardando ? 'Guardando...' : 'Guardar cliente'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
