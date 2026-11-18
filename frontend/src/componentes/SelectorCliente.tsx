import { useMemo, useState } from 'react';
import { api } from '../api/api';
import type { Cliente } from '../api/tipos';
import { useDatos } from '../utilidades/useDatos';
import { CampoBusqueda } from './Basicos';
import { Icono } from './Icono';
import { ModalCliente } from './ModalCliente';

/** Lista desplegable de clientes, cada uno como "nombre (documento)". */
export function SelectCliente({
  clientes,
  valor,
  onCambiar,
  opcionVacia,
  required,
  testid,
}: {
  clientes: Cliente[];
  valor: number | null;
  onCambiar: (clienteId: number | null) => void;
  /** Texto de la opción sin cliente. */
  opcionVacia: string;
  required?: boolean;
  testid: string;
}) {
  return (
    <select
      value={valor ?? ''}
      onChange={(e) => onCambiar(e.target.value ? Number(e.target.value) : null)}
      required={required}
      data-testid={testid}
    >
      <option value="">{opcionVacia}</option>
      {clientes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.nombreCompleto} ({c.documento})
        </option>
      ))}
    </select>
  );
}

/** Selección de cliente con búsqueda y opción de registrar uno nuevo sin salir del formulario. */
export function SelectorCliente({
  valor,
  onCambiar,
  testid,
}: {
  valor: number | null;
  onCambiar: (clienteId: number | null) => void;
  testid: string;
}) {
  const { datos: clientes, recargar } = useDatos(() => api.clientes.listar(), []);
  const [busqueda, setBusqueda] = useState('');
  const [registrando, setRegistrando] = useState(false);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return (clientes ?? []).filter(
      (c) => !texto || c.id === valor || `${c.nombreCompleto} ${c.documento}`.toLowerCase().includes(texto),
    );
  }, [clientes, busqueda, valor]);

  return (
    <div className="selector-cliente">
      <div className="fila-campos">
        <CampoBusqueda
          placeholder="Nombre o documento"
          aria-label="Buscar cliente"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          data-testid={`${testid}-buscar`}
        />
        <button type="button" className="boton" onClick={() => setRegistrando(true)} data-testid={`${testid}-nuevo`}>
          <Icono nombre="mas" />
          Nuevo cliente
        </button>
      </div>
      <SelectCliente
        clientes={visibles}
        valor={valor}
        onCambiar={onCambiar}
        opcionVacia="— Seleccione un cliente —"
        required
        testid={testid}
      />
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
