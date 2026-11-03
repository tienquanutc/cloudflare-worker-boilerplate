-- Job gửi vào Queue; consumer cập nhật trạng thái khi xử lý xong.
CREATE TABLE jobs (
  id         TEXT    PRIMARY KEY,
  kind       TEXT    NOT NULL,
  payload    TEXT    NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'queued', -- queued | done | failed
  attempts   INTEGER NOT NULL DEFAULT 0,
  result     TEXT,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX jobs_created_at ON jobs (created_at);
