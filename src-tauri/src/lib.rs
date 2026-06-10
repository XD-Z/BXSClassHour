use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn save_json_data(key: &str, value: &str, app_handle: tauri::AppHandle) -> Result<(), String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;

    let file_path: PathBuf = app_dir.join(format!("{}.json", key));
    fs::write(&file_path, value).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn load_json_data(key: &str, app_handle: tauri::AppHandle) -> Result<String, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let file_path: PathBuf = app_dir.join(format!("{}.json", key));

    if file_path.exists() {
        fs::read_to_string(&file_path).map_err(|e| e.to_string())
    } else {
        Ok(String::from("[]"))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            save_json_data,
            load_json_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
