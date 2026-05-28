mod commands;
mod crypto;
mod db;
mod export;
mod import;
mod stats;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            let db_path = app
                .path()
                .app_local_data_dir()
                .expect("failed to get app data dir")
                .join("writer.db");
            std::fs::create_dir_all(db_path.parent().unwrap())?;

            // Initialize encryption key
            let key_path = db_path.parent().unwrap().join(".encryption_key");
            let key = if key_path.exists() {
                let data = std::fs::read(&key_path)
                    .unwrap_or_else(|_| crypto::generate_key().to_vec());
                let mut arr = [0u8; 32];
                let len = data.len().min(32);
                arr[..len].copy_from_slice(&data[..len]);
                if len < 32 {
                    arr = crypto::generate_key();
                    std::fs::write(&key_path, &arr).ok();
                }
                arr
            } else {
                let key = crypto::generate_key();
                std::fs::write(&key_path, &key).ok();
                key
            };
            crypto::init_key(key);

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
            commands::chapters::move_chapter,
            commands::chapters::update_chapter_status,
            commands::characters::create_character,
            commands::characters::list_characters,
            commands::characters::get_character,
            commands::characters::update_character,
            commands::characters::delete_character,
            commands::characters::create_relation,
            commands::characters::list_relations,
            commands::characters::delete_relation,
            commands::outlines::create_outline,
            commands::outlines::list_outlines,
            commands::outlines::update_outline,
            commands::outlines::move_outline,
            commands::outlines::delete_outline,
            commands::outlines::reorder_outlines,
            commands::notes::create_note,
            commands::notes::list_notes,
            commands::notes::update_note,
            commands::notes::delete_note,
            commands::notes::search_notes,
            commands::goals::create_goal,
            commands::goals::get_active_goal,
            commands::goals::update_goal,
            commands::goals::delete_goal,
            stats::record_writing_session,
            stats::get_today_word_count,
            stats::get_week_stats,
            stats::get_month_stats,
            stats::get_all_time_stats,
            export::export_chapter_txt,
            export::export_chapter_md,
            export::export_work_txt,
            export::export_work_md,
            export::export_outlines_md,
            export::export_characters_json,
            import::preview_import_txt,
            import::import_txt,
            import::import_md,
            import::import_folder,
            commands::snapshots::create_snapshot,
            commands::snapshots::list_snapshots,
            commands::snapshots::restore_snapshot,
            commands::snapshots::delete_snapshot,
            commands::snapshots::auto_snapshot_if_needed,
            commands::ai::create_ai_config,
            commands::ai::list_ai_configs,
            commands::ai::get_default_ai_config,
            commands::ai::get_ai_config_decrypted,
            commands::ai::update_ai_config,
            commands::ai::set_default_ai_config,
            commands::ai::delete_ai_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
