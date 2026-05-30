use crate::db::DbPool;
use chrono::Datelike;
use serde::Serialize;
use std::collections::HashMap;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct TodayStats {
    pub total_words: i32,
    pub session_count: i32,
}

#[derive(Debug, Serialize)]
pub struct DailyStats {
    pub date: String,
    pub word_count: i32,
}

#[derive(Debug, Serialize)]
pub struct WeekStats {
    pub days: Vec<DailyStats>,
    pub total_words: i32,
}

#[derive(Debug, Serialize)]
pub struct MonthlyStats {
    pub days: Vec<DailyStats>,
    pub total_words: i32,
}

#[derive(Debug, Serialize)]
pub struct AllTimeStats {
    pub total_words: i64,
    pub total_chapters: i32,
    pub total_sessions: i32,
}

#[derive(Debug, Serialize)]
pub struct YearStats {
    pub year: i32,
    pub months: Vec<MonthData>,
    pub total_words: i64,
    pub total_days: i32,
    pub best_streak: i32,
}

#[derive(Debug, Serialize)]
pub struct MonthData {
    pub month: u32,
    pub days: Vec<DailyStats>,
    pub total: i64,
}

#[tauri::command]
pub fn record_writing_session(
    pool: State<'_, DbPool>,
    work_id: String,
    chapter_id: Option<String>,
    word_delta: i32,
) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now();
    let date = now.format("%Y-%m-%d").to_string();
    let now_str = now.to_rfc3339();

    conn.execute(
        "INSERT INTO writing_sessions (id, work_id, chapter_id, date, start_time, end_time, word_delta, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![id, work_id, chapter_id, date, now_str, now_str, word_delta, now_str],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_today_word_count(pool: State<'_, DbPool>) -> Result<TodayStats, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

    let total_words: i32 = conn
        .query_row(
            "SELECT COALESCE(SUM(word_delta), 0) FROM writing_sessions WHERE date = ?1",
            rusqlite::params![today],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let session_count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM writing_sessions WHERE date = ?1",
            rusqlite::params![today],
            |row| row.get(0),
        )
        .unwrap_or(0);

    Ok(TodayStats { total_words, session_count })
}

#[tauri::command]
pub fn get_recent_stats(
    pool: State<'_, DbPool>,
    days: i32,
) -> Result<Vec<DailyStats>, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let end = chrono::Utc::now();
    let start = end - chrono::Duration::days(days as i64);

    let mut stmt = conn
        .prepare("SELECT date, COALESCE(SUM(word_delta), 0) FROM writing_sessions WHERE date >= ?1 AND date <= ?2 GROUP BY date ORDER BY date")
        .map_err(|e| e.to_string())?;

    let days: Vec<DailyStats> = stmt
        .query_map(
            rusqlite::params![start.format("%Y-%m-%d").to_string(), end.format("%Y-%m-%d").to_string()],
            |row| Ok(DailyStats {
                date: row.get(0)?,
                word_count: row.get(1)?,
            }),
        )
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(days)
}

#[tauri::command]
pub fn get_week_stats(pool: State<'_, DbPool>) -> Result<WeekStats, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let end = chrono::Utc::now();
    let start = end - chrono::Duration::days(7);

    let mut stmt = conn
        .prepare("SELECT date, COALESCE(SUM(word_delta), 0) FROM writing_sessions WHERE date >= ?1 AND date <= ?2 GROUP BY date ORDER BY date")
        .map_err(|e| e.to_string())?;

    let days: Vec<DailyStats> = stmt
        .query_map(
            rusqlite::params![start.format("%Y-%m-%d").to_string(), end.format("%Y-%m-%d").to_string()],
            |row| Ok(DailyStats {
                date: row.get(0)?,
                word_count: row.get(1)?,
            }),
        )
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let total_words = days.iter().map(|d| d.word_count).sum();

    Ok(WeekStats { days, total_words })
}

