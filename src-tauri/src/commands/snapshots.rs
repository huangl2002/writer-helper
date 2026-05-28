use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChapterSnapshot {
    pub id: String,
    pub chapter_id: String,
    pub content_json: String,
    pub word_count: i32,
    pub snapshot_type: String,
    pub saved_at: String,
}

#[tauri::command]
pub fn create_snapshot(
    pool: State<'_, DbPool>,
    chapter_id: String,
    snapshot_type: String,
) -> Result<ChapterSnapshot, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;

    // Get current chapter content
    let (content_json, word_count): (String, i32) = conn
        .query_row(
            "SELECT content_json, word_count FROM chapters WHERE id = ?1",
            rusqlite::params![chapter_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO chapter_snapshots (id, chapter_id, content_json, word_count, snapshot_type, saved_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, chapter_id, content_json, word_count, snapshot_type, now],
    )
    .map_err(|e| e.to_string())?;

    // Limit to 50 snapshots per chapter
    conn.execute(
        "DELETE FROM chapter_snapshots WHERE chapter_id = ?1 AND id NOT IN (SELECT id FROM chapter_snapshots WHERE chapter_id = ?1 ORDER BY saved_at DESC LIMIT 50)",
        rusqlite::params![chapter_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(ChapterSnapshot {
        id,
        chapter_id,
        content_json,
        word_count,
        snapshot_type,
        saved_at: now,
    })
}

#[tauri::command]
pub fn list_snapshots(
    pool: State<'_, DbPool>,
    chapter_id: String,
) -> Result<Vec<ChapterSnapshot>, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, chapter_id, content_json, word_count, snapshot_type, saved_at FROM chapter_snapshots WHERE chapter_id = ?1 ORDER BY saved_at DESC")
        .map_err(|e| e.to_string())?;

    let snapshots = stmt
        .query_map(rusqlite::params![chapter_id], |row| {
            Ok(ChapterSnapshot {
                id: row.get(0)?,
                chapter_id: row.get(1)?,
                content_json: row.get(2)?,
                word_count: row.get(3)?,
                snapshot_type: row.get(4)?,
                saved_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(snapshots)
}

#[tauri::command]
pub fn restore_snapshot(
    pool: State<'_, DbPool>,
    snapshot_id: String,
) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;

    let (chapter_id, content_json, word_count): (String, String, i32) = conn
        .query_row(
            "SELECT chapter_id, content_json, word_count FROM chapter_snapshots WHERE id = ?1",
            rusqlite::params![snapshot_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE chapters SET content_json = ?1, word_count = ?2, updated_at = ?3 WHERE id = ?4",
        rusqlite::params![content_json, word_count, now, chapter_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_snapshot(
    pool: State<'_, DbPool>,
    id: String,
) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM chapter_snapshots WHERE id = ?1",
        rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// Auto-snapshot: called from update_chapter after every 25 saves
#[tauri::command]
pub fn auto_snapshot_if_needed(
    pool: State<'_, DbPool>,
    chapter_id: String,
) -> Result<bool, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;

    // Get current chapter data
    let (content_json, word_count): (String, i32) = conn
        .query_row(
            "SELECT content_json, word_count FROM chapters WHERE id = ?1",
            rusqlite::params![chapter_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;

    let total_saves_key = format!("save_count_{}", chapter_id);
    let current_count: i32 = conn
        .query_row(
            "SELECT COALESCE(CAST(value AS INTEGER), 0) FROM settings WHERE key = ?1",
            rusqlite::params![total_saves_key],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let new_count = current_count + 1;

    // Save or update the counter
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        rusqlite::params![total_saves_key, new_count.to_string()],
    )
    .map_err(|e| e.to_string())?;

    // Create auto-snapshot every 25 saves
    if new_count % 25 == 0 {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO chapter_snapshots (id, chapter_id, content_json, word_count, snapshot_type, saved_at) VALUES (?1, ?2, ?3, ?4, 'auto', ?5)",
            rusqlite::params![id, chapter_id, content_json, word_count, now],
        )
        .map_err(|e| e.to_string())?;

        Ok(true)
    } else {
        Ok(false)
    }
}
