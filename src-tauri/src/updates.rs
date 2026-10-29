//! Atualizações no Android: o APK é baixado e instalado por um plugin nativo
//! (`UpdateInstallerPlugin.kt`). No desktop quem cuida é o tauri-plugin-updater.

use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};

#[cfg(target_os = "android")]
struct Installer<R: Runtime>(tauri::plugin::PluginHandle<R>);

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("sepia-updates")
        .setup(|_app, _api| {
            #[cfg(target_os = "android")]
            {
                use tauri::Manager;
                let handle =
                    _api.register_android_plugin("app.sepia.leitura", "UpdateInstallerPlugin")?;
                _app.manage(Installer(handle));
            }
            Ok(())
        })
        .build()
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct InstallStatus {
    status: String,
}

#[tauri::command]
pub async fn install_android_update<R: Runtime>(
    app: tauri::AppHandle<R>,
    url: String,
) -> Result<InstallStatus, String> {
    #[cfg(target_os = "android")]
    {
        use tauri::Manager;
        let installer = app.state::<Installer<R>>();
        let handle = installer.0.clone();
        tauri::async_runtime::spawn_blocking(move || {
            handle
                .run_mobile_plugin::<InstallStatus>("install", serde_json::json!({ "url": url }))
                .map_err(|e| e.to_string())
        })
        .await
        .map_err(|e| e.to_string())?
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, url);
        Err("disponível apenas no Android".into())
    }
}
