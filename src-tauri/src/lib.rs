mod google;
mod scanner;
mod updates;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_http::init())
        .plugin(updates::init())
        .plugin(google::init())
        .plugin(scanner::init());

    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());

    builder
        .invoke_handler(tauri::generate_handler![
            updates::install_android_update,
            google::google_authorize,
            google::google_forget,
            google::oauth_listen,
            google::oauth_wait,
            scanner::scan_barcode
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
