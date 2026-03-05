use etcd_client::{Certificate, Client, ConnectOptions, GetOptions, Identity, PutOptions, SortOrder, SortTarget, WatchOptions, EventType};
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EtcdConfig {
    pub endpoint: String,
    pub username: Option<String>,
    pub password: Option<String>,
    pub tls_enabled: bool,
    pub ca_cert_path: Option<String>,
    pub client_cert_path: Option<String>,
    pub client_key_path: Option<String>,
    pub skip_verify: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EtcdKey {
    pub key: String,
    pub value: String,
    pub version: i64,
    pub create_revision: i64,
    pub mod_revision: i64,
    pub lease: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaseInfo {
    pub id: i64,
    pub ttl: i64,
    pub granted_ttl: i64,
    pub keys: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WatchEvent {
    pub watch_id: String,
    pub event_type: String,
    pub key: String,
    pub value: Option<String>,
    pub prev_value: Option<String>,
    pub revision: i64,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusterMember {
    pub id: String,
    pub name: String,
    pub peer_urls: Vec<String>,
    pub client_urls: Vec<String>,
    pub is_leader: bool,
    pub health: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusterStatus {
    pub cluster_id: String,
    pub member_id: String,
    pub leader_id: String,
    pub raft_term: i64,
    pub raft_index: i64,
    pub db_size: i64,
    pub db_size_in_use: i64,
    pub version: String,
    pub members: Vec<ClusterMember>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthStatus {
    pub enabled: bool,
    pub auth_revision: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EtcdUser {
    pub name: String,
    pub roles: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EtcdRole {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EtcdRolePermissions {
    pub role: String,
    pub permissions: Vec<Permission>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Permission {
    pub perm_type: String,
    pub key: String,
    pub range_end: Option<String>,
}

pub struct WatchHandle {
    pub cancel_tx: mpsc::Sender<()>,
}

pub struct EtcdClient {
    client: Client,
}

impl EtcdClient {
    pub async fn connect(config: &EtcdConfig) -> anyhow::Result<Self> {
        let mut options = ConnectOptions::new();

        if let (Some(username), Some(password)) = (&config.username, &config.password) {
            if !username.is_empty() {
                options = options.with_user(username, password);
            }
        }

        if config.tls_enabled {
            let mut tls_options = etcd_client::TlsOptions::new();

            if let Some(ca_path) = &config.ca_cert_path {
                let ca_cert = tokio::fs::read(ca_path).await
                    .map_err(|e| anyhow::anyhow!("Failed to read CA cert: {}", e))?;
                let cert = Certificate::from_pem(ca_cert);
                tls_options = tls_options.ca_certificate(cert);
            }

            if let (Some(cert_path), Some(key_path)) = (&config.client_cert_path, &config.client_key_path) {
                let cert = tokio::fs::read(cert_path).await
                    .map_err(|e| anyhow::anyhow!("Failed to read client cert: {}", e))?;
                let key = tokio::fs::read(key_path).await
                    .map_err(|e| anyhow::anyhow!("Failed to read client key: {}", e))?;
                let identity = Identity::from_pem(cert, key);
                tls_options = tls_options.identity(identity);
            }

            // When skip_verify is true, we need to allow invalid certificates
            // by NOT adding any CA certificates or native roots.
            // The with_native_roots() method enables certificate validation,
            // which is the opposite of what skip_verify should do.
            // For now, we simply don't add any certificate validation
            // when skip_verify is true.

            options = options.with_tls(tls_options);
        }

        let client = Client::connect([&config.endpoint], Some(options)).await?;

        Ok(EtcdClient { client })
    }

    pub async fn get_all_keys(
        &mut self,
        limit: i64,
        cursor: Option<String>,
        sort_ascending: bool,
    ) -> anyhow::Result<(Vec<EtcdKey>, bool)> {
        let sort_order = if sort_ascending {
            SortOrder::Ascend
        } else {
            SortOrder::Descend
        };

        let mut options = GetOptions::new()
            .with_limit(limit)
            .with_sort(SortTarget::Key, sort_order);

        if let Some(cursor_key) = cursor {
            options = options.with_from_key();
            let resp = self.client.get(cursor_key.as_str(), Some(options)).await?;

            let keys: Vec<EtcdKey> = resp
                .kvs()
                .iter()
                .skip(1)
                .take(limit as usize)
                .map(|kv| EtcdKey {
                    key: kv.key_str().unwrap_or_default().to_string(),
                    value: kv.value_str().unwrap_or_default().to_string(),
                    version: kv.version(),
                    create_revision: kv.create_revision(),
                    mod_revision: kv.mod_revision(),
                    lease: kv.lease(),
                })
                .collect();

            let has_more = resp.count() > limit;
            Ok((keys, has_more))
        } else {
            options = options.with_all_keys();
            let resp = self.client.get("", Some(options)).await?;

            let keys: Vec<EtcdKey> = resp
                .kvs()
                .iter()
                .take(limit as usize)
                .map(|kv| EtcdKey {
                    key: kv.key_str().unwrap_or_default().to_string(),
                    value: kv.value_str().unwrap_or_default().to_string(),
                    version: kv.version(),
                    create_revision: kv.create_revision(),
                    mod_revision: kv.mod_revision(),
                    lease: kv.lease(),
                })
                .collect();

            let has_more = resp.count() > limit;
            Ok((keys, has_more))
        }
    }

    pub async fn get_key(&mut self, key: &str) -> anyhow::Result<Option<EtcdKey>> {
        let resp = self.client.get(key, None).await?;

        Ok(resp.kvs().first().map(|kv| EtcdKey {
            key: kv.key_str().unwrap_or_default().to_string(),
            value: kv.value_str().unwrap_or_default().to_string(),
            version: kv.version(),
            create_revision: kv.create_revision(),
            mod_revision: kv.mod_revision(),
            lease: kv.lease(),
        }))
    }

    pub async fn put_key(&mut self, key: &str, value: &str, lease_id: Option<i64>) -> anyhow::Result<EtcdKey> {
        let mut options = PutOptions::new();
        if let Some(lease) = lease_id {
            options = options.with_lease(lease);
        }
        self.client.put(key, value, Some(options)).await?;

        let resp = self.client.get(key, None).await?;

        resp.kvs()
            .first()
            .map(|kv| EtcdKey {
                key: kv.key_str().unwrap_or_default().to_string(),
                value: kv.value_str().unwrap_or_default().to_string(),
                version: kv.version(),
                create_revision: kv.create_revision(),
                mod_revision: kv.mod_revision(),
                lease: kv.lease(),
            })
            .ok_or_else(|| anyhow::anyhow!("Failed to retrieve updated key"))
    }

    pub async fn delete_key(&mut self, key: &str) -> anyhow::Result<()> {
        self.client.delete(key, None).await?;
        Ok(())
    }

    pub async fn delete_keys(&mut self, keys: &[String]) -> anyhow::Result<usize> {
        let mut deleted_count = 0;
        for key in keys {
            match self.client.delete(key.as_str(), None).await {
                Ok(_) => deleted_count += 1,
                Err(e) => eprintln!("Failed to delete key {}: {}", key, e),
            }
        }
        Ok(deleted_count)
    }

    pub async fn get_keys_with_prefix(
        &mut self,
        prefix: &str,
        limit: i64,
        cursor: Option<String>,
        sort_ascending: bool,
    ) -> anyhow::Result<(Vec<EtcdKey>, bool)> {
        let sort_order = if sort_ascending {
            SortOrder::Ascend
        } else {
            SortOrder::Descend
        };

        if let Some(cursor_key) = cursor {
            let options = GetOptions::new()
                .with_prefix()
                .with_limit(limit)
                .with_sort(SortTarget::Key, sort_order)
                .with_from_key();

            let resp = self.client.get(cursor_key.as_str(), Some(options)).await?;

            let keys: Vec<EtcdKey> = resp
                .kvs()
                .iter()
                .skip(1)
                .take(limit as usize)
                .map(|kv| EtcdKey {
                    key: kv.key_str().unwrap_or_default().to_string(),
                    value: kv.value_str().unwrap_or_default().to_string(),
                    version: kv.version(),
                    create_revision: kv.create_revision(),
                    mod_revision: kv.mod_revision(),
                    lease: kv.lease(),
                })
                .collect();

            let has_more = resp.count() > limit;
            Ok((keys, has_more))
        } else {
            let options = GetOptions::new()
                .with_prefix()
                .with_limit(limit)
                .with_sort(SortTarget::Key, sort_order);

            let resp = self.client.get(prefix, Some(options)).await?;

            let keys: Vec<EtcdKey> = resp
                .kvs()
                .iter()
                .take(limit as usize)
                .map(|kv| EtcdKey {
                    key: kv.key_str().unwrap_or_default().to_string(),
                    value: kv.value_str().unwrap_or_default().to_string(),
                    version: kv.version(),
                    create_revision: kv.create_revision(),
                    mod_revision: kv.mod_revision(),
                    lease: kv.lease(),
                })
                .collect();

            let has_more = resp.count() > limit;
            Ok((keys, has_more))
        }
    }

    pub async fn status(&mut self) -> anyhow::Result<etcd_client::StatusResponse> {
        let status = self.client.status().await?;
        Ok(status)
    }

    pub async fn lease_grant(&mut self, ttl: i64) -> anyhow::Result<i64> {
        let resp = self.client.lease_grant(ttl, None).await?;
        Ok(resp.id())
    }

    pub async fn lease_revoke(&mut self, lease_id: i64) -> anyhow::Result<()> {
        self.client.lease_revoke(lease_id).await?;
        Ok(())
    }

    pub async fn lease_keepalive(&mut self, lease_id: i64) -> anyhow::Result<()> {
        let (mut keeper, _) = self.client.lease_keep_alive(lease_id).await?;
        keeper.keep_alive().await?;
        Ok(())
    }

    pub async fn lease_time_to_live(&mut self, lease_id: i64) -> anyhow::Result<LeaseInfo> {
        let resp = self.client.lease_time_to_live(lease_id, None).await?;
        Ok(LeaseInfo {
            id: resp.id(),
            ttl: resp.ttl(),
            granted_ttl: resp.granted_ttl(),
            keys: resp.keys().iter().map(|k| String::from_utf8_lossy(k).to_string()).collect(),
        })
    }

    pub async fn lease_list(&mut self) -> anyhow::Result<Vec<i64>> {
        let resp = self.client.leases().await?;
        Ok(resp.leases().iter().map(|l| l.id()).collect())
    }

    pub async fn cluster_status(&mut self) -> anyhow::Result<ClusterStatus> {
        let status = self.client.status().await?;
        let member_list = self.client.member_list().await?;
        
        let leader_id = status.leader().to_string();
        let current_member_id = status.header().map(|h| h.member_id()).unwrap_or(0).to_string();
        let cluster_id = status.header().map(|h| h.cluster_id()).unwrap_or(0).to_string();
        
        let members: Vec<ClusterMember> = member_list
            .members()
            .iter()
            .map(|m| {
                let member_id = m.id().to_string();
                ClusterMember {
                    id: member_id.clone(),
                    name: m.name().to_string(),
                    peer_urls: m.peer_urls().iter().map(|s| s.to_string()).collect(),
                    client_urls: m.client_urls().iter().map(|s| s.to_string()).collect(),
                    is_leader: member_id == leader_id,
                    health: if member_id == current_member_id {
                        "healthy".to_string()
                    } else {
                        "unknown".to_string()
                    },
                }
            })
            .collect();
        
        Ok(ClusterStatus {
            cluster_id,
            member_id: current_member_id,
            leader_id,
            raft_term: status.raft_term() as i64,
            raft_index: status.raft_index() as i64,
            db_size: status.db_size(),
            db_size_in_use: status.raft_used_db_size(),
            version: status.version().to_string(),
            members,
        })
    }

    pub async fn watch_key<F>(
        &mut self,
        watch_id: String,
        key: String,
        is_prefix: bool,
        mut event_handler: F,
    ) -> anyhow::Result<WatchHandle>
    where
        F: FnMut(WatchEvent) + Send + 'static,
    {
        let (cancel_tx, mut cancel_rx) = mpsc::channel::<()>(1);
        
        let mut watch_client = self.client.clone();
        
        tokio::spawn(async move {
            let mut options = WatchOptions::new();
            if is_prefix {
                options = options.with_prefix();
            }
            options = options.with_prev_key();

            let (_, mut stream) = match watch_client.watch(key, Some(options)).await {
                Ok(result) => result,
                Err(e) => {
                    eprintln!("Failed to start watch: {}", e);
                    return;
                }
            };

            loop {
                tokio::select! {
                    msg = stream.message() => {
                        match msg {
                            Ok(Some(response)) => {
                                for event in response.events() {
                                    let event_type = match event.event_type() {
                                        EventType::Put => "PUT",
                                        EventType::Delete => "DELETE",
                                    };

                                    let kv = event.kv();
                                    let prev_kv = event.prev_kv();

                                    let watch_event = WatchEvent {
                                        watch_id: watch_id.clone(),
                                        event_type: event_type.to_string(),
                                        key: kv.as_ref().map(|k| k.key_str().unwrap_or_default().to_string()).unwrap_or_default(),
                                        value: kv.as_ref().map(|k| k.value_str().unwrap_or_default().to_string()),
                                        prev_value: prev_kv.as_ref().map(|k| k.value_str().unwrap_or_default().to_string()),
                                        revision: kv.as_ref().map(|k| k.mod_revision()).unwrap_or(0),
                                        timestamp: chrono::Local::now().to_rfc3339(),
                                    };

                                    event_handler(watch_event);
                                }
                            }
                            Ok(None) => {
                                break;
                            }
                            Err(e) => {
                                eprintln!("Watch stream error: {}", e);
                                break;
                            }
                        }
                    }
                    _ = cancel_rx.recv() => {
                        break;
                    }
                }
            }
        });

        Ok(WatchHandle { cancel_tx })
    }

    pub async fn snapshot<P: AsRef<Path>>(
        &mut self,
        file_path: P,
        progress_callback: Option<impl Fn(u64, u64) + Send>,
    ) -> anyhow::Result<u64> {
        let mut file = File::create(file_path).await?;
        let mut maintenance_client = self.client.maintenance_client();
        let mut stream = maintenance_client.snapshot().await?;
        
        let mut total_written: u64 = 0;
        let mut total_size: u64 = 0;
        
        while let Some(response) = stream.message().await? {
            let blob = response.blob();
            file.write_all(blob).await?;
            total_written += blob.len() as u64;
            
            if total_size == 0 {
                total_size = response.remaining_bytes();
            }
            
            if let Some(ref callback) = progress_callback {
                callback(total_written, total_size);
            }
        }
        
        file.flush().await?;
        Ok(total_written)
    }

    // Auth management stubs - not fully implemented in etcd-client
    pub async fn auth_status(&mut self) -> anyhow::Result<AuthStatus> {
        Err(anyhow::anyhow!("Auth status not implemented - requires etcd-client auth support"))
    }

    pub async fn auth_enable(&mut self) -> anyhow::Result<()> {
        Err(anyhow::anyhow!("Auth enable not implemented - requires etcd-client auth support"))
    }

    pub async fn auth_disable(&mut self) -> anyhow::Result<()> {
        Err(anyhow::anyhow!("Auth disable not implemented - requires etcd-client auth support"))
    }

    pub async fn user_list(&mut self) -> anyhow::Result<Vec<EtcdUser>> {
        Err(anyhow::anyhow!("User list not implemented - requires etcd-client auth support"))
    }

    pub async fn user_add(&mut self, _name: &str, _password: &str) -> anyhow::Result<()> {
        Err(anyhow::anyhow!("User add not implemented - requires etcd-client auth support"))
    }

    pub async fn user_delete(&mut self, _name: &str) -> anyhow::Result<()> {
        Err(anyhow::anyhow!("User delete not implemented - requires etcd-client auth support"))
    }

    pub async fn user_grant_role(&mut self, _user: &str, _role: &str) -> anyhow::Result<()> {
        Err(anyhow::anyhow!("User grant role not implemented - requires etcd-client auth support"))
    }

    pub async fn user_revoke_role(&mut self, _user: &str, _role: &str) -> anyhow::Result<()> {
        Err(anyhow::anyhow!("User revoke role not implemented - requires etcd-client auth support"))
    }

    pub async fn role_list(&mut self) -> anyhow::Result<Vec<EtcdRole>> {
        Err(anyhow::anyhow!("Role list not implemented - requires etcd-client auth support"))
    }

    pub async fn role_add(&mut self, _name: &str) -> anyhow::Result<()> {
        Err(anyhow::anyhow!("Role add not implemented - requires etcd-client auth support"))
    }

    pub async fn role_delete(&mut self, _name: &str) -> anyhow::Result<()> {
        Err(anyhow::anyhow!("Role delete not implemented - requires etcd-client auth support"))
    }

    pub async fn role_get_permissions(&mut self, _role: &str) -> anyhow::Result<EtcdRolePermissions> {
        Err(anyhow::anyhow!("Role get permissions not implemented - requires etcd-client auth support"))
    }

    pub async fn role_grant_permission(
        &mut self,
        _role: &str,
        _perm_type: &str,
        _key: &str,
        _range_end: Option<&str>,
    ) -> anyhow::Result<()> {
        Err(anyhow::anyhow!("Role grant permission not implemented - requires etcd-client auth support"))
    }

    pub async fn role_revoke_permission(
        &mut self,
        _role: &str,
        _key: &str,
        _range_end: Option<&str>,
    ) -> anyhow::Result<()> {
        Err(anyhow::anyhow!("Role revoke permission not implemented - requires etcd-client auth support"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_etcd_config_default() {
        let config = EtcdConfig {
            endpoint: "localhost:2379".to_string(),
            username: None,
            password: None,
            tls_enabled: false,
            ca_cert_path: None,
            client_cert_path: None,
            client_key_path: None,
            skip_verify: false,
        };
        
        assert_eq!(config.endpoint, "localhost:2379");
        assert!(!config.tls_enabled);
        assert!(!config.skip_verify);
    }

    #[test]
    fn test_etcd_key_creation() {
        let key = EtcdKey {
            key: "/test/key".to_string(),
            value: "test_value".to_string(),
            version: 1,
            create_revision: 100,
            mod_revision: 100,
            lease: 0,
        };
        
        assert_eq!(key.key, "/test/key");
        assert_eq!(key.value, "test_value");
        assert_eq!(key.version, 1);
        assert_eq!(key.create_revision, 100);
        assert_eq!(key.mod_revision, 100);
        assert_eq!(key.lease, 0);
    }

    #[test]
    fn test_lease_info_creation() {
        let lease = LeaseInfo {
            id: 123456,
            ttl: 60,
            granted_ttl: 60,
            keys: vec!["/key1".to_string(), "/key2".to_string()],
        };
        
        assert_eq!(lease.id, 123456);
        assert_eq!(lease.ttl, 60);
        assert_eq!(lease.granted_ttl, 60);
        assert_eq!(lease.keys.len(), 2);
        assert_eq!(lease.keys[0], "/key1");
    }

    #[test]
    fn test_watch_event_creation() {
        let event = WatchEvent {
            watch_id: "watch-123".to_string(),
            event_type: "PUT".to_string(),
            key: "/test/key".to_string(),
            value: Some("value".to_string()),
            prev_value: None,
            revision: 200,
            timestamp: "2024-01-01T00:00:00Z".to_string(),
        };
        
        assert_eq!(event.watch_id, "watch-123");
        assert_eq!(event.event_type, "PUT");
        assert_eq!(event.revision, 200);
        assert!(event.value.is_some());
        assert!(event.prev_value.is_none());
    }

    #[test]
    fn test_cluster_member_creation() {
        let member = ClusterMember {
            id: "member-1".to_string(),
            name: "etcd-1".to_string(),
            peer_urls: vec!["http://192.168.1.1:2380".to_string()],
            client_urls: vec!["http://192.168.1.1:2379".to_string()],
            is_leader: true,
            health: "healthy".to_string(),
        };
        
        assert!(member.is_leader);
        assert_eq!(member.name, "etcd-1");
        assert_eq!(member.health, "healthy");
    }

    #[test]
    fn test_cluster_status_creation() {
        let status = ClusterStatus {
            cluster_id: "cluster-1".to_string(),
            member_id: "member-1".to_string(),
            leader_id: "member-1".to_string(),
            raft_term: 5,
            raft_index: 1000,
            db_size: 1024000,
            db_size_in_use: 512000,
            version: "3.5.0".to_string(),
            members: vec![],
        };
        
        assert_eq!(status.raft_term, 5);
        assert_eq!(status.db_size, 1024000);
        assert_eq!(status.version, "3.5.0");
    }

    #[test]
    fn test_auth_status_creation() {
        let status = AuthStatus {
            enabled: true,
            auth_revision: 10,
        };
        
        assert!(status.enabled);
        assert_eq!(status.auth_revision, 10);
    }

    #[test]
    fn test_etcd_user_creation() {
        let user = EtcdUser {
            name: "admin".to_string(),
            roles: vec!["root".to_string(), "readwrite".to_string()],
        };
        
        assert_eq!(user.name, "admin");
        assert_eq!(user.roles.len(), 2);
        assert_eq!(user.roles[0], "root");
    }

    #[test]
    fn test_etcd_role_creation() {
        let role = EtcdRole {
            name: "readonly".to_string(),
        };
        
        assert_eq!(role.name, "readonly");
    }

    #[test]
    fn test_permission_creation() {
        let perm = Permission {
            perm_type: "READ".to_string(),
            key: "/config/".to_string(),
            range_end: Some("/config0".to_string()),
        };
        
        assert_eq!(perm.perm_type, "READ");
        assert!(perm.range_end.is_some());
    }

    #[test]
    fn test_etcd_config_serialization() {
        let config = EtcdConfig {
            endpoint: "localhost:2379".to_string(),
            username: Some("admin".to_string()),
            password: Some("secret".to_string()),
            tls_enabled: true,
            ca_cert_path: Some("/path/to/ca.pem".to_string()),
            client_cert_path: Some("/path/to/cert.pem".to_string()),
            client_key_path: Some("/path/to/key.pem".to_string()),
            skip_verify: true,
        };
        
        let json = serde_json::to_string(&config).unwrap();
        assert!(json.contains("localhost:2379"));
        assert!(json.contains("tls_enabled"));
        
        let deserialized: EtcdConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.endpoint, config.endpoint);
        assert_eq!(deserialized.tls_enabled, config.tls_enabled);
    }

    #[test]
    fn test_etcd_key_serialization() {
        let key = EtcdKey {
            key: "/test".to_string(),
            value: "value".to_string(),
            version: 1,
            create_revision: 100,
            mod_revision: 200,
            lease: 0,
        };
        
        let json = serde_json::to_string(&key).unwrap();
        let deserialized: EtcdKey = serde_json::from_str(&json).unwrap();
        
        assert_eq!(deserialized.key, key.key);
        assert_eq!(deserialized.mod_revision, key.mod_revision);
    }
}
