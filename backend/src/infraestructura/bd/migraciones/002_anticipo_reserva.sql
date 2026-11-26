-- Anticipo de la reserva (docs/DECISIONES.md §18): lo que el cliente paga para apartar el lote.
-- Las reservas anteriores a esta migración quedan con anticipo 0; las nuevas exigen al menos el
-- 10 % del precio del lote (la regla está en dominio/reserva.ts: validarAnticipo).
ALTER TABLE reservas
  ADD COLUMN anticipo NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (anticipo >= 0),
  ADD COLUMN metodo_anticipo TEXT NOT NULL DEFAULT 'EFECTIVO'
    CHECK (metodo_anticipo IN ('EFECTIVO', 'TRANSFERENCIA', 'QR', 'TARJETA'));
