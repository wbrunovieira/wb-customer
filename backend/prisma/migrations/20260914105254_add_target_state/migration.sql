-- Estado espelhado do motor em cada destino. Gravado aqui porque aviso em
-- memória não sobrevive a reload: uma falha às 9h da terça precisa continuar
-- visível às 15h, para quem não estava com a tela aberta.
ALTER TABLE "social_publication_targets" ADD COLUMN "state" TEXT NOT NULL DEFAULT 'QUEUE';
ALTER TABLE "social_publication_targets" ADD COLUMN "failure_reason" TEXT;
ALTER TABLE "social_publication_targets" ADD COLUMN "published_url" TEXT;
ALTER TABLE "social_publication_targets" ADD COLUMN "last_checked_at" TIMESTAMP(3);

-- A reconciliação varre por estado; sem índice ela lê a tabela inteira.
CREATE INDEX "social_publication_targets_state_idx" ON "social_publication_targets"("state");
