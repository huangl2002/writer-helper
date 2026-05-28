use crate::crypto;
use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AiConfig {
    pub id: String,
    pub name: String,
    pub api_url: String,
    pub api_key_encrypted: String,
    pub model_name: String,
    pub temperature: f64,
    pub max_tokens: i32,
    pub is_default: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiConfigInput {
    pub name: String,
    pub api_url: String,
    pub api_key: String,
    pub model_name: String,
    pub temperature: f64,
    pub max_tokens: i32,
}

#[tauri::command]
pub fn create_ai_config(
    pool: State<'_, DbPool>,
    input: AiConfigInput,
) -> Result<AiConfig, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let encrypted = crypto::encrypt(&input.api_key);

    // Set as default if it's the first config
    let count: i32 = conn
        .query_row("SELECT COUNT(*) FROM ai_configs", [], |row| row.get(0))
        .unwrap_or(0);
    let is_default = count == 0;

    if is_default {
        conn.execute("UPDATE ai_configs SET is_default = 0", [])
            .map_err(|e| e.to_string())?;
    }

    conn.execute(
        "INSERT INTO ai_configs (id, name, api_url, api_key_encrypted, model_name, temperature, max_tokens, is_default, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![id, input.name, input.api_url, encrypted, input.model_name, input.temperature, input.max_tokens, is_default as i32, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(AiConfig {
        id,
        name: input.name,
        api_url: input.api_url,
        api_key_encrypted: encrypted,
        model_name: input.model_name,
        temperature: input.temperature,
        max_tokens: input.max_tokens,
        is_default,
        created_at: now,
    })
}

#[tauri::command]
pub fn list_ai_configs(
    pool: State<'_, DbPool>,
) -> Result<Vec<AiConfig>, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, api_url, api_key_encrypted, model_name, temperature, max_tokens, is_default, created_at FROM ai_configs ORDER BY is_default DESC, created_at DESC")
        .map_err(|e| e.to_string())?;

    let configs = stmt
        .query_map([], |row| {
            Ok(AiConfig {
                id: row.get(0)?,
                name: row.get(1)?,
                api_url: row.get(2)?,
                api_key_encrypted: row.get(3)?,
                model_name: row.get(4)?,
                temperature: row.get(5)?,
                max_tokens: row.get(6)?,
                is_default: row.get::<_, i32>(7)? != 0,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(configs)
}

#[tauri::command]
pub fn get_default_ai_config(
    pool: State<'_, DbPool>,
) -> Result<Option<AiConfig>, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let result = conn.query_row(
        "SELECT id, name, api_url, api_key_encrypted, model_name, temperature, max_tokens, is_default, created_at FROM ai_configs WHERE is_default = 1 LIMIT 1",
        [],
        |row| {
            Ok(AiConfig {
                id: row.get(0)?,
                name: row.get(1)?,
                api_url: row.get(2)?,
                api_key_encrypted: row.get(3)?,
                model_name: row.get(4)?,
                temperature: row.get(5)?,
                max_tokens: row.get(6)?,
                is_default: true,
                created_at: row.get(7)?,
            })
        },
    );

    match result {
        Ok(cfg) => Ok(Some(cfg)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn get_ai_config_decrypted(
    pool: State<'_, DbPool>,
    id: String,
) -> Result<AiConfig, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let mut cfg = conn
        .query_row(
            "SELECT id, name, api_url, api_key_encrypted, model_name, temperature, max_tokens, is_default, created_at FROM ai_configs WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(AiConfig {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    api_url: row.get(2)?,
                    api_key_encrypted: row.get(3)?,
                    model_name: row.get(4)?,
                    temperature: row.get(5)?,
                    max_tokens: row.get(6)?,
                    is_default: row.get::<_, i32>(7)? != 0,
                    created_at: row.get(8)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    // Decrypt the key for the caller
    cfg.api_key_encrypted = crypto::decrypt(&cfg.api_key_encrypted);
    Ok(cfg)
}

#[tauri::command]
pub fn update_ai_config(
    pool: State<'_, DbPool>,
    id: String,
    input: AiConfigInput,
) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let encrypted = crypto::encrypt(&input.api_key);
    conn.execute(
        "UPDATE ai_configs SET name=?1, api_url=?2, api_key_encrypted=?3, model_name=?4, temperature=?5, max_tokens=?6 WHERE id=?7",
        rusqlite::params![input.name, input.api_url, encrypted, input.model_name, input.temperature, input.max_tokens, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn set_default_ai_config(
    pool: State<'_, DbPool>,
    id: String,
) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE ai_configs SET is_default = 0", [])
        .map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE ai_configs SET is_default = 1 WHERE id = ?1",
        rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_ai_config(
    pool: State<'_, DbPool>,
    id: String,
) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM ai_configs WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
