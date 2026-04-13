-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('proposal', 'contract', 'addendum', 'other');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('pending_signature', 'signed', 'expired', 'cancelled');

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "drive_file_id" TEXT NOT NULL,
    "drive_view_url" TEXT NOT NULL,
    "drive_download_url" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER,
    "signed_at" TIMESTAMP(3),
    "notes" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'pending_signature',
    "uploaded_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documents_customer_id_idx" ON "documents"("customer_id");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
