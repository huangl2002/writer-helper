use crate::db::DbPool;
use serde_json::Value;
use std::fs;
use tauri::State;

/// Extract plain text from Tiptap JSON
fn tiptap_to_text(json: &str) -> String {
    let doc: Value = match serde_json::from_str(json) {
        Ok(v) => v,
        Err(_) => return String::new(),
    };
    let mut texts = Vec::new();
    walk_nodes(&doc, &mut texts);
    texts.join("")
}

/// Convert Tiptap JSON to Markdown
fn tiptap_to_markdown(json: &str) -> String {
    let doc: Value = match serde_json::from_str(json) {
        Ok(v) => v,
        Err(_) => return String::new(),
    };
    let mut lines = Vec::new();
    walk_md(&doc, &mut lines);
    lines.join("\n")
}

fn walk_nodes(node: &Value, texts: &mut Vec<String>) {
    if let Some(t) = node.get("text").and_then(|v| v.as_str()) {
        texts.push(t.to_string());
    }
    if let Some(content) = node.get("content").and_then(|v| v.as_array()) {
        for child in content {
            walk_nodes(child, texts);
        }
    }
}

fn walk_md(node: &Value, lines: &mut Vec<String>) {
    let node_type = node.get("type").and_then(|v| v.as_str()).unwrap_or("");

    match node_type {
        "doc" => {
            if let Some(content) = node.get("content").and_then(|v| v.as_array()) {
                for child in content {
                    walk_md(child, lines);
                }
            }
        }
        "heading" => {
            let level = node.get("attrs").and_then(|v| v.get("level")).and_then(|v| v.as_u64()).unwrap_or(1);
            let prefix = "#".repeat(level as usize);
            let mut text = String::new();
            if let Some(content) = node.get("content").and_then(|v| v.as_array()) {
                for child in content {
                    collect_inline(child, &mut text);
                }
            }
            lines.push(format!("{} {}", prefix, text));
        }
        "paragraph" => {
            let mut text = String::new();
            if let Some(content) = node.get("content").and_then(|v| v.as_array()) {
                for child in content {
                    collect_inline(child, &mut text);
                }
            }
            lines.push(text);
        }
        "horizontalRule" => {
            lines.push("---".to_string());
        }
        "bulletList" | "orderedList" => {
            if let Some(content) = node.get("content").and_then(|v| v.as_array()) {
                for (i, item) in content.iter().enumerate() {
                    let mut text = String::new();
                    if let Some(item_content) = item.get("content").and_then(|v| v.as_array()) {
                        for child in item_content {
                            collect_inline(child, &mut text);
                        }
                    }
                    if node_type == "orderedList" {
                        lines.push(format!("{}. {}", i + 1, text));
                    } else {
                        lines.push(format!("- {}", text));
                    }
                }
            }
        }
        _ => {
            // For unknown types, try to extract text from children
            if let Some(content) = node.get("content").and_then(|v| v.as_array()) {
                for child in content {
                    walk_md(child, lines);
                }
            }
        }
    }
}

fn collect_inline(node: &Value, text: &mut String) {
    let node_type = node.get("type").and_then(|v| v.as_str()).unwrap_or("");

    match node_type {
        "text" => {
            if let Some(t) = node.get("text").and_then(|v| v.as_str()) {
                let marks = node.get("marks").and_then(|v| v.as_array());
                let mut prefix = String::new();
                let mut suffix = String::new();
                if let Some(marks) = marks {
                    for mark in marks {
                        if let Some(mt) = mark.get("type").and_then(|v| v.as_str()) {
                            match mt {
                                "bold" => { prefix.push_str("**"); suffix.insert_str(0, "**"); }
                                "italic" => { prefix.push('*'); suffix.insert(0, '*'); }
                                "code" => { prefix.push('`'); suffix.insert(0, '`'); }
                                _ => {}
                            }
                        }
                    }
                }
                text.push_str(&format!("{}{}{}", prefix, t, suffix));
            }
        }
        "hardBreak" => {
            text.push('\n');
        }
        _ => {
            if let Some(content) = node.get("content").and_then(|v| v.as_array()) {
                for child in content {
                    collect_inline(child, text);
                }
            }
        }
    }
}

// ── Export commands ──

#[tauri::command]
pub fn export_chapter_txt(
    pool: State<'_, DbPool>,
    id: String,
    path: String,
) -> Result<String, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let (title, content_json): (String, String) = conn
        .query_row(
            "SELECT title, content_json FROM chapters WHERE id = ?1",
            rusqlite::params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;

    let text = tiptap_to_text(&content_json);
    let output = format!("{}\n\n{}", title, text);
    fs::write(&path, &output).map_err(|e| e.to_string())?;
    Ok(path)
}

