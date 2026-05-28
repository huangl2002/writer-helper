use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Character {
    pub id: String,
    pub work_id: String,
    pub name: String,
    pub aliases: String,
    pub gender: String,
    pub appearance: String,
    pub personality: String,
    pub background: String,
    pub custom_attrs: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CharacterRelation {
    pub id: String,
    pub work_id: String,
    pub char_a_id: String,
    pub char_b_id: String,
    pub relation_type: String,
    pub description: String,
    pub created_at: String,
}

// ── Character CRUD ──

#[tauri::command]
pub fn create_character(
    pool: State<'_, DbPool>,
    work_id: String,
    name: String,
) -> Result<Character, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO characters (id, work_id, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, work_id, name, now, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Character {
        id,
        work_id,
        name,
        aliases: "[]".into(),
        gender: String::new(),
        appearance: String::new(),
        personality: String::new(),
        background: String::new(),
        custom_attrs: "{}".into(),
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn list_characters(
    pool: State<'_, DbPool>,
    work_id: String,
) -> Result<Vec<Character>, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, work_id, name, aliases, gender, appearance, personality, background, custom_attrs, created_at, updated_at FROM characters WHERE work_id = ?1 ORDER BY name")
        .map_err(|e| e.to_string())?;

    let chars = stmt
        .query_map(rusqlite::params![work_id], |row| {
            Ok(Character {
                id: row.get(0)?,
                work_id: row.get(1)?,
                name: row.get(2)?,
                aliases: row.get(3)?,
                gender: row.get(4)?,
                appearance: row.get(5)?,
                personality: row.get(6)?,
                background: row.get(7)?,
                custom_attrs: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(chars)
}

#[tauri::command]
pub fn get_character(
    pool: State<'_, DbPool>,
    id: String,
) -> Result<Character, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT id, work_id, name, aliases, gender, appearance, personality, background, custom_attrs, created_at, updated_at FROM characters WHERE id = ?1",
        rusqlite::params![id],
        |row| {
            Ok(Character {
                id: row.get(0)?,
                work_id: row.get(1)?,
                name: row.get(2)?,
                aliases: row.get(3)?,
                gender: row.get(4)?,
                appearance: row.get(5)?,
                personality: row.get(6)?,
                background: row.get(7)?,
                custom_attrs: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_character(
    pool: State<'_, DbPool>,
    id: String,
    name: String,
    aliases: String,
    gender: String,
    appearance: String,
    personality: String,
    background: String,
    custom_attrs: String,
) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE characters SET name=?1, aliases=?2, gender=?3, appearance=?4, personality=?5, background=?6, custom_attrs=?7, updated_at=?8 WHERE id=?9",
        rusqlite::params![name, aliases, gender, appearance, personality, background, custom_attrs, now, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_character(
    pool: State<'_, DbPool>,
    id: String,
) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM characters WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Character Relations ──

#[tauri::command]
pub fn create_relation(
    pool: State<'_, DbPool>,
    work_id: String,
    char_a_id: String,
    char_b_id: String,
    relation_type: String,
    description: String,
) -> Result<CharacterRelation, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO character_relations (id, work_id, char_a_id, char_b_id, relation_type, description, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![id, work_id, char_a_id, char_b_id, relation_type, description, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(CharacterRelation {
        id,
        work_id,
        char_a_id,
        char_b_id,
        relation_type,
        description,
        created_at: now,
    })
}

#[tauri::command]
pub fn list_relations(
    pool: State<'_, DbPool>,
    work_id: String,
) -> Result<Vec<CharacterRelation>, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, work_id, char_a_id, char_b_id, relation_type, description, created_at FROM character_relations WHERE work_id = ?1")
        .map_err(|e| e.to_string())?;

    let rels = stmt
        .query_map(rusqlite::params![work_id], |row| {
            Ok(CharacterRelation {
                id: row.get(0)?,
                work_id: row.get(1)?,
                char_a_id: row.get(2)?,
                char_b_id: row.get(3)?,
                relation_type: row.get(4)?,
                description: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(rels)
}

#[tauri::command]
pub fn delete_relation(
    pool: State<'_, DbPool>,
    id: String,
) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM character_relations WHERE id = ?1",
        rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
