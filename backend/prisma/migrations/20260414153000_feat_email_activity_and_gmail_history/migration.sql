-- Add email_received to CustomerActivityType enum
ALTER TYPE "CustomerActivityType" ADD VALUE IF NOT EXISTS 'email_received';

-- Add gmail_history_id to google_tokens
ALTER TABLE "google_tokens" ADD COLUMN IF NOT EXISTS "gmail_history_id" TEXT;
