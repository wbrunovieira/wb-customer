CREATE TABLE time_entries (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task_id       TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stopped_at    TIMESTAMPTZ,
  duration_secs INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_time_entries_task_id ON time_entries(task_id);
