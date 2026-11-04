-- =============================================================================
-- Esquema inicial - Sistema de Gestión de Urbanizaciones y Lotes
--
-- Notas de diseño:
-- * Las reglas de negocio están en src/dominio (se prueban sin base de datos).
--   Los CHECK y UNIQUE de aquí son una segunda barrera que protege los datos
--   aunque el código tuviera un error.
-- * Los montos son NUMERIC(14,2): bolivianos con 2 decimales exactos.
-- * La geometría de cada lote es GeoJSON (JSONB) en coordenadas [lng, lat].
-- * El saldo de una venta NO se guarda: se calcula como
--   precio pactado - suma de pagos VÁLIDOS (consigna, sección 9).
-- =============================================================================

CREATE TABLE clientes (
  id              SERIAL PRIMARY KEY,
  nombre_completo TEXT NOT NULL,
  documento       TEXT NOT NULL UNIQUE,          -- CI o NIT
  telefono        TEXT NOT NULL,
  email           TEXT NOT NULL DEFAULT '',
  direccion       TEXT NOT NULL DEFAULT '',
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol           TEXT NOT NULL CHECK (rol IN ('ADMIN', 'ASESOR', 'CLIENTE')),
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  -- Solo los usuarios CLIENTE se vinculan a un cliente (para ver sus operaciones).
  cliente_id    INTEGER UNIQUE REFERENCES clientes (id),
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((rol = 'CLIENTE') = (cliente_id IS NOT NULL))
);

CREATE TABLE proyectos (
  id             SERIAL PRIMARY KEY,
  nombre         TEXT NOT NULL,
  descripcion    TEXT NOT NULL DEFAULT '',
  ubicacion      TEXT NOT NULL,
  estado         TEXT NOT NULL DEFAULT 'BORRADOR' CHECK (estado IN ('BORRADOR', 'PUBLICADO')),
  limite         JSONB,                          -- perímetro del proyecto (opcional)
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lotes (
  id             SERIAL PRIMARY KEY,
  proyecto_id    INTEGER NOT NULL REFERENCES proyectos (id),  -- un lote siempre pertenece a un proyecto
  codigo         TEXT NOT NULL,
  manzano        TEXT NOT NULL DEFAULT '',
  etapa          TEXT NOT NULL DEFAULT '',
  superficie_m2  NUMERIC(12, 2) NOT NULL CHECK (superficie_m2 > 0),
  dimensiones    TEXT NOT NULL DEFAULT '',
  precio         NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (precio >= 0),
  estado         TEXT NOT NULL DEFAULT 'DISPONIBLE'
                 CHECK (estado IN ('DISPONIBLE', 'RESERVADO', 'VENDIDO', 'BLOQUEADO')),
  geometria      JSONB NOT NULL,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (proyecto_id, codigo)
);
CREATE INDEX lotes_por_proyecto_y_estado ON lotes (proyecto_id, estado);

CREATE TABLE reservas (
  id                 SERIAL PRIMARY KEY,
  lote_id            INTEGER NOT NULL REFERENCES lotes (id),
  cliente_id         INTEGER NOT NULL REFERENCES clientes (id),
  asesor_id          INTEGER NOT NULL REFERENCES usuarios (id),
  fecha              TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_vencimiento  DATE,                       -- opcional
  observacion        TEXT NOT NULL DEFAULT '',
  estado             TEXT NOT NULL DEFAULT 'ACTIVA'
                     CHECK (estado IN ('ACTIVA', 'CANCELADA', 'VENCIDA', 'CONVERTIDA')),
  motivo_finalizacion TEXT,                      -- motivo de la cancelación o vencimiento
  finalizada_en      TIMESTAMPTZ                 -- cuándo dejó de estar ACTIVA
);
-- Regla crítica respaldada por la base de datos: un lote nunca tiene dos reservas ACTIVAS.
CREATE UNIQUE INDEX reservas_una_activa_por_lote ON reservas (lote_id) WHERE estado = 'ACTIVA';
CREATE INDEX reservas_por_estado ON reservas (estado);

CREATE TABLE ventas (
  id               SERIAL PRIMARY KEY,
  lote_id          INTEGER NOT NULL REFERENCES lotes (id),
  cliente_id       INTEGER NOT NULL REFERENCES clientes (id),
  asesor_id        INTEGER NOT NULL REFERENCES usuarios (id),
  reserva_id       INTEGER UNIQUE REFERENCES reservas (id),
  fecha            TIMESTAMPTZ NOT NULL DEFAULT now(),
  precio_pactado   NUMERIC(14, 2) NOT NULL CHECK (precio_pactado > 0),  -- se congela al vender
  modalidad        TEXT NOT NULL CHECK (modalidad IN ('CONTADO', 'FINANCIADO')),
  cuota_inicial    NUMERIC(14, 2) NOT NULL DEFAULT 0,
  numero_cuotas    INTEGER NOT NULL DEFAULT 0,
  estado           TEXT NOT NULL DEFAULT 'VIGENTE' CHECK (estado IN ('VIGENTE', 'ANULADA')),
  motivo_anulacion TEXT,
  anulada_en       TIMESTAMPTZ,
  anulada_por_id   INTEGER REFERENCES usuarios (id)
);
-- Un lote nunca tiene dos ventas VIGENTES.
CREATE UNIQUE INDEX ventas_una_vigente_por_lote ON ventas (lote_id) WHERE estado = 'VIGENTE';
CREATE INDEX ventas_por_cliente ON ventas (cliente_id);

CREATE TABLE cuotas (
  id                SERIAL PRIMARY KEY,
  venta_id          INTEGER NOT NULL REFERENCES ventas (id),
  numero            INTEGER NOT NULL CHECK (numero >= 0),  -- 0 = cuota inicial o pago al contado
  concepto          TEXT NOT NULL,
  monto             NUMERIC(14, 2) NOT NULL CHECK (monto > 0),
  fecha_vencimiento DATE NOT NULL,
  UNIQUE (venta_id, numero)
);

CREATE TABLE pagos (
  id                SERIAL PRIMARY KEY,
  cuota_id          INTEGER NOT NULL REFERENCES cuotas (id),
  monto             NUMERIC(14, 2) NOT NULL CHECK (monto > 0),
  metodo            TEXT NOT NULL DEFAULT 'EFECTIVO'
                    CHECK (metodo IN ('EFECTIVO', 'TRANSFERENCIA', 'QR', 'TARJETA')),
  referencia        TEXT NOT NULL DEFAULT '',
  fecha             TIMESTAMPTZ NOT NULL DEFAULT now(),
  registrado_por_id INTEGER NOT NULL REFERENCES usuarios (id),
  -- Un pago nunca se borra: se ANULA guardando quién, cuándo y por qué (trazabilidad).
  estado            TEXT NOT NULL DEFAULT 'VALIDO' CHECK (estado IN ('VALIDO', 'ANULADO')),
  motivo_anulacion  TEXT,
  anulado_en        TIMESTAMPTZ,
  anulado_por_id    INTEGER REFERENCES usuarios (id)
);
CREATE INDEX pagos_por_cuota ON pagos (cuota_id);
