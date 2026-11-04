import { useMemo, useState } from 'react';
import { api } from '../api/api';
import type { Cliente } from '../api/tipos';
import { ModalCliente } from '../paginas/ModalCliente';
import { useDatos } from '../utilidades/useDatos';

/** Selección de cliente con búsqueda y opción de registrar uno nuevo sin salir del formulario. */
export function SelectorCliente({
  valor,
  onCambiar,
  testid = 'selector-cliente',
}: {
  valor: number | null;
  onCambiar: (clienteId: number | null) => void;
  testid?: string;
}) {
  const { datos: clientes, recargar } = useDatos(() => api.clientes.listar(), []);
  const [busqueda, setBusqueda] = useState('');
  const [registrando, setRegistrando] = useState(false);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return (clientes ?? []).filter(
      (c: Cliente) => !texto || c.id === valor || `${c.nombreCompleto} ${c.documento}`.toLowerCase().includes(texto),
    );
  }, [clientes, busqueda, valor]);

  return (
    <div className="selector-cliente">
      <div className="fila-campos">
        <input
          placeholder="Buscar por nombre o documento..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          data-testid={`${testid}-buscar`}
        />
        <button type="button" className="boton" onClick={() => setRegistrando(true)} data-testid={`${testid}-nuevo`}>
          + Nuevo cliente
        </button>
      </div>
      <select
        value={valor ?? ''}
        onChange={(e) => onCambiar(e.target.value ? Number(e.target.value) : null)}
        required
        data-testid={testid}
      >
        <option value="">— Seleccione un cliente —</option>
        {visibles.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombreCompleto} ({c.documento})
          </option>
        ))}
      </select>
      {registrando && (
        <ModalCliente
          onCerrar={() => setRegistrando(false)}
          onGuardado={async (nuevo) => {
            setRegistrando(false);
            await recargar();
            onCambiar(nuevo.id);
          }}
        />
      )}
    </div>
  );
}
