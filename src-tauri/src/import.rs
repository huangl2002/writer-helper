use crate::db::DbPool;
use std::fs;
use tauri::State;

/// Build a Tiptap JSON document from plain text
fn text_to_tiptap(text: &str) -> String {
    let paragraphs: Vec<String> = text
        .split('\n')
        .map(|line| {
            let escaped = line
                .replace('\\', "\\\\")
                .replace('"', "\\\"")
                .replace('\r', "");
            if escaped.trim().is_empty() {
                r#"{"type":"paragraph"}"#.to_string()
            } else {
                format!(
                    r#"{{"type":"paragraph","content":[{{"type":"text","text":"{}"}}]}}"#,
                    escaped
                )
            }
        })
        .collect();

    format!(
        r#"{{"type":"doc","content":[{}]}}"#,
        paragraphs.join(",")
    )
}

/// Check if a line looks like a chapter title marker
fn is_chapter_marker(line: &str) -> bool {
    let trimmed = line.trim().trim_start_matches('#').trim();
    // Chinese chapter patterns: 第X章, 第X卷, 第X节, 第X回
    if trimmed.starts_with('第') {
        let after_di: String = trimmed.chars().skip(3).collect(); // skip "第"
        let rest: String = after_di.chars().take_while(|c| c.is_alphanumeric()).collect();
        if !rest.is_empty() {
            let ends_with_unit = trimmed.ends_with('章')
                || trimmed.ends_with('卷')
                || trimmed.ends_with('节')
                || trimmed.ends_with('回');
            return ends_with_unit;
        }
    }
    // English patterns: Chapter X, CH X
    let lower = trimmed.to_lowercase();
    lower.starts_with("chapter ") || lower.starts_with("ch ")
}

/// Parse TXT content and split by chapter markers
fn split_txt_chapters(content: &str) -> Vec<(String, String)> {
    let mut markers: Vec<(usize, &str)> = Vec::new();
    for (i, line) in content.lines().enumerate() {
        if is_chapter_marker(line) {
            // Find the byte offset of this line
            let offset = content
                .lines()
                .take(i)
                .map(|l| l.len() + 1) // +1 for newline
                .sum::<usize>();
            // On Windows, lines might have \r\n
            let actual_offset = if content[offset..].starts_with('\n') {
                offset
            } else {
                offset.min(content.len())
            };
            markers.push((actual_offset.min(content.len()), line.trim()));
        }
    }

    if markers.is_empty() {
        // No chapter markers found, treat entire file as one chapter
        let title = "导入章节".to_string();
        return vec![(title, content.to_string())];
    }

    let mut chapters = Vec::new();
    for i in 0..markers.len() {
        let (start, title) = markers[i];
        let end = if i + 1 < markers.len() {
            markers[i + 1].0
        } else {
            content.len()
        };
        let body = content[start..end].to_string();
        // Extract title from the matched line
        let title_clean = title.trim().trim_start_matches('#').trim().to_string();
        chapters.push((title_clean, body));
    }

    // If there's content before the first chapter marker, treat it as intro
    if let Some(&(first_start, _)) = markers.first() {
        if first_start > 0 {
            let intro = content[..first_start].trim().to_string();
            if !intro.is_empty() {
                chapters.insert(0, ("前言".to_string(), intro));
            }
        }
    }

    chapters
}

#[tauri::command]
pub fn preview_import_txt(
    path: String,
) -> Result<Vec<String>, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let chapters = split_txt_chapters(&content);
    Ok(chapters.into_iter().map(|(title, _)| title).collect())
}

