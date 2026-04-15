-- CreateEnum
CREATE TYPE "CreativeType" AS ENUM ('image', 'video', 'carousel');

-- CreateEnum
CREATE TYPE "CreativeStatus" AS ENUM ('draft', 'active', 'paused', 'archived');

-- CreateEnum
CREATE TYPE "CampaignObjective" AS ENUM ('awareness', 'traffic', 'engagement', 'leads', 'sales', 'retargeting');

-- CreateEnum
CREATE TYPE "StrategyPhase" AS ENUM ('exploration', 'refinement');

-- CreateEnum
CREATE TYPE "StrategyStatus" AS ENUM ('active', 'completed', 'paused');

-- CreateTable
CREATE TABLE "creatives" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caption" TEXT,
    "text_in_creative" TEXT,
    "design_description" TEXT,
    "type" "CreativeType" NOT NULL,
    "objective" "CampaignObjective",
    "status" "CreativeStatus" NOT NULL DEFAULT 'draft',
    "drive_file_id" TEXT,
    "drive_view_url" TEXT,
    "drive_download_url" TEXT,
    "thumbnail_url" TEXT,
    "mime_type" TEXT,
    "size_bytes" BIGINT,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "creatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creative_performances" (
    "id" TEXT NOT NULL,
    "creative_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "campaign_id" TEXT,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION,
    "cpc" DOUBLE PRECISION,
    "cpa" DOUBLE PRECISION,
    "roas" DOUBLE PRECISION,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "notes" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creative_performances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creative_strategies" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phase" "StrategyPhase" NOT NULL,
    "status" "StrategyStatus" NOT NULL DEFAULT 'active',
    "objective" "CampaignObjective",
    "budget" DOUBLE PRECISION,
    "duration_days" INTEGER,
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "winner_id" TEXT,
    "parent_strategy_id" TEXT,
    "notes" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creative_strategies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creative_strategy_items" (
    "strategy_id" TEXT NOT NULL,
    "creative_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creative_strategy_items_pkey" PRIMARY KEY ("strategy_id","creative_id")
);

-- CreateIndex
CREATE INDEX "creatives_customer_id_idx" ON "creatives"("customer_id");

-- CreateIndex
CREATE INDEX "creative_performances_creative_id_idx" ON "creative_performances"("creative_id");

-- CreateIndex
CREATE INDEX "creative_strategies_customer_id_idx" ON "creative_strategies"("customer_id");

-- AddForeignKey
ALTER TABLE "creatives" ADD CONSTRAINT "creatives_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_performances" ADD CONSTRAINT "creative_performances_creative_id_fkey" FOREIGN KEY ("creative_id") REFERENCES "creatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_strategies" ADD CONSTRAINT "creative_strategies_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_strategies" ADD CONSTRAINT "creative_strategies_parent_strategy_id_fkey" FOREIGN KEY ("parent_strategy_id") REFERENCES "creative_strategies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_strategy_items" ADD CONSTRAINT "creative_strategy_items_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "creative_strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_strategy_items" ADD CONSTRAINT "creative_strategy_items_creative_id_fkey" FOREIGN KEY ("creative_id") REFERENCES "creatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
