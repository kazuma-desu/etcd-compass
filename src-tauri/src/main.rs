#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
mod etcd;

use etcd::{
    AuthStatus, ClusterStatus, EtcdClient, EtcdConfig, EtcdKey, EtcdRole, EtcdRolePermissions,
    EtcdUser, LeaseInfo, WatchEvent,
};
use std::collections::HashMap;
use tauri::{
    api::dialog::blocking::FileDialogBuilder, CustomMenuItem, Manager, State, SystemTray,
    SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
};
use tokio::sync::{mpsc, Mutex};
use uuid::Uuid;

pub struct WatchState {
    _watch_id: String,
    key: String,
    cancel_tx: mpsc::Sender<()>,
}

pub struct AppState {
    connections: Mutex<HashMap<String, EtcdClient>>,
    connection_configs: Mutex<HashMap<String, EtcdConfig>>,
    active_watches: Mutex<HashMap<String, WatchState>>,
}

impl AppState {
    pub fn new() -> Self {
        AppState {
            connections: Mutex::new(HashMap::new()),
            connection_configs: Mutex::new(HashMap::new()),
            active_watches: Mutex::new(HashMap::new()),
        }
    }
}

#[tauri::command]
async fn connect_etcd(
    state: State<'_, AppState>,
    endpoint: String,
    username: Option<String>,
    password: Option<String>,
    #[allow(non_snake_case)] tlsEnabled: bool,
    #[allow(non_snake_case)] caCertPath: Option<String>,
    #[allow(non_snake_case)] clientCertPath: Option<String>,
    #[allow(non_snake_case)] clientKeyPath: Option<String>,
    #[allow(non_snake_case)] skipVerify: bool,
) -> Result<String, String> {
    let config = EtcdConfig {
        endpoint,
        username,
        password,
        tls_enabled: tlsEnabled,
        ca_cert_path: caCertPath,
        client_cert_path: clientCertPath,
        client_key_path: clientKeyPath,
        skip_verify: skipVerify,
    };

    match EtcdClient::connect(&config).await {
        Ok(client) => {
            let connection_id = Uuid::new_v4().to_string();

            {
                let mut connections = state.connections.lock().await;
                connections.insert(connection_id.clone(), client);
            }

            {
                let mut configs = state.connection_configs.lock().await;
                configs.insert(connection_id.clone(), config.clone());
            }

            let _ = config::save_connection_config(&config);

            Ok(connection_id)
        }
        Err(e) => Err(format!("Failed to connect: {}", e)),
    }
}

