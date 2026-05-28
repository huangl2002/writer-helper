CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    work_id TEXT REFERENCES works(id) ON DELETE CASCADE,
    title TEXT DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    tags TEXT DEFAULT '[]',
    color TEXT DEFAULT '#ffd54f',
    is_pinned INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
