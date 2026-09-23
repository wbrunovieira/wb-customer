-- AlterTable
ALTER TABLE "social_publications" ALTER COLUMN "creative_ids" DROP DEFAULT;

-- CreateTable
CREATE TABLE "social_engine_config" (
    "id" TEXT NOT NULL DEFAULT 'social-engine-singleton',
    "api_url" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_engine_config_pkey" PRIMARY KEY ("id")
);
