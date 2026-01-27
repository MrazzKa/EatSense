-- AlterTable: Add medication stock tracking fields to medications table
DO $$ 
BEGIN
  -- Add quantity column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medications' AND column_name = 'quantity') THEN
    ALTER TABLE "medications" ADD COLUMN "quantity" INTEGER;
    RAISE NOTICE 'Added quantity column to medications';
  ELSE
    RAISE NOTICE 'quantity column already exists in medications';
  END IF;

  -- Add remainingStock column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medications' AND column_name = 'remainingStock') THEN
    ALTER TABLE "medications" ADD COLUMN "remainingStock" INTEGER;
    RAISE NOTICE 'Added remainingStock column to medications';
  ELSE
    RAISE NOTICE 'remainingStock column already exists in medications';
  END IF;

  -- Add lowStockThreshold column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medications' AND column_name = 'lowStockThreshold') THEN
    ALTER TABLE "medications" ADD COLUMN "lowStockThreshold" INTEGER DEFAULT 7;
    RAISE NOTICE 'Added lowStockThreshold column to medications';
  ELSE
    RAISE NOTICE 'lowStockThreshold column already exists in medications';
  END IF;

  -- Add lastStockUpdate column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medications' AND column_name = 'lastStockUpdate') THEN
    ALTER TABLE "medications" ADD COLUMN "lastStockUpdate" TIMESTAMP(3);
    RAISE NOTICE 'Added lastStockUpdate column to medications';
  ELSE
    RAISE NOTICE 'lastStockUpdate column already exists in medications';
  END IF;
END $$;

-- AlterTable: Add pillsPerDose column to medication_doses table
DO $$ 
BEGIN
  -- Add pills_per_dose column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medication_doses' AND column_name = 'pills_per_dose') THEN
    ALTER TABLE "medication_doses" ADD COLUMN "pills_per_dose" INTEGER NOT NULL DEFAULT 1;
    RAISE NOTICE 'Added pills_per_dose column to medication_doses';
  ELSE
    RAISE NOTICE 'pills_per_dose column already exists in medication_doses';
  END IF;
END $$;
