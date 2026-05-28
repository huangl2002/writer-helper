use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Note {
    pub id: String,
    pub work_id: Option<String>,
    pub title: String,
    pub content: String,
    pub tags: String,
    pub color: String,
    pub is_pinned: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command]
pub fn create_note(
    pool: State<'_, DbPool>,
    work_id: Option<String>,
    title: String,
) -> Result<Note, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO notes (id, work_id, title, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, work_id, title, now, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Note {
        id,
        work_id,
        title,
        content: String::new(),
        tags: "[]".into(),
        color: "#ffd54f".into(),
        is_pinned: false,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn list_notes(
    pool: State<'_, DbPool>,
    work_id: Option<String>,
) -> Result<Vec<Note>, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;

    let make_query = |filter_work_id: Option<&str>| -> Result<Vec<Note>, String> {
        let sql = if filter_work_id.is_some() {
            "SELECT id, work_id, title, content, tags, color, is_pinned, created_at, updated_at FROM notes WHERE work_id = ?1 ORDER BY is_pinned DESC, updated_at DESC"
        } else {
            "SELECT id, work_id, title, content, tags, color, is_pinned, created_at, updated_at FROM notes ORDER BY is_pinned DESC, updated_at DESC"
        };
        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
        let rows = if let Some(wid) = filter_work_id {
            stmt.query_map(rusqlite::params![wid], map_note)
        } else {
            stmt.query_map([], map_note)
        }
        .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    };

    make_query(work_id.as_deref())
}

fn map_note(row: &rusqlite::Row) -> rusqlite::Result<Note> {
    Ok(Note {
        id: row.get(0)?,
        work_id: row.get(1)?,
        title: row.get(2)?,
        content: row.get(3)?,
        tags: row.get(4)?,
        color: row.get(5)?,
        is_pinned: row.get::<_, i32>(6)? != 0,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

#[tauri::command]
pub fn update_note(
    pool: State<'_, DbPool>,
    id: String,
    title: String,
    content: String,
    tags: String,
    color: String,
    is_pinned: bool,
) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE notes SET title=?1, content=?2, tags=?3, color=?4, is_pinned=?5, updated_at=?6 WHERE id=?7",
        rusqlite::params![title, content, tags, color, is_pinned as i32, now, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_note(
    pool: State<'_, DbPool>,
    id: String,
) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM notes WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn search_notes(
    pool: State<'_, DbPool>,
    query: String,
) -> Result<Vec<Note>, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let pattern = format!("%{}%", query);
    let mut stmt = conn
        .prepare("SELECT id, work_id, title, content, tags, color, is_pinned, created_at, updated_at FROM notes WHERE title LIKE ?1 OR content LIKE ?1 ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let notes = stmt
        .query_map(rusqlite::params![pattern], map_note)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(notes)
}
