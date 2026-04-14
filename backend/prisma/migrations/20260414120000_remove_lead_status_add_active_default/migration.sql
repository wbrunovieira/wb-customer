-- Migrate existing 'lead' customers to 'active'
UPDATE "customers" SET status = 'active' WHERE status = 'lead';

-- Recreate CustomerStatus enum without 'lead'
ALTER TYPE "CustomerStatus" RENAME TO "CustomerStatus_old";
CREATE TYPE "CustomerStatus" AS ENUM ('active', 'inactive');

-- Migrate column to new enum type
ALTER TABLE "customers" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "customers"
  ALTER COLUMN "status" TYPE "CustomerStatus"
  USING status::text::"CustomerStatus";
ALTER TABLE "customers" ALTER COLUMN "status" SET DEFAULT 'active';

-- Drop old enum
DROP TYPE "CustomerStatus_old";
