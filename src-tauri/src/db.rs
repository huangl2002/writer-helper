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

    Ok(DbPool {
        conn: Mutex::new(conn),
    })
}
