-- Métrica orgânica de post. Tabela própria, e não creative_performances,
-- porque aquela é de tráfego pago e não tem onde guardar alcance, salvamento
-- ou compartilhamento — e gasto zero tornaria CTR, CPA e ROAS sem sentido.
CREATE TABLE "social_post_metrics" (
    "id" TEXT NOT NULL,
    "postiz_post_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    -- Nulo é "a rede não informou", diferente de zero.
    "views" INTEGER,
    "reach" INTEGER,
    "likes" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "saves" INTEGER,
    "raw" JSONB NOT NULL,
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_post_metrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "social_post_metrics_postiz_post_id_key" ON "social_post_metrics"("postiz_post_id");
CREATE INDEX "social_post_metrics_customer_id_idx" ON "social_post_metrics"("customer_id");
CREATE INDEX "social_post_metrics_provider_idx" ON "social_post_metrics"("provider");
