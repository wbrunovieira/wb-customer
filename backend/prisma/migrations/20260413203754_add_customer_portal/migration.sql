-- CreateEnum
CREATE TYPE "CustomerUserRole" AS ENUM ('master', 'member');

-- CreateTable
CREATE TABLE "customer_users" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "customer_role" "CustomerUserRole" NOT NULL DEFAULT 'member',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customer_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_users_user_id_key" ON "customer_users"("user_id");

-- CreateIndex
CREATE INDEX "customer_users_customer_id_idx" ON "customer_users"("customer_id");

-- AddForeignKey
ALTER TABLE "customer_users" ADD CONSTRAINT "customer_users_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
