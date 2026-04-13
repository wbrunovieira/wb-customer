-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('scheduled', 'ended', 'cancelled');

-- CreateTable
CREATE TABLE "meeting_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "meeting_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "meeting_type_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3),
    "actual_start_at" TIMESTAMP(3),
    "actual_end_at" TIMESTAMP(3),
    "google_event_id" TEXT,
    "meet_link" TEXT,
    "attendees" JSONB NOT NULL DEFAULT '[]',
    "status" "MeetingStatus" NOT NULL DEFAULT 'scheduled',
    "scheduled_by_user_id" TEXT NOT NULL,
    "recording_drive_id" TEXT,
    "recording_url" TEXT,
    "recording_moved_at" TIMESTAMP(3),
    "transcription_job_id" TEXT,
    "transcript_text" TEXT,
    "transcribed_at" TIMESTAMP(3),
    "native_transcript_url" TEXT,
    "meeting_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_tokens" (
    "id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meeting_types_name_key" ON "meeting_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "meetings_google_event_id_key" ON "meetings"("google_event_id");

-- CreateIndex
CREATE INDEX "meetings_customer_id_idx" ON "meetings"("customer_id");

-- CreateIndex
CREATE INDEX "meetings_status_idx" ON "meetings"("status");

-- CreateIndex
CREATE INDEX "meetings_start_at_idx" ON "meetings"("start_at");

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_meeting_type_id_fkey" FOREIGN KEY ("meeting_type_id") REFERENCES "meeting_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
