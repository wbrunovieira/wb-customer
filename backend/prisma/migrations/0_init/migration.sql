-- Baseline gerado em 2026-09-07 a partir de prisma/schema.prisma.
-- Substitui 15 migrations cujo histórico não era mais reproduzível:
--   * 20260415210000_add_text_in_creative recriava a coluna text_in_creative que
--     20260415200000_add_creatives já criava, quebrando em banco limpo;
--   * as 6 tabelas de tráfego pago nunca tiveram migration (foram aplicadas com
--     db push), então migrate deploy jamais as criaria.
-- As migrations antigas seguem no histórico do git.
-- Verificado: aplicado em banco vazio, migrate diff contra o schema volta vazio.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'manager', 'employee', 'customer');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "CustomerActivityType" AS ENUM ('created', 'updated', 'assigned', 'contact_added', 'document_uploaded', 'meeting_scheduled', 'meeting_completed', 'note_added', 'email_received');

-- CreateEnum
CREATE TYPE "CustomerUserRole" AS ENUM ('master', 'member');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('proposal', 'contract', 'addendum', 'other');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('pending_signature', 'signed', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('scheduled', 'ended', 'cancelled');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('idea_could', 'idea_should', 'backlog', 'todo', 'in_progress', 'review', 'done', 'cancelled');

-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('none', 'daily', 'weekly', 'monthly', 'custom');

-- CreateEnum
CREATE TYPE "CreativeType" AS ENUM ('image', 'video', 'carousel');

-- CreateEnum
CREATE TYPE "CreativeStatus" AS ENUM ('draft', 'active', 'paused', 'archived');

-- CreateEnum
CREATE TYPE "CampaignObjective" AS ENUM ('awareness', 'traffic', 'engagement', 'leads', 'sales', 'retargeting');

-- CreateEnum
CREATE TYPE "CreativeStage" AS ENUM ('exploration', 'refinement', 'scale');

-- CreateEnum
CREATE TYPE "StrategyPhase" AS ENUM ('exploration', 'refinement');

-- CreateEnum
CREATE TYPE "StrategyStatus" AS ENUM ('active', 'completed', 'paused');

-- CreateEnum
CREATE TYPE "AdCampaignObjective" AS ENUM ('CONVERSIONS', 'LINK_CLICKS', 'REACH', 'BRAND_AWARENESS', 'LEAD_GENERATION', 'VIDEO_VIEWS', 'POST_ENGAGEMENT');

-- CreateEnum
CREATE TYPE "AdPublishStatus" AS ENUM ('draft', 'ready_to_publish', 'publishing', 'published', 'publish_failed');

-- CreateEnum
CREATE TYPE "AdCampaignStatus" AS ENUM ('active', 'paused', 'archived');

-- CreateEnum
CREATE TYPE "AdCallToAction" AS ENUM ('LEARN_MORE', 'SHOP_NOW', 'SIGN_UP', 'CONTACT_US', 'BOOK_NOW', 'DOWNLOAD', 'GET_QUOTE', 'SUBSCRIBE', 'WATCH_MORE', 'NO_BUTTON');

-- CreateTable
CREATE TABLE "user_identities" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_authorizations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customer_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "document" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'active',
    "category_id" TEXT,
    "drive_folder_id" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_employees" (
    "customer_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT NOT NULL,

    CONSTRAINT "customer_employees_pkey" PRIMARY KEY ("customer_id","user_id")
);

-- CreateTable
CREATE TABLE "customer_activities" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "CustomerActivityType" NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_activities_pkey" PRIMARY KEY ("id")
);

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
    "gmail_history_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sprints" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "sprint_id" TEXT,
    "parent_task_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'backlog',
    "owner_user_id" TEXT NOT NULL,
    "assignee_user_id" TEXT,
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "estimated_hours" DOUBLE PRECISION,
    "tracked_seconds" INTEGER NOT NULL DEFAULT 0,
    "impact" INTEGER,
    "confidence" INTEGER,
    "effort" INTEGER,
    "recurrence_type" "RecurrenceType" NOT NULL DEFAULT 'none',
    "recurrence_rule" JSONB,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "board_position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "is_done" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_tags" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_tag_links" (
    "task_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "task_tag_links_pkey" PRIMARY KEY ("task_id","tag_id")
);

