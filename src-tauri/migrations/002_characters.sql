CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    aliases TEXT DEFAULT '[]',
    gender TEXT DEFAULT '',
    appearance TEXT DEFAULT '',
    personality TEXT DEFAULT '',
    background TEXT DEFAULT '',
    custom_attrs TEXT DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS character_relations (
    id TEXT PRIMARY KEY,
    work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    char_a_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    char_b_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    relation_type TEXT DEFAULT '',
    description TEXT DEFAULT '',
    created_at TEXT NOT NULL
);
