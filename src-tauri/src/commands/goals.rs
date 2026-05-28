use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Goal {
    pub id: String,
    pub work_id: String,
    pub goal_type: String,
    pub target_value: i32,
    pub deadline: String,
    pub is_active: bool,
    pub created_at: String,
}

#[tauri::command]
pub fn create_goal(
    pool: State<'_, DbPool>,
    work_id: String,
    goal_type: String,
    target_value: i32,
) -> Result<Goal, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    // Deactivate existing active goals of same type
    conn.execute(
        "UPDATE goals SET is_active = 0 WHERE work_id = ?1 AND goal_type = ?2",
        rusqlite::params![work_id, goal_type],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO goals (id, work_id, goal_type, target_value, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, work_id, goal_type, target_value, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Goal {
        id,
        work_id,
        goal_type,
        target_value,
        deadline: String::new(),
        is_active: true,
        created_at: now,
    })
}

#[tauri::command]
pub fn get_active_goal(
    pool: State<'_, DbPool>,
    work_id: String,
    goal_type: String,
) -> Result<Option<Goal>, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let result = conn.query_row(
        "SELECT id, work_id, goal_type, target_value, deadline, is_active, created_at FROM goals WHERE work_id = ?1 AND goal_type = ?2 AND is_active = 1 ORDER BY created_at DESC LIMIT 1",
        rusqlite::params![work_id, goal_type],
        |row| {
            Ok(Goal {
                id: row.get(0)?,
                work_id: row.get(1)?,
                goal_type: row.get(2)?,
                target_value: row.get(3)?,
                deadline: row.get(4)?,
                is_active: row.get::<_, i32>(5)? != 0,
                created_at: row.get(6)?,
            })
        },
    );

    match result {
        Ok(goal) => Ok(Some(goal)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn update_goal(
    pool: State<'_, DbPool>,
    id: String,
    target_value: i32,
    is_active: bool,
) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE goals SET target_value = ?1, is_active = ?2 WHERE id = ?3",
        rusqlite::params![target_value, is_active as i32, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_goal(
    pool: State<'_, DbPool>,
    id: String,
) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM goals WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
