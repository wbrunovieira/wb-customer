-- Add GoTo Connect fields to activities
ALTER TABLE "activities"
  ADD COLUMN IF NOT EXISTS "goto_call_id"             TEXT,
  ADD COLUMN IF NOT EXISTS "goto_call_outcome"        TEXT,
  ADD COLUMN IF NOT EXISTS "goto_duration"            INTEGER,
  ADD COLUMN IF NOT EXISTS "goto_recording_drive_id"  TEXT,
  ADD COLUMN IF NOT EXISTS "goto_recording_url"       TEXT,
  ADD COLUMN IF NOT EXISTS "goto_recording_url2"      TEXT,
  ADD COLUMN IF NOT EXISTS "goto_transcription_job_id" TEXT,
  ADD COLUMN IF NOT EXISTS "goto_transcript_text"     TEXT,
  ADD COLUMN IF NOT EXISTS "call_contact_type"        TEXT;

-- Add unique constraints separately (IF NOT EXISTS not supported for constraints in all PG versions)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activities_goto_call_id_key'
  ) THEN
    ALTER TABLE "activities" ADD CONSTRAINT "activities_goto_call_id_key" UNIQUE ("goto_call_id");
  END IF;
END $$;

-- Add Gmail/Email fields to activities
ALTER TABLE "activities"
  ADD COLUMN IF NOT EXISTS "email_message_id"   TEXT,
  ADD COLUMN IF NOT EXISTS "email_thread_id"    TEXT,
  ADD COLUMN IF NOT EXISTS "email_subject"      TEXT,
  ADD COLUMN IF NOT EXISTS "email_from_address" TEXT,
  ADD COLUMN IF NOT EXISTS "email_from_name"    TEXT,
  ADD COLUMN IF NOT EXISTS "email_replied"      BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activities_email_message_id_key'
  ) THEN
    ALTER TABLE "activities" ADD CONSTRAINT "activities_email_message_id_key" UNIQUE ("email_message_id");
  END IF;
END $$;

-- Create goto_tokens table
CREATE TABLE IF NOT EXISTS "goto_tokens" (
  "id"            TEXT NOT NULL DEFAULT 'singleton',
  "access_token"  TEXT NOT NULL,
  "refresh_token" TEXT NOT NULL,
  "expires_at"    TIMESTAMP(3) NOT NULL,
  "updated_at"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "goto_tokens_pkey" PRIMARY KEY ("id")
);

-- Create whatsapp_messages table
CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
  "id"                        TEXT NOT NULL,
  "activity_id"               TEXT NOT NULL,
  "message_id"                TEXT NOT NULL,
  "remote_jid"                TEXT NOT NULL,
  "from_me"                   BOOLEAN NOT NULL,
  "sender_name"               TEXT,
  "text"                      TEXT,
  "message_type"              TEXT NOT NULL,
  "media_label"               TEXT,
  "media_drive_id"            TEXT,
  "media_url"                 TEXT,
  "media_transcription_job_id" TEXT,
  "media_transcript_text"     TEXT,
  "timestamp"                 TIMESTAMP(3) NOT NULL,
  CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_messages_message_id_key'
  ) THEN
    ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_message_id_key" UNIQUE ("message_id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_messages_activity_id_fkey'
  ) THEN
    ALTER TABLE "whatsapp_messages"
      ADD CONSTRAINT "whatsapp_messages_activity_id_fkey"
      FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "whatsapp_messages_activity_id_idx" ON "whatsapp_messages"("activity_id");
CREATE INDEX IF NOT EXISTS "whatsapp_messages_remote_jid_idx"  ON "whatsapp_messages"("remote_jid");
