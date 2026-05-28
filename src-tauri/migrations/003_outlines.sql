CREATE TABLE IF NOT EXISTS outlines (
    id TEXT PRIMARY KEY,
    work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES outlines(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    node_type TEXT DEFAULT 'plot',
    sort_order INTEGER NOT NULL DEFAULT 0,
    linked_chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
    is_complete INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
