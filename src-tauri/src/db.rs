use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct DbPool {
    pub conn: Mutex<Connection>,
}

pub fn init_db(path: &PathBuf) -> Result<DbPool, Box<dyn std::error::Error>> {
    let conn = Connection::open(path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

    let migration = include_str!("../migrations/001_init.sql");
    conn.execute_batch(migration)?;

    let migration_002 = include_str!("../migrations/002_characters.sql");
    conn.execute_batch(migration_002)?;

    let migration_003 = include_str!("../migrations/003_outlines.sql");
    conn.execute_batch(migration_003)?;

    let migration_004 = include_str!("../migrations/004_notes.sql");
    conn.execute_batch(migration_004)?;

    let migration_005 = include_str!("../migrations/005_goals.sql");
    conn.execute_batch(migration_005)?;

    let migration_006 = include_str!("../migrations/006_snapshots.sql");
    conn.execute_batch(migration_006)?;

    let migration_007 = include_str!("../migrations/007_ai_config.sql");
    conn.execute_batch(migration_007)?;

    Ok(DbPool {
        conn: Mutex::new(conn),
    })
}
