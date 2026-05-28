CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    goal_type TEXT NOT NULL DEFAULT 'daily_words',
    target_value INTEGER NOT NULL DEFAULT 2000,
    deadline TEXT DEFAULT '',
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
);
