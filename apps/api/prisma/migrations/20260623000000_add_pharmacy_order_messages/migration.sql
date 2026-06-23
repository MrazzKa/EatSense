-- Pharmacy → customer messages on an order (out of stock, prepayment required, etc.)
-- Stored as a JSON array: [{ reason, text, createdAt }]. Safe on clean and prod DBs.
ALTER TABLE "pharmacy_orders"
  ADD COLUMN IF NOT EXISTS "pharmacy_messages" JSONB;
