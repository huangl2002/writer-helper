use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Chapter {
    pub id: String,
    pub volume_id: Option<String>,
    pub work_id: String,
    pub title: String,
    pub content_json: String,
    pub word_count: i32,
    pub status: String,
    pub sort_order: i32,
    pub source: String,
    pub version: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command]
pub fn create_chapter(
    pool: State<'_, DbPool>,
    work_id: String,
    volume_id: Option<String>,
    title: String,
) -> Result<Chapter, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let max_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM chapters WHERE work_id = ?1",
            rusqlite::params![work_id],
            |row| row.get(0),
        )
        .unwrap_or(-1);

    let default_content = r#"{"type":"doc","content":[{"type":"paragraph"}]}"#;

    conn.execute(
        "INSERT INTO chapters (id, volume_id, work_id, title, content_json, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![id, volume_id, work_id, title, default_content, max_order + 1, now, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Chapter {
        id,
        volume_id,
        work_id,
        title,
        content_json: default_content.into(),
        word_count: 0,
        status: "draft".into(),
        sort_order: max_order + 1,
        source: "manual".into(),
        version: 1,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn get_chapter(pool: State<'_, DbPool>, id: String) -> Result<Chapter, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT id, volume_id, work_id, title, content_json, word_count, status, sort_order, source, version, created_at, updated_at FROM chapters WHERE id = ?1",
        rusqlite::params![id],
        |row| {
            Ok(Chapter {
                id: row.get(0)?,
                volume_id: row.get(1)?,
                work_id: row.get(2)?,
                title: row.get(3)?,
                content_json: row.get(4)?,
                word_count: row.get(5)?,
                status: row.get(6)?,
                sort_order: row.get(7)?,
                source: row.get(8)?,
                version: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_chapter(
    pool: State<'_, DbPool>,
    id: String,
    title: String,
    content_json: String,
    word_count: i32,
) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE chapters SET title = ?1, content_json = ?2, word_count = ?3, updated_at = ?4 WHERE id = ?5",
        rusqlite::params![title, content_json, word_count, now, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_chapter(pool: State<'_, DbPool>, id: String) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM chapters WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn list_chapters(
    pool: State<'_, DbPool>,
    work_id: String,
    volume_id: Option<String>,
) -> Result<Vec<Chapter>, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;

    let chapters = if let Some(vid) = volume_id {
        let mut stmt = conn
            .prepare("SELECT id, volume_id, work_id, title, content_json, word_count, status, sort_order, source, version, created_at, updated_at FROM chapters WHERE work_id = ?1 AND volume_id = ?2 ORDER BY sort_order")
            .map_err(|e| e.to_string())?;
        stmt.query_map(rusqlite::params![work_id, vid], |row| {
            Ok(Chapter {
                id: row.get(0)?,
                volume_id: row.get(1)?,
                work_id: row.get(2)?,
                title: row.get(3)?,
                content_json: row.get(4)?,
                word_count: row.get(5)?,
                status: row.get(6)?,
                sort_order: row.get(7)?,
                source: row.get(8)?,
                version: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?
    } else {
        let mut stmt = conn
            .prepare("SELECT id, volume_id, work_id, title, content_json, word_count, status, sort_order, source, version, created_at, updated_at FROM chapters WHERE work_id = ?1 ORDER BY sort_order")
            .map_err(|e| e.to_string())?;
        stmt.query_map(rusqlite::params![work_id], |row| {
            Ok(Chapter {
                id: row.get(0)?,
                volume_id: row.get(1)?,
                work_id: row.get(2)?,
                title: row.get(3)?,
                content_json: row.get(4)?,
                word_count: row.get(5)?,
                status: row.get(6)?,
                sort_order: row.get(7)?,
                source: row.get(8)?,
                version: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?
    };

    Ok(chapters)
}

#[tauri::command]
pub fn reorder_chapters(pool: State<'_, DbPool>, ids: Vec<String>) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    for (i, id) in ids.iter().enumerate() {
        conn.execute(
            "UPDATE chapters SET sort_order = ?1 WHERE id = ?2",
            rusqlite::params![i as i32, id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}
