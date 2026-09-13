-- Uma decisão de publicar, tomada no wb-customer. O motor executa; isto guarda
-- o que foi decidido e para onde foi.
CREATE TABLE "social_publications" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "postiz_group_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "attribution_link_id" TEXT,
    "creative_id" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_publications_pkey" PRIMARY KEY ("id")
);

-- O motor devolve um id de post por canal, então a chave de cruzamento com as
-- métricas fica aqui, não na publicação.
CREATE TABLE "social_publication_targets" (
    "id" TEXT NOT NULL,
    "publication_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "postiz_post_id" TEXT NOT NULL,

    CONSTRAINT "social_publication_targets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "social_publications_customer_id_idx" ON "social_publications"("customer_id");
CREATE INDEX "social_publications_scheduled_for_idx" ON "social_publications"("scheduled_for");
CREATE INDEX "social_publication_targets_publication_id_idx" ON "social_publication_targets"("publication_id");
CREATE INDEX "social_publication_targets_postiz_post_id_idx" ON "social_publication_targets"("postiz_post_id");

ALTER TABLE "social_publications" ADD CONSTRAINT "social_publications_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "social_publication_targets" ADD CONSTRAINT "social_publication_targets_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "social_publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
