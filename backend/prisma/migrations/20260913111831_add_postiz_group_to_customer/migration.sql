-- Grupo do Postiz onde os posts deste cliente são publicados.
-- Único: um grupo pertence a um cliente só, senão dois clientes publicariam
-- na mesma conta social sem ninguém perceber.
ALTER TABLE "customers" ADD COLUMN "postiz_group_id" TEXT;

CREATE UNIQUE INDEX "customers_postiz_group_id_key" ON "customers"("postiz_group_id");