#[tauri::command]
pub fn import_txt(
    pool: State<'_, DbPool>,
    work_id: String,
    volume_id: Option<String>,
    path: String,
) -> Result<i32, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let chapters = split_txt_chapters(&content);
    let count = chapters.len() as i32;

    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    for (title, body) in &chapters {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        let content_json = text_to_tiptap(body);
        let word_count = body.chars().count() as i32;

        let max_order: i32 = conn
            .query_row(
                "SELECT COALESCE(MAX(sort_order), -1) FROM chapters WHERE work_id = ?1",
                rusqlite::params![work_id],
                |row| row.get(0),
            )
            .unwrap_or(-1);

        conn.execute(
            "INSERT INTO chapters (id, volume_id, work_id, title, content_json, word_count, sort_order, source, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'import', ?8, ?9)",
            rusqlite::params![id, volume_id, work_id, title, content_json, word_count, max_order + 1, now, now],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(count)
}

/// Split markdown content by H1 or H2 headings
fn split_md_by_headings(content: &str, level: usize) -> Vec<(usize, String)> {
    let prefix = "#".repeat(level) + " ";
    let mut results = Vec::new();
    let mut byte_pos = 0usize;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with(&prefix) {
            let title = trimmed[prefix.len()..].trim().to_string();
            if !title.is_empty() {
                // Find actual byte position of this heading
                let actual_pos = content[byte_pos..]
                    .find(trimmed)
                    .map(|p| byte_pos + p)
                    .unwrap_or(byte_pos);
                results.push((actual_pos, title));
            }
        }
        byte_pos += line.len() + 1; // +1 for newline (approximate for \n, might be off for \r\n)
    }
    results
}

#[tauri::command]
pub fn import_md(
    pool: State<'_, DbPool>,
    work_id: String,
    volume_id: Option<String>,
    path: String,
) -> Result<i32, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;

    // Try H1 first, then H2
    let mut headings = split_md_by_headings(&content, 1);
    if headings.is_empty() {
        headings = split_md_by_headings(&content, 2);
    }

    let chapters: Vec<(String, String)> = if headings.is_empty() {
        let title = content
            .lines()
            .next()
            .unwrap_or("导入章节")
            .trim_start_matches('#')
            .trim()
            .to_string();
        vec![(title, content.to_string())]
    } else {
        let mut chs = Vec::new();
        for i in 0..headings.len() {
            let (start, title) = &headings[i];
            let end = if i + 1 < headings.len() {
                headings[i + 1].0
            } else {
                content.len()
            };
            chs.push((title.clone(), content[*start..end].to_string()));
        }
        // Pre-content before first heading
        if let Some(&(first_start, _)) = headings.first() {
            if first_start > 0 {
                let pre = content[..first_start].trim().to_string();
                if !pre.is_empty() {
                    chs.insert(0, ("前言".to_string(), pre));
                }
            }
        }
        chs
    };

    let count = chapters.len() as i32;
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;

    for (title, body) in &chapters {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        let content_json = text_to_tiptap(body);
        let word_count = body.chars().count() as i32;

        let max_order: i32 = conn
            .query_row(
                "SELECT COALESCE(MAX(sort_order), -1) FROM chapters WHERE work_id = ?1",
                rusqlite::params![work_id],
                |row| row.get(0),
            )
            .unwrap_or(-1);

        conn.execute(
            "INSERT INTO chapters (id, volume_id, work_id, title, content_json, word_count, sort_order, source, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'import', ?8, ?9)",
            rusqlite::params![id, volume_id, work_id, title, content_json, word_count, max_order + 1, now, now],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(count)
}

#[tauri::command]
pub fn import_folder(
    pool: State<'_, DbPool>,
    work_id: String,
    volume_id: Option<String>,
    folder_path: String,
) -> Result<i32, String> {
    let mut entries: Vec<_> = fs::read_dir(&folder_path)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.path()
                .extension()
                .map(|ext| ext == "txt" || ext == "md")
                .unwrap_or(false)
        })
        .collect();

    entries.sort_by_key(|e| e.file_name());

    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let mut count = 0;

    for entry in &entries {
        let content = fs::read_to_string(entry.path()).map_err(|e| e.to_string())?;
        let title = entry
            .path()
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("导入章节")
            .to_string();

        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        let content_json = text_to_tiptap(&content);
        let word_count = content.chars().count() as i32;

        let max_order: i32 = conn
            .query_row(
                "SELECT COALESCE(MAX(sort_order), -1) FROM chapters WHERE work_id = ?1",
                rusqlite::params![work_id],
                |row| row.get(0),
            )
            .unwrap_or(-1);

        conn.execute(
            "INSERT INTO chapters (id, volume_id, work_id, title, content_json, word_count, sort_order, source, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'import', ?8, ?9)",
            rusqlite::params![id, volume_id, work_id, title, content_json, word_count, max_order + 1, now, now],
        )
        .map_err(|e| e.to_string())?;

        count += 1;
    }

    Ok(count)
}
