use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Outline {
    pub id: String,
    pub work_id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub content: String,
    pub node_type: String,
    pub sort_order: i32,
    pub linked_chapter_id: Option<String>,
    pub is_complete: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command]
pub fn create_outline(
    pool: State<'_, DbPool>,
    work_id: String,
    parent_id: Option<String>,
    title: String,
    node_type: String,
) -> Result<Outline, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let max_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM outlines WHERE work_id = ?1",
            rusqlite::params![work_id],
            |row| row.get(0),
        )
        .unwrap_or(-1);

    conn.execute(
        "INSERT INTO outlines (id, work_id, parent_id, title, node_type, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![id, work_id, parent_id, title, node_type, max_order + 1, now, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Outline {
        id,
        work_id,
        parent_id,
        title,
        content: String::new(),
        node_type,
        sort_order: max_order + 1,
        linked_chapter_id: None,
        is_complete: false,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn list_outlines(
    pool: State<'_, DbPool>,
    work_id: String,
) -> Result<Vec<Outline>, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, work_id, parent_id, title, content, node_type, sort_order, linked_chapter_id, is_complete, created_at, updated_at FROM outlines WHERE work_id = ?1 ORDER BY sort_order")
        .map_err(|e| e.to_string())?;

    let outlines = stmt
        .query_map(rusqlite::params![work_id], |row| {
            Ok(Outline {
                id: row.get(0)?,
                work_id: row.get(1)?,
                parent_id: row.get(2)?,
                title: row.get(3)?,
                content: row.get(4)?,
                node_type: row.get(5)?,
                sort_order: row.get(6)?,
                linked_chapter_id: row.get(7)?,
                is_complete: row.get::<_, i32>(8)? != 0,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(outlines)
}

#[tauri::command]
pub fn update_outline(
    pool: State<'_, DbPool>,
    id: String,
    title: String,
    content: String,
    node_type: String,
    linked_chapter_id: Option<String>,
    is_complete: bool,
) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE outlines SET title=?1, content=?2, node_type=?3, linked_chapter_id=?4, is_complete=?5, updated_at=?6 WHERE id=?7",
        rusqlite::params![title, content, node_type, linked_chapter_id, is_complete as i32, now, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn move_outline(
    pool: State<'_, DbPool>,
    id: String,
    parent_id: Option<String>,
) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE outlines SET parent_id=?1, updated_at=?2 WHERE id=?3",
        rusqlite::params![parent_id, now, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_outline(
    pool: State<'_, DbPool>,
    id: String,
) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    // Move children up to grandparent
    conn.execute(
        "UPDATE outlines SET parent_id = (SELECT parent_id FROM outlines WHERE id = ?1) WHERE parent_id = ?1",
        rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM outlines WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn reorder_outlines(
    pool: State<'_, DbPool>,
    ids: Vec<String>,
) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    for (i, id) in ids.iter().enumerate() {
        conn.execute(
            "UPDATE outlines SET sort_order = ?1 WHERE id = ?2",
            rusqlite::params![i as i32, id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}
