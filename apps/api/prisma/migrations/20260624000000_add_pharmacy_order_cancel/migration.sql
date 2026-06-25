-- Pharmacy can decline/close an order from the email link, with a reason.
-- Used to track repeat no-shows (cancel_reason = 'not_picked_up'). Safe on clean & prod DBs.
ALTER TABLE "pharmacy_orders"
  ADD COLUMN IF NOT EXISTS "cancel_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP(3);
