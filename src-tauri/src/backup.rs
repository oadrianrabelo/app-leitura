//! Backup manual: o app manda os bytes do .zip, guardamos num arquivo temporário e
//! depois ele vai para onde a leitora escolher (Android) ou para Downloads (desktop).

use tauri::{
    Manager, Runtime,
    plugin::{Builder, TauriPlugin},
};

#[cfg(target_os = "android")]
struct Saver<R: Runtime>(tauri::plugin::PluginHandle<R>);

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("sepia-backup")
        .setup(|_app, _api| {
            #[cfg(target_os = "android")]
            {
                let handle = _api.register_android_plugin("app.sepia.leitura", "SaveFilePlugin")?;
                _app.manage(Saver(handle));
            }
            Ok(())
        })
        .build()
}

/// Nome de arquivo seguro (sem pastas no caminho)
fn safe_name(name: &str) -> String {
    let n: String = name
        .chars()
        .map(|c| if c.is_alphanumeric() || "-_. ".contains(c) { c } else { '_' })
        .collect();
    if n.trim().is_empty() { "sepia-backup.zip".into() } else { n }
}

/// Recebe os bytes crus do backup e grava num arquivo temporário; devolve o caminho.
#[tauri::command]
pub fn backup_stage<R: Runtime>(app: tauri::AppHandle<R>, request: tauri::ipc::Request<'_>) -> Result<String, String> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
        return Err("backup sem conteúdo".into());
    };
    let name = request
        .headers()
        .get("x-name")
        .and_then(|v| v.to_str().ok())
        .map(safe_name)
        .unwrap_or_else(|| "sepia-backup.zip".into());
    let dir = app.path().app_cache_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(name);
    std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

#[derive(serde::Deserialize)]
#[allow(dead_code)]
struct Saved {
    saved: bool,
}

/// Leva o arquivo temporário ao destino final. Devolve onde ficou (ou None se cancelou).
#[tauri::command]
pub async fn backup_save<R: Runtime>(app: tauri::AppHandle<R>, path: String, name: String) -> Result<Option<String>, String> {
    #[cfg(target_os = "android")]
    {
        let handle = app.state::<Saver<R>>().0.clone();
        let result = tauri::async_runtime::spawn_blocking(move || {
            handle.run_mobile_plugin::<Saved>(
                "save",
                serde_json::json!({ "path": path, "name": name, "mime": "application/zip" }),
            )
        })
        .await
        .map_err(|e| e.to_string())?;
        return match result {
            Ok(_) => Ok(Some(name)),
            Err(e) if e.to_string().contains("cancel") => Ok(None),
            Err(e) => Err(e.to_string()),
        };
    }

    #[cfg(not(target_os = "android"))]
    {
        let dir = app
            .path()
            .download_dir()
            .or_else(|_| app.path().document_dir())
            .map_err(|e| e.to_string())?;
        let name = safe_name(&name);
        let mut dest = dir.join(&name);
        let mut n = 1;
        while dest.exists() {
            let stem = name.trim_end_matches(".zip");
            dest = dir.join(format!("{stem} ({n}).zip"));
            n += 1;
        }
        std::fs::copy(&path, &dest).map_err(|e| e.to_string())?;
        let _ = std::fs::remove_file(&path);
        Ok(Some(dest.to_string_lossy().into_owned()))
    }
}
