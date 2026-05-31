-- Add pharmacy_website (URL) to pharmacy_connections.
-- Optional field; no data migration needed.
ALTER TABLE "pharmacy_connections" ADD COLUMN "pharmacy_website" TEXT;
