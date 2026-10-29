//! Login com o Google para a sincronização.
//! Android: plugin nativo (`GoogleAuthPlugin.kt`) com a conta do aparelho.
//! Desktop: navegador do sistema + resposta recebida num endereço local (loopback).

use tauri::{
    Runtime,
    plugin::{Builder, TauriPlugin},
};

#[cfg(target_os = "android")]
struct GoogleAuth<R: Runtime>(tauri::plugin::PluginHandle<R>);

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("sepia-google")
        .setup(|_app, _api| {
            #[cfg(target_os = "android")]
            {
                use tauri::Manager;
                let handle =
                    _api.register_android_plugin("app.sepia.leitura", "GoogleAuthPlugin")?;
                _app.manage(GoogleAuth(handle));
            }
            #[cfg(desktop)]
            {
                use tauri::Manager;
                _app.manage(loopback::Pending::default());
            }
            Ok(())
        })
        .build()
}

#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccessToken {
    access_token: String,
}

/// Android: token de acesso ao Drive. Com `interactive = false`, falha em vez de mostrar telas.
#[tauri::command]
pub async fn google_authorize<R: Runtime>(
    app: tauri::AppHandle<R>,
    interactive: bool,
) -> Result<AccessToken, String> {
    #[cfg(target_os = "android")]
    {
        use tauri::Manager;
        let handle = app.state::<GoogleAuth<R>>().0.clone();
        tauri::async_runtime::spawn_blocking(move || {
            handle
                .run_mobile_plugin::<AccessToken>(
                    "authorize",
                    serde_json::json!({ "interactive": interactive }),
                )
                .map_err(|e| e.to_string())
        })
        .await
        .map_err(|e| e.to_string())?
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, interactive);
        Err("disponível apenas no Android".into())
    }
}

/// Android: limpa o token em cache no aparelho (ao desconectar ou trocar de conta).
#[tauri::command]
pub async fn google_forget<R: Runtime>(app: tauri::AppHandle<R>, token: String) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        use tauri::Manager;
        let handle = app.state::<GoogleAuth<R>>().0.clone();
        tauri::async_runtime::spawn_blocking(move || {
            handle
                .run_mobile_plugin::<serde_json::Value>("forget", serde_json::json!({ "token": token }))
                .map(|_| ())
                .map_err(|e| e.to_string())
        })
        .await
        .map_err(|e| e.to_string())?
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, token);
        Ok(())
    }
}

/// Desktop: abre uma porta local e devolve o número dela para montar o redirect.
#[tauri::command]
pub fn oauth_listen<R: Runtime>(app: tauri::AppHandle<R>) -> Result<u16, String> {
    #[cfg(desktop)]
    {
        use tauri::Manager;
        app.state::<loopback::Pending>().listen()
    }
    #[cfg(not(desktop))]
    {
        let _ = app;
        Err("disponível apenas no desktop".into())
    }
}

/// Desktop: espera o navegador voltar com o código e devolve a query string recebida.
#[tauri::command]
pub async fn oauth_wait<R: Runtime>(app: tauri::AppHandle<R>) -> Result<String, String> {
    #[cfg(desktop)]
    {
        use tauri::Manager;
        let listener = app.state::<loopback::Pending>().take()?;
        tauri::async_runtime::spawn_blocking(move || loopback::wait(listener))
            .await
            .map_err(|e| e.to_string())?
    }
    #[cfg(not(desktop))]
    {
        let _ = app;
        Err("disponível apenas no desktop".into())
    }
}

#[cfg(desktop)]
mod loopback {
    use std::io::{BufRead, BufReader, Write};
    use std::net::TcpListener;
    use std::sync::Mutex;
    use std::time::{Duration, Instant};

    #[derive(Default)]
    pub struct Pending(Mutex<Option<TcpListener>>);

    impl Pending {
        pub fn listen(&self) -> Result<u16, String> {
            let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
            let port = listener.local_addr().map_err(|e| e.to_string())?.port();
            *self.0.lock().unwrap() = Some(listener);
            Ok(port)
        }

        pub fn take(&self) -> Result<TcpListener, String> {
            self.0
                .lock()
                .unwrap()
                .take()
                .ok_or_else(|| "nenhum login em andamento".to_string())
        }
    }

    const PAGE: &str = "<!doctype html><meta charset=utf-8><title>Sépia</title>\
<body style=\"font-family:Georgia,serif;background:#f4ede1;color:#2a241d;display:grid;place-items:center;height:100vh;margin:0\">\
<div style=\"text-align:center\"><h1 style=\"font-weight:500\">Tudo certo!</h1>\
<p>Pode fechar esta aba e voltar ao Sépia.</p></div>";

    pub fn wait(listener: TcpListener) -> Result<String, String> {
        listener.set_nonblocking(true).map_err(|e| e.to_string())?;
        let deadline = Instant::now() + Duration::from_secs(300);
        loop {
            match listener.accept() {
                Ok((mut stream, _)) => {
                    stream.set_nonblocking(false).ok();
                    let mut line = String::new();
                    BufReader::new(&stream)
                        .read_line(&mut line)
                        .map_err(|e| e.to_string())?;
                    // "GET /?code=...&state=... HTTP/1.1"
                    let path = line.split_whitespace().nth(1).unwrap_or("");
                    if !path.contains("code=") && !path.contains("error=") {
                        // favicon e afins: responde e continua esperando
                        let _ = stream
                            .write_all(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n");
                        continue;
                    }
                    let body = PAGE.as_bytes();
                    let _ = write!(
                        stream,
                        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                        body.len()
                    );
                    let _ = stream.write_all(body);
                    return Ok(path.splitn(2, '?').nth(1).unwrap_or("").to_string());
                }
                Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    if Instant::now() > deadline {
                        return Err("tempo esgotado esperando o login".into());
                    }
                    std::thread::sleep(Duration::from_millis(150));
                }
                Err(e) => return Err(e.to_string()),
            }
        }
    }
}
