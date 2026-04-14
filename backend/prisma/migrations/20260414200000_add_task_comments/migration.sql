CREATE TABLE task_comments (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task_id         TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  parent_id       TEXT REFERENCES task_comments(id),
  author_user_id  VARCHAR NOT NULL,
  body            TEXT,
  audio_url       TEXT,
  resolved        BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);

CREATE TABLE comment_attachments (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  comment_id TEXT NOT NULL REFERENCES task_comments(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  name       TEXT NOT NULL,
  mime_type  TEXT NOT NULL,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE image_annotations (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  comment_id TEXT NOT NULL REFERENCES task_comments(id) ON DELETE CASCADE,
  image_url  TEXT NOT NULL,
  x          FLOAT NOT NULL,
  y          FLOAT NOT NULL,
  number     INT NOT NULL,
  text       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE comment_reactions (
  comment_id TEXT NOT NULL REFERENCES task_comments(id) ON DELETE CASCADE,
  user_id    VARCHAR NOT NULL,
  emoji      VARCHAR NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id, emoji)
);