#[tauri::command]
async fn disconnect_etcd(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<String, String> {
    let mut connections = state.connections.lock().await;
    let removed = connections.remove(&connection_id);

    if removed.is_some() {
        let mut configs = state.connection_configs.lock().await;
        configs.remove(&connection_id);
        Ok("Disconnected successfully".to_string())
    } else {
        Err(format!("Connection with ID '{}' not found", connection_id))
    }
}

#[tauri::command]
async fn test_connection(
    endpoint: String,
    username: Option<String>,
    password: Option<String>,
    #[allow(non_snake_case)] tlsEnabled: bool,
    #[allow(non_snake_case)] caCertPath: Option<String>,
    #[allow(non_snake_case)] clientCertPath: Option<String>,
    #[allow(non_snake_case)] clientKeyPath: Option<String>,
    #[allow(non_snake_case)] skipVerify: bool,
) -> Result<String, String> {
    let config = EtcdConfig {
        endpoint: endpoint.clone(),
        username,
        password,
        tls_enabled: tlsEnabled,
        ca_cert_path: caCertPath,
        client_cert_path: clientCertPath,
        client_key_path: clientKeyPath,
        skip_verify: skipVerify,
    };

    match EtcdClient::connect(&config).await {
        Ok(mut client) => match client.status().await {
            Ok(status) => Ok(format!(
                "Connected successfully to {}. Version: {}",
                endpoint,
                status.version()
            )),
            Err(e) => Err(format!("Connected but failed to get status: {}", e)),
        },
        Err(e) => Err(format!("Failed to connect: {}", e)),
    }
}

#[tauri::command]
async fn list_connections(state: State<'_, AppState>) -> Result<Vec<(String, String)>, String> {
    let configs = state.connection_configs.lock().await;
    let connections: Vec<(String, String)> = configs
        .iter()
        .map(|(id, config)| (id.clone(), config.endpoint.clone()))
        .collect();
    Ok(connections)
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PaginatedKeysResult {
    pub keys: Vec<EtcdKey>,
    pub has_more: bool,
}

#[tauri::command]
async fn get_all_keys(
    state: State<'_, AppState>,
    connection_id: String,
    limit: i64,
    cursor: Option<String>,
    sort_ascending: bool,
) -> Result<PaginatedKeysResult, String> {
    let mut connections = state.connections.lock().await;

    match connections.get_mut(&connection_id) {
        Some(client) => {
            let (keys, has_more) = client
                .get_all_keys(limit, cursor, sort_ascending)
                .await
                .map_err(|e| e.to_string())?;
            Ok(PaginatedKeysResult { keys, has_more })
        }
        None => Err(format!("Connection '{}' not found", connection_id)),
    }
}

#[tauri::command]
async fn get_key(
    state: State<'_, AppState>,
    connection_id: String,
    key: String,
) -> Result<Option<EtcdKey>, String> {
    let mut connections = state.connections.lock().await;

    match connections.get_mut(&connection_id) {
        Some(client) => client.get_key(&key).await.map_err(|e| e.to_string()),
        None => Err(format!("Connection '{}' not found", connection_id)),
    }
}

#[tauri::command]
async fn put_key(
    state: State<'_, AppState>,
    connection_id: String,
    key: String,
    value: String,
    lease_id: Option<i64>,
) -> Result<EtcdKey, String> {
    let mut connections = state.connections.lock().await;

    match connections.get_mut(&connection_id) {
        Some(client) => client
            .put_key(&key, &value, lease_id)
            .await
            .map_err(|e| e.to_string()),
        None => Err(format!("Connection '{}' not found", connection_id)),
    }
}

#[tauri::command]
async fn delete_key(
    state: State<'_, AppState>,
    connection_id: String,
    key: String,
) -> Result<(), String> {
    let mut connections = state.connections.lock().await;

    match connections.get_mut(&connection_id) {
        Some(client) => client.delete_key(&key).await.map_err(|e| e.to_string()),
        None => Err(format!("Connection '{}' not found", connection_id)),
    }
}

#[tauri::command]
async fn delete_keys(
    state: State<'_, AppState>,
    connection_id: String,
    keys: Vec<String>,
) -> Result<usize, String> {
    let mut connections = state.connections.lock().await;

    match connections.get_mut(&connection_id) {
        Some(client) => client.delete_keys(&keys).await.map_err(|e| e.to_string()),
        None => Err(format!("Connection '{}' not found", connection_id)),
    }
}

#[tauri::command]
async fn get_keys_with_prefix(
    state: State<'_, AppState>,
    connection_id: String,
    prefix: String,
    limit: i64,
    cursor: Option<String>,
    sort_ascending: bool,
) -> Result<PaginatedKeysResult, String> {
    let mut connections = state.connections.lock().await;

    match connections.get_mut(&connection_id) {
        Some(client) => {
            let (keys, has_more) = client
                .get_keys_with_prefix(&prefix, limit, cursor, sort_ascending)
                .await
                .map_err(|e| e.to_string())?;
            Ok(PaginatedKeysResult { keys, has_more })
        }
        None => Err(format!("Connection '{}' not found", connection_id)),
    }
}

#[tauri::command]
fn get_saved_connection() -> Result<EtcdConfig, String> {
    config::get_connection_config().map_err(|e| e.to_string())
}

#[tauri::command]
fn save_connection(config: EtcdConfig) -> Result<(), String> {
    config::save_connection_config(&config).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_connection_history() -> Vec<EtcdConfig> {
    config::get_connection_history().unwrap_or_default()
}

#[tauri::command]
fn remove_from_history(endpoint: String) -> Result<(), String> {
    config::remove_from_history(&endpoint).map_err(|e| e.to_string())
}

#[tauri::command]
async fn pick_certificate_file() -> Result<Option<String>, String> {
    let path = tauri::async_runtime::spawn_blocking(|| {
        FileDialogBuilder::new()
            .add_filter("Certificate Files", &["pem", "crt", "cert", "key"])
            .add_filter("All Files", &["*"])
            .pick_file()
    })
    .await
    .map_err(|e| format!("Failed to spawn blocking task: {}", e))?;

    Ok(path.map(|p| p.to_string_lossy().to_string()))
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct WatchResponse {
    pub watch_id: String,
    pub key: String,
    pub is_prefix: bool,
}

#[tauri::command]
async fn watch_key(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    connection_id: String,
    key: String,
    is_prefix: bool,
) -> Result<WatchResponse, String> {
    let watch_id = Uuid::new_v4().to_string();

    let mut connections = state.connections.lock().await;
    let client = connections
        .get_mut(&connection_id)
        .ok_or_else(|| format!("Connection '{}' not found", connection_id))?;

    let app_handle_clone = app_handle.clone();
    let watch_id_clone = watch_id.clone();

    let handle = client
        .watch_key(
            watch_id_clone,
            key.clone(),
            is_prefix,
            move |event: WatchEvent| {
                let _ = app_handle_clone.emit_all("watch-event", event);
            },
        )
        .await
        .map_err(|e| format!("Failed to start watch: {}", e))?;

    {
        let mut watches = state.active_watches.lock().await;
        watches.insert(
            watch_id.clone(),
            WatchState {
                _watch_id: watch_id.clone(),
                key: key.clone(),
                cancel_tx: handle.cancel_tx,
            },
        );
    }

    Ok(WatchResponse {
        watch_id,
        key,
        is_prefix,
    })
}

#[tauri::command]
async fn unwatch_key(state: State<'_, AppState>, watch_id: String) -> Result<(), String> {
    let mut watches = state.active_watches.lock().await;

    if let Some(watch_state) = watches.remove(&watch_id) {
        let _ = watch_state.cancel_tx.send(()).await;
        Ok(())
    } else {
        Err(format!("Watch with ID '{}' not found", watch_id))
    }
}

#[tauri::command]
async fn list_active_watches(state: State<'_, AppState>) -> Result<Vec<(String, String)>, String> {
    let watches = state.active_watches.lock().await;
    let result: Vec<(String, String)> = watches
        .iter()
        .map(|(id, state)| (id.clone(), state.key.clone()))
        .collect();
    Ok(result)
}

#[tauri::command]
async fn lease_grant(
    state: State<'_, AppState>,
    connection_id: String,
    ttl: i64,
) -> Result<i64, String> {
    let mut connections = state.connections.lock().await;
    match connections.get_mut(&connection_id) {
        Some(client) => client.lease_grant(ttl).await.map_err(|e| e.to_string()),
        None => Err(format!("Connection '{}' not found", connection_id)),
    }
}

#[tauri::command]
async fn lease_revoke(
    state: State<'_, AppState>,
    connection_id: String,
    lease_id: i64,
) -> Result<(), String> {
    let mut connections = state.connections.lock().await;
    match connections.get_mut(&connection_id) {
        Some(client) => client
            .lease_revoke(lease_id)
            .await
            .map_err(|e| e.to_string()),
        None => Err(format!("Connection '{}' not found", connection_id)),
    }
}

#[tauri::command]
async fn lease_keepalive(
    state: State<'_, AppState>,
    connection_id: String,
    lease_id: i64,
) -> Result<(), String> {
    let mut connections = state.connections.lock().await;
    match connections.get_mut(&connection_id) {
        Some(client) => client
            .lease_keepalive(lease_id)
            .await
            .map_err(|e| e.to_string()),
        None => Err(format!("Connection '{}' not found", connection_id)),
    }
}

#[tauri::command]
async fn lease_time_to_live(
    state: State<'_, AppState>,
    connection_id: String,
    lease_id: i64,
) -> Result<LeaseInfo, String> {
    let mut connections = state.connections.lock().await;
    match connections.get_mut(&connection_id) {
        Some(client) => client
            .lease_time_to_live(lease_id)
            .await
            .map_err(|e| e.to_string()),
        None => Err(format!("Connection '{}' not found", connection_id)),
    }
}

#[tauri::command]
async fn lease_list(state: State<'_, AppState>, connection_id: String) -> Result<Vec<i64>, String> {
    let mut connections = state.connections.lock().await;
    match connections.get_mut(&connection_id) {
        Some(client) => client.lease_list().await.map_err(|e| e.to_string()),
        None => Err(format!("Connection '{}' not found", connection_id)),
    }
}

#[tauri::command]
async fn cluster_status(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<ClusterStatus, String> {
    let mut connections = state.connections.lock().await;
    match connections.get_mut(&connection_id) {
        Some(client) => client.cluster_status().await.map_err(|e| e.to_string()),
        None => Err(format!("Connection '{}' not found", connection_id)),
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SnapshotProgress {
    pub bytes_written: u64,
    pub total_bytes: u64,
}

#[tauri::command]
async fn snapshot_save(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<String, String> {
    let file_path = tauri::async_runtime::spawn_blocking(|| {
        FileDialogBuilder::new()
            .add_filter("ETCD Snapshot", &["db", "snapshot"])
            .add_filter("All Files", &["*"])
            .set_file_name(&format!(
                "etcd-snapshot-{}.db",
                chrono::Local::now().format("%Y%m%d-%H%M%S")
            ))
            .save_file()
    })
    .await
    .map_err(|e| format!("Failed to spawn blocking task: {}", e))?;

    let file_path = match file_path {
        Some(path) => path,
        None => return Err("No file selected".to_string()),
    };

    let mut connections = state.connections.lock().await;
    let client = connections
        .get_mut(&connection_id)
        .ok_or_else(|| format!("Connection '{}' not found", connection_id))?;

    let app_handle_clone = app_handle.clone();
    let path_clone = file_path.clone();

    let bytes_written = client
        .snapshot(
            path_clone,
            Some(move |written: u64, total: u64| {
                let progress = SnapshotProgress {
                    bytes_written: written,
                    total_bytes: total,
                };
                let _ = app_handle_clone.emit_all("snapshot-progress", progress);
            }),
        )
        .await
        .map_err(|e| format!("Failed to save snapshot: {}", e))?;

    Ok(format!(
        "Snapshot saved successfully: {} bytes written to {}",
        bytes_written,
        file_path.display()
    ))
}

#[tauri::command]
async fn auth_status(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<AuthStatus, String> {
    let mut connections = state.connections.lock().await;
    match connections.get_mut(&connection_id) {
        Some(client) => client.auth_status().await.map_err(|e| e.to_string()),
        None => Err(format!("Connection '{}' not found", connection_id)),
    }
}

#[tauri::command]
async fn auth_enable(state: State<'_, AppState>, connection_id: String) -> Result<(), String> {
    let mut connections = state.connections.lock().await;
    match connections.get_mut(&connection_id) {
        Some(client) => client.auth_enable().await.map_err(|e| e.to_string()),
        None => Err(format!("Connection '{}' not found", connection_id)),
    }
}

#[tauri::command]
async fn auth_disable(state: State<'_, AppState>, connection_id: String) -> Result<(), String> {
    let mut connections = state.connections.lock().await;
    match connections.get_mut(&connection_id) {
        Some(client) => client.auth_disable().await.map_err(|e| e.to_string()),
        None => Err(format!("Connection '{}' not found", connection_id)),
    }
}

#[tauri::command]
async fn user_list(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<Vec<EtcdUser>, String> {
    let mut connections = state.connections.lock().await;
    match connections.get_mut(&connection_id) {
        Some(client) => client.user_list().await.map_err(|e| e.to_string()),
        None => Err(format!("Connection '{}' not found", connection_id)),
    }
}

#[tauri::command]
async fn user_add(
    state: State<'_, AppState>,
    connection_id: String,
    name: String,
    password: String,
) -> Result<(), String> {
    let mut connections = state.connections.lock().await;
    match connections.get_mut(&connection_id) {
        Some(client) => client
            .user_add(&name, &password)
            .await
            .map_err(|e| e.to_string()),
        None => Err(format!("Connection '{}' not found", connection_id)),
    }
}

#[tauri::command]
async fn user_delete(
    state: State<'_, AppState>,
    connection_id: String,
    name: String,
) -> Result<(), String> {
    let mut connections = state.connections.lock().await;
    match connections.get_mut(&connection_id) {
        Some(client) => client.user_delete(&name).await.map_err(|e| e.to_string()),
        None => Err(format!("Connection '{}' not found", connection_id)),
    }
}

#[tauri::command]
async fn user_grant_role(
    state: State<'_, AppState>,
    connection_id: String,
    user: String,
    role: String,
) -> Result<(), String> {
    let mut connections = state.connections.lock().await;
    match connections.get_mut(&connection_id) {
        Some(client) => client
            .user_grant_role(&user, &role)
            .await
            .map_err(|e| e.to_string()),
        None => Err(format!("Connection '{}' not found", connection_id)),
    }
}

#[tauri::command]
async fn user_revoke_role(
    state: State<'_, AppState>,
    connection_id: String,
    user: String,
    role: String,
) -> Result<(), String> {
    let mut connections = state.connections.lock().await;
    match connections.get_mut(&connection_id) {
        Some(client) => client
            .user_revoke_role(&user, &role)
            .await
            .map_err(|e| e.to_string()),
        None => Err(format!("Connection '{}' not found", connection_id)),
    }
}

#[tauri::command]
async fn role_list(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<Vec<EtcdRole>, String> {
    let mut connections = state.connections.lock().await;
    match connections.get_mut(&connection_id) {
        Some(client) => client.role_list().await.map_err(|e| e.to_string()),
        None => Err(format!("Connection '{}' not found", connection_id)),
    }
}

#[tauri::command]
async fn role_add(
    state: State<'_, AppState>,
    connection_id: String,
    name: String,
) -> Result<(), String> {
    let mut connections = state.connections.lock().await;
    match connections.get_mut(&connection_id) {
        Some(client) => client.role_add(&name).await.map_err(|e| e.to_string()),
        None => Err(format!("Connection '{}' not found", connection_id)),
    }
}

#[tauri::command]
async fn role_delete(
    state: State<'_, AppState>,
    connection_id: String,
    name: String,
) -> Result<(), String> {
    let mut connections = state.connections.lock().await;
    match connections.get_mut(&connection_id) {
        Some(client) => client.role_delete(&name).await.map_err(|e| e.to_string()),
        None => Err(format!("Connection '{}' not found", connection_id)),
    }
}

#[tauri::command]
async fn role_get_permissions(
    state: State<'_, AppState>,
    connection_id: String,
    role: String,
) -> Result<EtcdRolePermissions, String> {
    let mut connections = state.connections.lock().await;
    match connections.get_mut(&connection_id) {
        Some(client) => client
            .role_get_permissions(&role)
            .await
            .map_err(|e| e.to_string()),
        None => Err(format!("Connection '{}' not found", connection_id)),
    }
}

#[tauri::command]
async fn role_grant_permission(
    state: State<'_, AppState>,
    connection_id: String,
    role: String,
    perm_type: String,
    key: String,
    range_end: Option<String>,
) -> Result<(), String> {
    let mut connections = state.connections.lock().await;
    match connections.get_mut(&connection_id) {
        Some(client) => client
            .role_grant_permission(&role, &perm_type, &key, range_end.as_deref())
            .await
            .map_err(|e| e.to_string()),
        None => Err(format!("Connection '{}' not found", connection_id)),
    }
}

#[tauri::command]
async fn role_revoke_permission(
    state: State<'_, AppState>,
    connection_id: String,
    role: String,
    key: String,
    range_end: Option<String>,
) -> Result<(), String> {
    let mut connections = state.connections.lock().await;
    match connections.get_mut(&connection_id) {
        Some(client) => client
            .role_revoke_permission(&role, &key, range_end.as_deref())
            .await
            .map_err(|e| e.to_string()),
        None => Err(format!("Connection '{}' not found", connection_id)),
    }
}

fn main() {
    #[cfg(target_os = "linux")]
    {
        // Fix for WebKitGTK GPU rendering failures on Linux (Wayland, NVIDIA, VMs).
        // WEBKIT_DISABLE_DMABUF_RENDERER: Fixes blank screens / EGL errors.
        // See: https://github.com/tauri-apps/tauri/issues/9394
        // WEBKIT_DISABLE_COMPOSITING_MODE: Fixes "Failed to create GBM buffer" crashes.
        // See: https://github.com/tauri-apps/tauri/issues/11994
        // SAFETY: Called before any threads are spawned (Tauri hasn't started yet).
        if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
            unsafe { std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1") };
        }
        if std::env::var_os("WEBKIT_DISABLE_COMPOSITING_MODE").is_none() {
            unsafe { std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1") };
        }
    }

    let show = CustomMenuItem::new("show".to_string(), "Show");
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");

    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);

    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .manage(AppState::new())
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick {
                position: _,
                size: _,
                ..
            } => {
                if let Some(window) = app.get_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "show" => {
                    if let Some(window) = app.get_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            },
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            connect_etcd,
            disconnect_etcd,
            test_connection,
            list_connections,
            get_all_keys,
            get_key,
            put_key,
            delete_key,
            delete_keys,
            get_keys_with_prefix,
            get_saved_connection,
            save_connection,
            get_connection_history,
            remove_from_history,
            pick_certificate_file,
            watch_key,
            unwatch_key,
            list_active_watches,
            lease_grant,
            lease_revoke,
            lease_keepalive,
            lease_time_to_live,
            lease_list,
            cluster_status,
            snapshot_save,
            auth_status,
            auth_enable,
            auth_disable,
            user_list,
            user_add,
            user_delete,
            user_grant_role,
            user_revoke_role,
            role_list,
            role_add,
            role_delete,
            role_get_permissions,
            role_grant_permission,
            role_revoke_permission,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
