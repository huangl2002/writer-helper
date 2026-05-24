mod commands;
mod db;
mod stats;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            let app_handle = app.handle().clone();
            let db_path = app
                .path()
                .app_local_data_dir()
                .expect("failed to get app data dir")
                .join("writer.db");
            std::fs::create_dir_all(db_path.parent().unwrap())?;
            let pool = db::init_db(&db_path)?;
            app_handle.manage(pool);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::works::create_work,
            commands::works::list_works,
            commands::works::update_work,
            commands::works::delete_work,
            commands::volumes::create_volume,
            commands::volumes::list_volumes,
            commands::volumes::update_volume,
            commands::volumes::delete_volume,
            commands::volumes::reorder_volumes,
            commands::chapters::create_chapter,
            commands::chapters::get_chapter,
            commands::chapters::update_chapter,
            commands::chapters::delete_chapter,
            commands::chapters::list_chapters,
            commands::chapters::reorder_chapters,
            stats::record_writing_session,
            stats::get_today_word_count,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