#[tauri::command]
pub fn get_month_stats(pool: State<'_, DbPool>) -> Result<MonthlyStats, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now();
    let start = chrono::NaiveDate::from_ymd_opt(now.year(), now.month(), 1)
        .unwrap()
        .format("%Y-%m-%d")
        .to_string();
    let end = now.format("%Y-%m-%d").to_string();

    let mut stmt = conn
        .prepare("SELECT date, COALESCE(SUM(word_delta), 0) FROM writing_sessions WHERE date >= ?1 AND date <= ?2 GROUP BY date ORDER BY date")
        .map_err(|e| e.to_string())?;

    let days: Vec<DailyStats> = stmt
        .query_map(rusqlite::params![start, end], |row| {
            Ok(DailyStats {
                date: row.get(0)?,
                word_count: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let total_words = days.iter().map(|d| d.word_count).sum();

    Ok(MonthlyStats { days, total_words })
}

#[tauri::command]
pub fn get_all_time_stats(pool: State<'_, DbPool>) -> Result<AllTimeStats, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;

    let total_words: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(word_delta), 0) FROM writing_sessions",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let total_chapters: i32 = conn
        .query_row("SELECT COUNT(*) FROM chapters", [], |row| row.get(0))
        .unwrap_or(0);

    let total_sessions: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM writing_sessions",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    Ok(AllTimeStats {
        total_words,
        total_chapters,
        total_sessions,
    })
}

#[tauri::command]
pub fn get_year_stats(pool: State<'_, DbPool>, year: i32) -> Result<YearStats, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let start = format!("{}-01-01", year);
    let end = format!("{}-12-31", year);

    let mut stmt = conn
        .prepare("SELECT date, COALESCE(SUM(word_delta), 0) FROM writing_sessions WHERE date >= ?1 AND date <= ?2 GROUP BY date ORDER BY date")
        .map_err(|e| e.to_string())?;

    let rows: Vec<DailyStats> = stmt
        .query_map(rusqlite::params![start, end], |row| {
            Ok(DailyStats {
                date: row.get(0)?,
                word_count: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Build date -> word_count map
    let date_map: HashMap<String, i32> = rows
        .iter()
        .map(|d| (d.date.clone(), d.word_count))
        .collect();

    let total_words: i64 = rows.iter().map(|d| d.word_count as i64).sum();
    let total_days = rows.iter().filter(|d| d.word_count > 0).count() as i32;

    // Calculate best streak
    let mut best_streak = 0i32;
    let mut current_streak = 0i32;
    let start_date = chrono::NaiveDate::from_ymd_opt(year, 1, 1).unwrap();
    let end_date = chrono::NaiveDate::from_ymd_opt(year, 12, 31).unwrap();
    let mut d = start_date;
    while d <= end_date {
        let key = d.format("%Y-%m-%d").to_string();
        if date_map.get(&key).map_or(0, |&v| v) > 0 {
            current_streak += 1;
            if current_streak > best_streak {
                best_streak = current_streak;
            }
        } else {
            current_streak = 0;
        }
        d = d.succ_opt().unwrap_or(end_date);
    }

    // Build month data
    let mut months: Vec<MonthData> = Vec::new();
    for month in 1..=12u32 {
        let mut days: Vec<DailyStats> = Vec::new();
        let mut total: i64 = 0;
        let _first = chrono::NaiveDate::from_ymd_opt(year, month, 1).unwrap();
        let last_day = if month == 12 { 31 } else {
            chrono::NaiveDate::from_ymd_opt(year, month + 1, 1)
                .unwrap()
                .pred_opt()
                .unwrap()
                .day()
        };
        for day in 1..=last_day {
            let date_str = format!("{}-{:02}-{:02}", year, month, day);
            let wc = date_map.get(&date_str).copied().unwrap_or(0);
            days.push(DailyStats {
                date: date_str,
                word_count: wc,
            });
            total += wc as i64;
        }
        months.push(MonthData { month, days, total });
    }

    Ok(YearStats {
        year,
        months,
        total_words,
        total_days,
        best_streak,
    })
}
