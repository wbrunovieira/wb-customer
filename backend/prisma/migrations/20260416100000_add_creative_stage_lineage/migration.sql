-- CreateEnum
CREATE TYPE "CreativeStage" AS ENUM ('exploration', 'refinement', 'scale');

-- AlterTable
ALTER TABLE "creatives"
  ADD COLUMN "stage" "CreativeStage",
  ADD COLUMN "parent_creative_id" TEXT,
  ADD COLUMN "variation_aspects" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AddForeignKey
ALTER TABLE "creatives" ADD CONSTRAINT "creatives_parent_creative_id_fkey"
  FOREIGN KEY ("parent_creative_id") REFERENCES "creatives"("id") ON DELETE SET NULL ON UPDATE CASCADE;
