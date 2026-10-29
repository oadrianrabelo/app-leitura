//! Leitura de código de barras (ISBN) no Android, pelo plugin nativo `BarcodePlugin.kt`.

use tauri::{
    Runtime,
    plugin::{Builder, TauriPlugin},
};

#[cfg(target_os = "android")]
struct Scanner<R: Runtime>(tauri::plugin::PluginHandle<R>);

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("sepia-scanner")
        .setup(|_app, _api| {
            #[cfg(target_os = "android")]
            {
                use tauri::Manager;
                let handle = _api.register_android_plugin("app.sepia.leitura", "BarcodePlugin")?;
                _app.manage(Scanner(handle));
            }
            Ok(())
        })
        .build()
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct Scanned {
    content: String,
}

#[tauri::command]
pub async fn scan_barcode<R: Runtime>(app: tauri::AppHandle<R>) -> Result<Scanned, String> {
    #[cfg(target_os = "android")]
    {
        use tauri::Manager;
        let handle = app.state::<Scanner<R>>().0.clone();
        tauri::async_runtime::spawn_blocking(move || {
            handle
                .run_mobile_plugin::<Scanned>("scan", serde_json::json!({}))
                .map_err(|e| e.to_string())
        })
        .await
        .map_err(|e| e.to_string())?
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        Err("disponível apenas no Android".into())
    }
}