#[tauri::command]
pub fn export_chapter_md(
    pool: State<'_, DbPool>,
    id: String,
    path: String,
) -> Result<String, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let (title, content_json): (String, String) = conn
        .query_row(
            "SELECT title, content_json FROM chapters WHERE id = ?1",
            rusqlite::params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;

    let md = tiptap_to_markdown(&content_json);
    let output = format!("# {}\n\n{}", title, md);
    fs::write(&path, &output).map_err(|e| e.to_string())?;
    Ok(path)
}

#[tauri::command]
pub fn export_work_txt(
    pool: State<'_, DbPool>,
    work_id: String,
    path: String,
) -> Result<String, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT c.title, c.content_json, v.title as vol_title
             FROM chapters c
             LEFT JOIN volumes v ON c.volume_id = v.id
             WHERE c.work_id = ?1
             ORDER BY v.sort_order, c.sort_order",
        )
        .map_err(|e| e.to_string())?;

    let chapters: Vec<(String, String, Option<String>)> = stmt
        .query_map(rusqlite::params![work_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut output = String::new();
    let mut current_vol = String::new();

    for (title, content_json, vol_title) in &chapters {
        let vol = vol_title.as_deref().unwrap_or("");
        if vol != current_vol && !vol.is_empty() {
            output.push_str(&format!("\n===== {} =====\n\n", vol));
            current_vol = vol.to_string();
        }
        let text = tiptap_to_text(content_json);
        output.push_str(&format!("{}\n\n{}\n\n", title, text));
    }

    fs::write(&path, &output).map_err(|e| e.to_string())?;
    Ok(path)
}

#[tauri::command]
pub fn export_work_md(
    pool: State<'_, DbPool>,
    work_id: String,
    path: String,
) -> Result<String, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT c.title, c.content_json, v.title as vol_title
             FROM chapters c
             LEFT JOIN volumes v ON c.volume_id = v.id
             WHERE c.work_id = ?1
             ORDER BY v.sort_order, c.sort_order",
        )
        .map_err(|e| e.to_string())?;

    let chapters: Vec<(String, String, Option<String>)> = stmt
        .query_map(rusqlite::params![work_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut output = String::new();
    let mut current_vol = String::new();

    for (title, content_json, vol_title) in &chapters {
        let vol = vol_title.as_deref().unwrap_or("");
        if vol != current_vol && !vol.is_empty() {
            output.push_str(&format!("\n## {}\n\n", vol));
            current_vol = vol.to_string();
        }
        let md = tiptap_to_markdown(content_json);
        output.push_str(&format!("# {}\n\n{}\n\n", title, md));
    }

    fs::write(&path, &output).map_err(|e| e.to_string())?;
    Ok(path)
}

#[tauri::command]
pub fn export_outlines_md(
    pool: State<'_, DbPool>,
    work_id: String,
    path: String,
) -> Result<String, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT title, content, node_type, parent_id, is_complete FROM outlines WHERE work_id = ?1 ORDER BY sort_order",
        )
        .map_err(|e| e.to_string())?;

    let outlines: Vec<(String, String, String, Option<String>, bool)> = stmt
        .query_map(rusqlite::params![work_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, i32>(4)? != 0,
            ))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut output = String::from("# 大纲\n\n");
    for (title, content, node_type, _parent_id, is_complete) in &outlines {
        let check = if *is_complete { "x" } else { " " };
        let type_label = match node_type.as_str() {
            "volume" => "卷",
            "chapter" => "章",
            "plot" => "情节",
            "scene" => "场景",
            _ => node_type.as_str(),
        };
        output.push_str(&format!("- [{}] [{}] {}", check, type_label, title));
        if !content.is_empty() {
            output.push_str(&format!(" — {}", content));
        }
        output.push('\n');
    }

    fs::write(&path, &output).map_err(|e| e.to_string())?;
    Ok(path)
}

#[tauri::command]
pub fn export_characters_json(
    pool: State<'_, DbPool>,
    work_id: String,
    path: String,
) -> Result<String, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, aliases, gender, appearance, personality, background, custom_attrs FROM characters WHERE work_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let chars: Vec<serde_json::Value> = stmt
        .query_map(rusqlite::params![work_id], |row| {
            Ok(serde_json::json!({
                "name": row.get::<_, String>(1)?,
                "aliases": row.get::<_, String>(2)?,
                "gender": row.get::<_, String>(3)?,
                "appearance": row.get::<_, String>(4)?,
                "personality": row.get::<_, String>(5)?,
                "background": row.get::<_, String>(6)?,
                "custom_attrs": row.get::<_, String>(7)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let json = serde_json::to_string_pretty(&chars).map_err(|e| e.to_string())?;
    fs::write(&path, &json).map_err(|e| e.to_string())?;
    Ok(path)
}
