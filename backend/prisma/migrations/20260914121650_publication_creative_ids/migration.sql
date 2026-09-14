-- Um post pode levar vários criativos (carrossel). A coluna única virou lista,
-- preservando o que já existia: o criativo de antes passa a ser o primeiro da
-- ordem, que é exatamente o que ele era.
ALTER TABLE "social_publications" ADD COLUMN "creative_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "social_publications"
   SET "creative_ids" = ARRAY["creative_id"]
 WHERE "creative_id" IS NOT NULL;

ALTER TABLE "social_publications" DROP COLUMN "creative_id";
