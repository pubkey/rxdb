use std::time::{SystemTime, UNIX_EPOCH};

#[tauri::command]
fn get_db_suffix() -> String {
    let start = SystemTime::now();
    let since_the_epoch = start
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards");
    format!("{}", since_the_epoch.as_millis())
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_db_suffix])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
