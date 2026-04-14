CREATE TABLE activities (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id       TEXT NOT NULL REFERENCES customers(id),
  contact_id        TEXT REFERENCES contacts(id),
  type              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'open',
  subject           TEXT,
  description       TEXT,
  scheduled_at      TIMESTAMPTZ,
  occurred_at       TIMESTAMPTZ,
  duration_secs     INT,
  audio_url         TEXT,
  transcript_text   TEXT,
  external_id       TEXT,
  direction         TEXT,
  created_by_user_id TEXT NOT NULL,
  assigned_to_user_id TEXT,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_activities_customer_id ON activities(customer_id);
CREATE INDEX idx_activities_external_id ON activities(external_id);

CREATE TABLE activity_attachments (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  size_bytes  BIGINT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
