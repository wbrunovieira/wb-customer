-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "attribution_code" TEXT,
ADD COLUMN     "attribution_link_id" TEXT,
ADD COLUMN     "attribution_source" TEXT;

-- CreateTable
CREATE TABLE "social_attribution_links" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "post_ref" TEXT,
    "destination_phone" TEXT NOT NULL,
    "prefilled_message" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "social_attribution_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "social_attribution_links_code_key" ON "social_attribution_links"("code");

-- CreateIndex
CREATE INDEX "social_attribution_links_customer_id_idx" ON "social_attribution_links"("customer_id");

-- CreateIndex
CREATE INDEX "social_attribution_links_deleted_at_idx" ON "social_attribution_links"("deleted_at");

-- CreateIndex
CREATE INDEX "activities_attribution_link_id_idx" ON "activities"("attribution_link_id");

-- AddForeignKey
ALTER TABLE "social_attribution_links" ADD CONSTRAINT "social_attribution_links_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_attribution_link_id_fkey" FOREIGN KEY ("attribution_link_id") REFERENCES "social_attribution_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;
