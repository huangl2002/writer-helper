CREATE TABLE IF NOT EXISTS chapter_snapshots (
    id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    content_json TEXT NOT NULL,
    word_count INTEGER DEFAULT 0,
    snapshot_type TEXT DEFAULT 'manual',
    saved_at TEXT NOT NULL
);
