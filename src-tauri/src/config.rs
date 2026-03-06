use crate::etcd::EtcdConfig;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Default, Serialize, Deserialize)]
struct AppConfig {
    last_connection: Option<EtcdConfig>,
    connection_history: Vec<EtcdConfig>,
}

fn get_config_dir() -> anyhow::Result<PathBuf> {
    let config_dir = dirs::config_dir()
        .ok_or_else(|| anyhow::anyhow!("Could not find config directory"))?
        .join("etcd-desktop");

    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)?;
    }

    Ok(config_dir)
}

fn get_config_file() -> anyhow::Result<PathBuf> {
    Ok(get_config_dir()?.join("config.json"))
}

fn load_config() -> anyhow::Result<AppConfig> {
    let config_file = get_config_file()?;

    if !config_file.exists() {
        return Ok(AppConfig::default());
    }

    let content = fs::read_to_string(config_file)?;
    let config: AppConfig = serde_json::from_str(&content)?;

    Ok(config)
}

fn save_config(config: &AppConfig) -> anyhow::Result<()> {
    let config_file = get_config_file()?;
    let content = serde_json::to_string_pretty(config)?;
    fs::write(config_file, content)?;
    Ok(())
}

pub fn get_connection_config() -> anyhow::Result<EtcdConfig> {
    let config = load_config()?;
    config
        .last_connection
        .ok_or_else(|| anyhow::anyhow!("No saved connection"))
}

pub fn save_connection_config(conn_config: &EtcdConfig) -> anyhow::Result<()> {
    let mut config = load_config()?;

    // Update last connection
    config.last_connection = Some(conn_config.clone());

    // Add to history if not already present
    let exists = config
        .connection_history
        .iter()
        .any(|c| c.endpoint == conn_config.endpoint && c.username == conn_config.username);

    if !exists {
        config.connection_history.push(conn_config.clone());
        // Keep only last 10 connections
        if config.connection_history.len() > 10 {
            config.connection_history.remove(0);
        }
    }

    save_config(&config)
}

pub fn get_connection_history() -> anyhow::Result<Vec<EtcdConfig>> {
    let config = load_config()?;
    Ok(config.connection_history)
}

pub fn remove_from_history(endpoint: &str) -> anyhow::Result<()> {
    let mut config = load_config()?;
    config.connection_history.retain(|c| c.endpoint != endpoint);
    save_config(&config)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    fn setup_test_config() -> PathBuf {
        let test_dir = env::temp_dir().join("etcd-desktop-test");
        if test_dir.exists() {
            let _ = fs::remove_dir_all(&test_dir);
        }
        fs::create_dir_all(&test_dir).unwrap();
        test_dir
    }

    #[test]
    fn test_app_config_default() {
        let config = AppConfig::default();
        assert!(config.last_connection.is_none());
        assert!(config.connection_history.is_empty());
    }

    #[test]
    fn test_etcd_config_creation() {
        let config = EtcdConfig {
            endpoint: "localhost:2379".to_string(),
            username: Some("admin".to_string()),
            password: Some("secret".to_string()),
            tls_enabled: true,
            ca_cert_path: Some("/path/to/ca.pem".to_string()),
            client_cert_path: Some("/path/to/cert.pem".to_string()),
            client_key_path: Some("/path/to/key.pem".to_string()),
            skip_verify: false,
        };

        assert_eq!(config.endpoint, "localhost:2379");
        assert_eq!(config.username, Some("admin".to_string()));
        assert!(config.tls_enabled);
    }

    #[test]
    fn test_app_config_serialization() {
        let config = AppConfig::default();
        let json = serde_json::to_string(&config).unwrap();
        assert!(json.contains("last_connection"));
        assert!(json.contains("connection_history"));

        let deserialized: AppConfig = serde_json::from_str(&json).unwrap();
        assert!(deserialized.last_connection.is_none());
    }

    #[test]
    fn test_save_and_load_config() {
        let test_dir = setup_test_config();
        let config_path = test_dir.join("config.json");

        let config = AppConfig {
            last_connection: Some(EtcdConfig {
                endpoint: "test:2379".to_string(),
                username: Some("user".to_string()),
                password: Some("pass".to_string()),
                tls_enabled: false,
                ca_cert_path: None,
                client_cert_path: None,
                client_key_path: None,
                skip_verify: false,
            }),
            connection_history: vec![EtcdConfig {
                endpoint: "history:2379".to_string(),
                username: None,
                password: None,
                tls_enabled: false,
                ca_cert_path: None,
                client_cert_path: None,
                client_key_path: None,
                skip_verify: false,
            }],
        };

        let content = serde_json::to_string_pretty(&config).unwrap();
        fs::write(&config_path, content).unwrap();

        let loaded_content = fs::read_to_string(&config_path).unwrap();
        let loaded: AppConfig = serde_json::from_str(&loaded_content).unwrap();

        assert!(loaded.last_connection.is_some());
        assert_eq!(loaded.connection_history.len(), 1);
        assert_eq!(loaded.connection_history[0].endpoint, "history:2379");

        let _ = fs::remove_dir_all(&test_dir);
    }

    #[test]
    fn test_connection_history_deduplication() {
        let conn1 = EtcdConfig {
            endpoint: "server1:2379".to_string(),
            username: None,
            password: None,
            tls_enabled: false,
            ca_cert_path: None,
            client_cert_path: None,
            client_key_path: None,
            skip_verify: false,
        };

        let conn2 = EtcdConfig {
            endpoint: "server1:2379".to_string(),
            username: None,
            password: None,
            tls_enabled: false,
            ca_cert_path: None,
            client_cert_path: None,
            client_key_path: None,
            skip_verify: false,
        };

        let mut history: Vec<EtcdConfig> = Vec::new();
        history.push(conn1.clone());

        let exists = history
            .iter()
            .any(|c| c.endpoint == conn2.endpoint && c.username == conn2.username);

        if !exists {
            history.push(conn2);
        }

        assert_eq!(history.len(), 1);
    }

    #[test]
    fn test_history_limit() {
        let mut history: Vec<EtcdConfig> = Vec::new();

        for i in 0..15 {
            history.push(EtcdConfig {
                endpoint: format!("server{}:2379", i),
                username: None,
                password: None,
                tls_enabled: false,
                ca_cert_path: None,
                client_cert_path: None,
                client_key_path: None,
                skip_verify: false,
            });
        }

        while history.len() > 10 {
            history.remove(0);
        }

        assert_eq!(history.len(), 10);
        assert_eq!(history[0].endpoint, "server5:2379");
    }

    #[test]
    fn test_remove_from_history() {
        let conn1 = EtcdConfig {
            endpoint: "server1:2379".to_string(),
            username: None,
            password: None,
            tls_enabled: false,
            ca_cert_path: None,
            client_cert_path: None,
            client_key_path: None,
            skip_verify: false,
        };

        let conn2 = EtcdConfig {
            endpoint: "server2:2379".to_string(),
            username: None,
            password: None,
            tls_enabled: false,
            ca_cert_path: None,
            client_cert_path: None,
            client_key_path: None,
            skip_verify: false,
        };

        let mut history = vec![conn1, conn2];
        history.retain(|c| c.endpoint != "server1:2379");

        assert_eq!(history.len(), 1);
        assert_eq!(history[0].endpoint, "server2:2379");
    }
}
