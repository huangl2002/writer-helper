use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Work {
    pub id: String,
    pub title: String,
    pub pen_name: String,
    pub genre_tags: String,
    pub description: String,
    pub created_at: String,
    pub updated_at: String,
    pub sync_status: String,
    pub owner_id: String,
}

#[tauri::command]
pub fn create_work(pool: State<'_, DbPool>, title: String) -> Result<Work, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO works (id, title, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![id, title, now, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Work {
        id,
        title,
        pen_name: String::new(),
        genre_tags: "[]".into(),
        description: String::new(),
        created_at: now.clone(),
        updated_at: now,
        sync_status: "local".into(),
        owner_id: String::new(),
    })
}

#[tauri::command]
pub fn list_works(pool: State<'_, DbPool>) -> Result<Vec<Work>, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, title, pen_name, genre_tags, description, created_at, updated_at, sync_status, owner_id FROM works ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let works = stmt
        .query_map([], |row| {
            Ok(Work {
                id: row.get(0)?,
                title: row.get(1)?,
                pen_name: row.get(2)?,
                genre_tags: row.get(3)?,
                description: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                sync_status: row.get(7)?,
                owner_id: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(works)
}

#[tauri::command]
pub fn update_work(pool: State<'_, DbPool>, id: String, title: String) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE works SET title = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![title, now, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_work(pool: State<'_, DbPool>, id: String) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM works WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
