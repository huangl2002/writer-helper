use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Volume {
    pub id: String,
    pub work_id: String,
    pub title: String,
    pub sort_order: i32,
    pub created_at: String,
}

#[tauri::command]
pub fn create_volume(pool: State<'_, DbPool>, work_id: String, title: String) -> Result<Volume, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let max_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM volumes WHERE work_id = ?1",
            rusqlite::params![work_id],
            |row| row.get(0),
        )
        .unwrap_or(-1);

    conn.execute(
        "INSERT INTO volumes (id, work_id, title, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, work_id, title, max_order + 1, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Volume { id, work_id, title, sort_order: max_order + 1, created_at: now })
}

#[tauri::command]
pub fn list_volumes(pool: State<'_, DbPool>, work_id: String) -> Result<Vec<Volume>, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, work_id, title, sort_order, created_at FROM volumes WHERE work_id = ?1 ORDER BY sort_order")
        .map_err(|e| e.to_string())?;

    let volumes = stmt
        .query_map(rusqlite::params![work_id], |row| {
            Ok(Volume {
                id: row.get(0)?,
                work_id: row.get(1)?,
                title: row.get(2)?,
                sort_order: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(volumes)
}

#[tauri::command]
pub fn update_volume(pool: State<'_, DbPool>, id: String, title: String) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE volumes SET title = ?1 WHERE id = ?2", rusqlite::params![title, id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_volume(pool: State<'_, DbPool>, id: String) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE chapters SET volume_id = NULL WHERE volume_id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM volumes WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn reorder_volumes(pool: State<'_, DbPool>, ids: Vec<String>) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    for (i, id) in ids.iter().enumerate() {
        conn.execute(
            "UPDATE volumes SET sort_order = ?1 WHERE id = ?2",
            rusqlite::params![i as i32, id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}