-- CreateTable
CREATE TABLE "task_activity_logs" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "from_value" TEXT,
    "to_value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tasks" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_entries" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stopped_at" TIMESTAMP(3),
    "duration_secs" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_comments" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "author_user_id" TEXT NOT NULL,
    "body" TEXT,
    "audio_url" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_attachments" (
    "id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_annotations" (
    "id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "number" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_annotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_reactions" (
    "comment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_reactions_pkey" PRIMARY KEY ("comment_id","user_id","emoji")
);

-- CreateTable
CREATE TABLE "creatives" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caption" TEXT,
    "text_in_creative" TEXT,
    "design_description" TEXT,
    "type" "CreativeType" NOT NULL,
    "stage" "CreativeStage",
    "parent_creative_id" TEXT,
    "variation_aspects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "objective" "CampaignObjective",
    "status" "CreativeStatus" NOT NULL DEFAULT 'draft',
    "drive_file_id" TEXT,
    "drive_view_url" TEXT,
    "drive_download_url" TEXT,
    "thumbnail_url" TEXT,
    "mime_type" TEXT,
    "size_bytes" BIGINT,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "creatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creative_performances" (
    "id" TEXT NOT NULL,
    "creative_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "campaign_id" TEXT,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION,
    "cpc" DOUBLE PRECISION,
    "cpa" DOUBLE PRECISION,
    "roas" DOUBLE PRECISION,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creative_performances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creative_strategies" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phase" "StrategyPhase" NOT NULL,
    "status" "StrategyStatus" NOT NULL DEFAULT 'active',
    "objective" "CampaignObjective",
    "budget" DOUBLE PRECISION,
    "duration_days" INTEGER,
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "winner_id" TEXT,
    "parent_strategy_id" TEXT,
    "notes" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creative_strategies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creative_strategy_items" (
    "strategy_id" TEXT NOT NULL,
    "creative_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creative_strategy_items_pkey" PRIMARY KEY ("strategy_id","creative_id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "subject" TEXT,
    "description" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "occurred_at" TIMESTAMP(3),
    "duration_secs" INTEGER,
    "audio_url" TEXT,
    "transcript_text" TEXT,
    "external_id" TEXT,
    "direction" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "assigned_to_user_id" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "goto_call_id" TEXT,
    "goto_call_outcome" TEXT,
    "goto_duration" INTEGER,
    "goto_recording_drive_id" TEXT,
    "goto_recording_url" TEXT,
    "goto_recording_url2" TEXT,
    "goto_transcription_job_id" TEXT,
    "goto_transcript_text" TEXT,
    "call_contact_type" TEXT,
    "email_message_id" TEXT,
    "email_thread_id" TEXT,
    "email_subject" TEXT,
    "email_from_address" TEXT,
    "email_from_name" TEXT,
    "email_replied" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_attachments" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "size_bytes" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goto_tokens" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goto_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "remote_jid" TEXT NOT NULL,
    "from_me" BOOLEAN NOT NULL,
    "sender_name" TEXT,
    "text" TEXT,
    "message_type" TEXT NOT NULL,
    "media_label" TEXT,
    "media_drive_id" TEXT,
    "media_url" TEXT,
    "media_transcription_job_id" TEXT,
    "media_transcript_text" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_config" (
    "id" TEXT NOT NULL DEFAULT 'meta-config-singleton',
    "app_id" TEXT NOT NULL,
    "app_secret" TEXT NOT NULL,
    "system_user_token" TEXT NOT NULL,
    "bm_id" TEXT NOT NULL,
    "own_ad_account_id" TEXT,
    "own_ad_account_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_ad_accounts" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "ad_account_id" TEXT NOT NULL,
    "page_id" TEXT,
    "pixel_id" TEXT,
    "instagram_actor_id" TEXT,
    "account_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_ad_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" "AdCampaignObjective" NOT NULL,
    "status" "AdCampaignStatus" NOT NULL DEFAULT 'active',
    "publish_status" "AdPublishStatus" NOT NULL DEFAULT 'draft',
    "planned_budget" DOUBLE PRECISION,
    "daily_budget" DOUBLE PRECISION,
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "notes" TEXT,
    "meta_campaign_id" TEXT,
    "publish_error" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_sets" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "AdCampaignStatus" NOT NULL DEFAULT 'active',
    "publish_status" "AdPublishStatus" NOT NULL DEFAULT 'draft',
    "daily_budget" DOUBLE PRECISION,
    "total_budget" DOUBLE PRECISION,
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "targeting" JSONB,
    "optimization_goal" TEXT,
    "billing_event" TEXT,
    "meta_ad_set_id" TEXT,
    "publish_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ads" (
    "id" TEXT NOT NULL,
    "ad_set_id" TEXT NOT NULL,
    "creative_id" TEXT,
    "name" TEXT NOT NULL,
    "status" "AdCampaignStatus" NOT NULL DEFAULT 'active',
    "publish_status" "AdPublishStatus" NOT NULL DEFAULT 'draft',
    "primary_text" TEXT,
    "headline" TEXT,
    "description" TEXT,
    "call_to_action" "AdCallToAction" NOT NULL DEFAULT 'LEARN_MORE',
    "destination_url" TEXT,
    "meta_ad_id" TEXT,
    "meta_creative_id" TEXT,
    "publish_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_daily_metrics" (
    "id" TEXT NOT NULL,
    "ad_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "results" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION,
    "cpc" DOUBLE PRECISION,
    "cpm" DOUBLE PRECISION,
    "cpp" DOUBLE PRECISION,
    "roas" DOUBLE PRECISION,
    "frequency" DOUBLE PRECISION,

    CONSTRAINT "ad_daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_identities_email_key" ON "user_identities"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_authorizations_user_id_key" ON "user_authorizations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "customer_categories_name_key" ON "customer_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_document_key" ON "customers"("document");

-- CreateIndex
CREATE INDEX "customers_category_id_idx" ON "customers"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_users_user_id_key" ON "customer_users"("user_id");

-- CreateIndex
CREATE INDEX "customer_users_customer_id_idx" ON "customer_users"("customer_id");

-- CreateIndex
CREATE INDEX "contacts_customer_id_idx" ON "contacts"("customer_id");

-- CreateIndex
CREATE INDEX "customer_employees_user_id_idx" ON "customer_employees"("user_id");

-- CreateIndex
CREATE INDEX "customer_activities_customer_id_idx" ON "customer_activities"("customer_id");

-- CreateIndex
CREATE INDEX "documents_customer_id_idx" ON "documents"("customer_id");

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

-- CreateIndex
CREATE INDEX "sprints_customer_id_idx" ON "sprints"("customer_id");

-- CreateIndex
CREATE INDEX "tasks_customer_id_idx" ON "tasks"("customer_id");

-- CreateIndex
CREATE INDEX "tasks_sprint_id_idx" ON "tasks"("sprint_id");

-- CreateIndex
CREATE INDEX "tasks_assignee_user_id_idx" ON "tasks"("assignee_user_id");

-- CreateIndex
CREATE INDEX "checklist_items_task_id_idx" ON "checklist_items"("task_id");

-- CreateIndex
CREATE INDEX "task_activity_logs_task_id_idx" ON "task_activity_logs"("task_id");

-- CreateIndex
CREATE INDEX "time_entries_task_id_idx" ON "time_entries"("task_id");

-- CreateIndex
CREATE INDEX "task_comments_task_id_idx" ON "task_comments"("task_id");

-- CreateIndex
CREATE INDEX "creatives_customer_id_idx" ON "creatives"("customer_id");

-- CreateIndex
CREATE INDEX "creative_performances_creative_id_idx" ON "creative_performances"("creative_id");

-- CreateIndex
CREATE UNIQUE INDEX "creative_performances_creative_id_campaign_id_source_key" ON "creative_performances"("creative_id", "campaign_id", "source");

-- CreateIndex
CREATE INDEX "creative_strategies_customer_id_idx" ON "creative_strategies"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "activities_goto_call_id_key" ON "activities"("goto_call_id");

-- CreateIndex
CREATE UNIQUE INDEX "activities_email_message_id_key" ON "activities"("email_message_id");

-- CreateIndex
CREATE INDEX "activities_customer_id_idx" ON "activities"("customer_id");

-- CreateIndex
CREATE INDEX "activities_external_id_idx" ON "activities"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_messages_message_id_key" ON "whatsapp_messages"("message_id");

-- CreateIndex
CREATE INDEX "whatsapp_messages_activity_id_idx" ON "whatsapp_messages"("activity_id");

-- CreateIndex
CREATE INDEX "whatsapp_messages_remote_jid_idx" ON "whatsapp_messages"("remote_jid");

-- CreateIndex
CREATE UNIQUE INDEX "meta_ad_accounts_customer_id_key" ON "meta_ad_accounts"("customer_id");

-- CreateIndex
CREATE INDEX "campaigns_customer_id_idx" ON "campaigns"("customer_id");

-- CreateIndex
CREATE INDEX "ad_sets_campaign_id_idx" ON "ad_sets"("campaign_id");

-- CreateIndex
CREATE INDEX "ads_ad_set_id_idx" ON "ads"("ad_set_id");

-- CreateIndex
CREATE INDEX "ads_creative_id_idx" ON "ads"("creative_id");

-- CreateIndex
CREATE INDEX "ad_daily_metrics_ad_id_idx" ON "ad_daily_metrics"("ad_id");

-- CreateIndex
CREATE INDEX "ad_daily_metrics_campaign_id_idx" ON "ad_daily_metrics"("campaign_id");

-- CreateIndex
CREATE INDEX "ad_daily_metrics_date_idx" ON "ad_daily_metrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ad_daily_metrics_ad_id_date_key" ON "ad_daily_metrics"("ad_id", "date");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "customer_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_users" ADD CONSTRAINT "customer_users_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_employees" ADD CONSTRAINT "customer_employees_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_activities" ADD CONSTRAINT "customer_activities_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_meeting_type_id_fkey" FOREIGN KEY ("meeting_type_id") REFERENCES "meeting_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_sprint_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "sprints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_tag_links" ADD CONSTRAINT "task_tag_links_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_tag_links" ADD CONSTRAINT "task_tag_links_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "task_tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_activity_logs" ADD CONSTRAINT "task_activity_logs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "task_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_attachments" ADD CONSTRAINT "comment_attachments_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "task_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_annotations" ADD CONSTRAINT "image_annotations_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "task_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "task_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creatives" ADD CONSTRAINT "creatives_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creatives" ADD CONSTRAINT "creatives_parent_creative_id_fkey" FOREIGN KEY ("parent_creative_id") REFERENCES "creatives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_performances" ADD CONSTRAINT "creative_performances_creative_id_fkey" FOREIGN KEY ("creative_id") REFERENCES "creatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_strategies" ADD CONSTRAINT "creative_strategies_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_strategies" ADD CONSTRAINT "creative_strategies_parent_strategy_id_fkey" FOREIGN KEY ("parent_strategy_id") REFERENCES "creative_strategies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_strategy_items" ADD CONSTRAINT "creative_strategy_items_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "creative_strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_strategy_items" ADD CONSTRAINT "creative_strategy_items_creative_id_fkey" FOREIGN KEY ("creative_id") REFERENCES "creatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_attachments" ADD CONSTRAINT "activity_attachments_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_ad_accounts" ADD CONSTRAINT "meta_ad_accounts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_sets" ADD CONSTRAINT "ad_sets_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads" ADD CONSTRAINT "ads_ad_set_id_fkey" FOREIGN KEY ("ad_set_id") REFERENCES "ad_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads" ADD CONSTRAINT "ads_creative_id_fkey" FOREIGN KEY ("creative_id") REFERENCES "creatives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_daily_metrics" ADD CONSTRAINT "ad_daily_metrics_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

