#[cfg(test)]
mod integration_tests {
    use crate::etcd::{EtcdClient, EtcdConfig};
    use crate::test_helpers::test_helpers::{start_etcd_container, stop_etcd_container};
    use serial_test::serial;

    fn make_config(connection_string: &str) -> EtcdConfig {
        let endpoint = connection_string
            .strip_prefix("http://")
            .unwrap_or(connection_string)
            .to_string();
        EtcdConfig {
            endpoint,
            username: None,
            password: None,
            tls_enabled: false,
            ca_cert_path: None,
            client_cert_path: None,
            client_key_path: None,
            skip_verify: false,
        }
    }

    #[tokio::test]
    #[serial]
    async fn test_connect_to_etcd() {
        let etcd = start_etcd_container()
            .await
            .expect("Failed to start etcd container");

        let config = make_config(&etcd.connection_string);
        let result = EtcdClient::connect(&config).await;
        assert!(result.is_ok(), "Expected to connect successfully");

        let mut client = result.unwrap();
        let status = client.status().await;
        assert!(
            status.is_ok(),
            "Expected status call to succeed: {:?}",
            status
        );

        stop_etcd_container(etcd.container)
            .await
            .expect("Failed to stop etcd container");
    }

    #[tokio::test]
    #[serial]
    async fn test_put_and_get_key() {
        let etcd = start_etcd_container()
            .await
            .expect("Failed to start etcd container");

        let config = make_config(&etcd.connection_string);
        let mut client = EtcdClient::connect(&config)
            .await
            .expect("Failed to connect to etcd");

        let key = "/test/key1";
        let value = "hello_world";

        let put_result = client.put_key(key, value, None).await;
        assert!(
            put_result.is_ok(),
            "Expected put to succeed: {:?}",
            put_result
        );

        let get_result = client.get_key(key).await;
        assert!(
            get_result.is_ok(),
            "Expected get to succeed: {:?}",
            get_result
        );

        let fetched = get_result.unwrap();
        assert!(fetched.is_some(), "Expected key to exist after put");
        assert_eq!(fetched.unwrap().value, value);

        stop_etcd_container(etcd.container)
            .await
            .expect("Failed to stop etcd container");
    }

    #[tokio::test]
    #[serial]
    async fn test_delete_key() {
        let etcd = start_etcd_container()
            .await
            .expect("Failed to start etcd container");

        let config = make_config(&etcd.connection_string);
        let mut client = EtcdClient::connect(&config)
            .await
            .expect("Failed to connect to etcd");

        let key = "/test/delete_me";

        client
            .put_key(key, "temp_value", None)
            .await
            .expect("Failed to put key");

        let delete_result = client.delete_key(key).await;
        assert!(
            delete_result.is_ok(),
            "Expected delete to succeed: {:?}",
            delete_result
        );

        let get_result = client.get_key(key).await;
        assert!(
            get_result.is_ok(),
            "Expected get to succeed after delete: {:?}",
            get_result
        );
        assert!(
            get_result.unwrap().is_none(),
            "Expected key to be gone after delete"
        );

        stop_etcd_container(etcd.container)
            .await
            .expect("Failed to stop etcd container");
    }

    #[tokio::test]
    #[serial]
    async fn test_get_all_keys() {
        let etcd = start_etcd_container()
            .await
            .expect("Failed to start etcd container");

        let config = make_config(&etcd.connection_string);
        let mut client = EtcdClient::connect(&config)
            .await
            .expect("Failed to connect to etcd");

        for i in 0..5 {
            client
                .put_key(
                    &format!("/test/all_keys/{}", i),
                    &format!("value_{}", i),
                    None,
                )
                .await
                .expect("Failed to put key");
        }

        let (keys, has_more) = client
            .get_all_keys(100, None, true, None, None)
            .await
            .expect("Failed to get all keys");

        assert!(
            keys.len() >= 5,
            "Expected at least 5 keys, got {}",
            keys.len()
        );
        assert!(!has_more, "Expected no more pages with limit 100");

        stop_etcd_container(etcd.container)
            .await
            .expect("Failed to stop etcd container");
    }

    #[tokio::test]
    #[serial]
    async fn test_prefix_search() {
        let etcd = start_etcd_container()
            .await
            .expect("Failed to start etcd container");

        let config = make_config(&etcd.connection_string);
        let mut client = EtcdClient::connect(&config)
            .await
            .expect("Failed to connect to etcd");

        client
            .put_key("/prefix/app/key1", "val1", None)
            .await
            .expect("Failed to put key");
        client
            .put_key("/prefix/app/key2", "val2", None)
            .await
            .expect("Failed to put key");
        client
            .put_key("/prefix/other/key3", "val3", None)
            .await
            .expect("Failed to put key");

        let (keys, has_more) = client
            .get_keys_with_prefix("/prefix/app/", 100, None, true)
            .await
            .expect("Failed to search by prefix");

        assert_eq!(keys.len(), 2, "Expected 2 keys matching prefix");
        assert!(
            keys.iter()
                .any(|k| k.key == "/prefix/app/key1" && k.value == "val1"),
            "Expected /prefix/app/key1"
        );
        assert!(
            keys.iter()
                .any(|k| k.key == "/prefix/app/key2" && k.value == "val2"),
            "Expected /prefix/app/key2"
        );
        assert!(!has_more, "Expected no more pages with limit 100");

        stop_etcd_container(etcd.container)
            .await
            .expect("Failed to stop etcd container");
    }

    #[tokio::test]
    #[serial]
    async fn test_auth_status_disabled_by_default() {
        let etcd = start_etcd_container()
            .await
            .expect("Failed to start etcd container");

        let config = make_config(&etcd.connection_string);
        let mut client = EtcdClient::connect(&config)
            .await
            .expect("Failed to connect to etcd");

        let status = client.auth_status().await;
        assert!(
            status.is_ok(),
            "Expected auth_status to succeed: {:?}",
            status
        );
        let auth_status = status.unwrap();
        assert!(
            !auth_status.enabled,
            "Expected auth to be disabled by default"
        );

        stop_etcd_container(etcd.container)
            .await
            .expect("Failed to stop etcd container");
    }

    #[tokio::test]
    #[serial]
    async fn test_role_crud() {
        let etcd = start_etcd_container()
            .await
            .expect("Failed to start etcd container");

        let config = make_config(&etcd.connection_string);
        let mut client = EtcdClient::connect(&config)
            .await
            .expect("Failed to connect to etcd");

        let add_result = client.role_add("testrole").await;
        assert!(
            add_result.is_ok(),
            "Expected role_add to succeed: {:?}",
            add_result
        );

        let list_result = client.role_list().await;
        assert!(
            list_result.is_ok(),
            "Expected role_list to succeed: {:?}",
            list_result
        );
        let roles = list_result.unwrap();
        assert!(
            roles.iter().any(|r| r.name == "testrole"),
            "Expected testrole in list"
        );

        let delete_result = client.role_delete("testrole").await;
        assert!(
            delete_result.is_ok(),
            "Expected role_delete to succeed: {:?}",
            delete_result
        );

        let list_after = client.role_list().await.unwrap();
        assert!(
            !list_after.iter().any(|r| r.name == "testrole"),
            "Expected testrole to be deleted"
        );

        stop_etcd_container(etcd.container)
            .await
            .expect("Failed to stop etcd container");
    }

    #[tokio::test]
    #[serial]
    async fn test_user_crud() {
        let etcd = start_etcd_container()
            .await
            .expect("Failed to start etcd container");

        let config = make_config(&etcd.connection_string);
        let mut client = EtcdClient::connect(&config)
            .await
            .expect("Failed to connect to etcd");

        let add_result = client.user_add("testuser", "testpass").await;
        assert!(
            add_result.is_ok(),
            "Expected user_add to succeed: {:?}",
            add_result
        );

        let list_result = client.user_list().await;
        assert!(
            list_result.is_ok(),
            "Expected user_list to succeed: {:?}",
            list_result
        );
        let users = list_result.unwrap();
        assert!(
            users.iter().any(|u| u.name == "testuser"),
            "Expected testuser in list"
        );

        let delete_result = client.user_delete("testuser").await;
        assert!(
            delete_result.is_ok(),
            "Expected user_delete to succeed: {:?}",
            delete_result
        );

        let list_after = client.user_list().await.unwrap();
        assert!(
            !list_after.iter().any(|u| u.name == "testuser"),
            "Expected testuser to be deleted"
        );

        stop_etcd_container(etcd.container)
            .await
            .expect("Failed to stop etcd container");
    }

    #[tokio::test]
    #[serial]
    async fn test_role_permission_crud() {
        let etcd = start_etcd_container()
            .await
            .expect("Failed to start etcd container");

        let config = make_config(&etcd.connection_string);
        let mut client = EtcdClient::connect(&config)
            .await
            .expect("Failed to connect to etcd");

        client
            .role_add("permrole")
            .await
            .expect("Failed to add role");

        let grant_result = client
            .role_grant_permission("permrole", "read", "/config/*", None)
            .await;
        assert!(
            grant_result.is_ok(),
            "Expected role_grant_permission to succeed: {:?}",
            grant_result
        );

        let get_result = client.role_get_permissions("permrole").await;
        assert!(
            get_result.is_ok(),
            "Expected role_get_permissions to succeed: {:?}",
            get_result
        );
        let perms = get_result.unwrap();
        assert_eq!(perms.role, "permrole");
        assert_eq!(perms.permissions.len(), 1);
        assert_eq!(perms.permissions[0].perm_type, "read");
        assert_eq!(perms.permissions[0].key, "/config/*");

        let revoke_result = client
            .role_revoke_permission("permrole", "/config/*", None)
            .await;
        assert!(
            revoke_result.is_ok(),
            "Expected role_revoke_permission to succeed: {:?}",
            revoke_result
        );

        let perms_after = client.role_get_permissions("permrole").await.unwrap();
        assert!(
            perms_after.permissions.is_empty(),
            "Expected permissions to be empty after revoke"
        );

        client
            .role_delete("permrole")
            .await
            .expect("Failed to delete role");

        stop_etcd_container(etcd.container)
            .await
            .expect("Failed to stop etcd container");
    }

    #[tokio::test]
    #[serial]
    async fn test_user_role_grant_and_revoke() {
        let etcd = start_etcd_container()
            .await
            .expect("Failed to start etcd container");

        let config = make_config(&etcd.connection_string);
        let mut client = EtcdClient::connect(&config)
            .await
            .expect("Failed to connect to etcd");

        client
            .role_add("userrole")
            .await
            .expect("Failed to add role");
        client
            .user_add("roleuser", "rolepass")
            .await
            .expect("Failed to add user");

        let grant_result = client.user_grant_role("roleuser", "userrole").await;
        assert!(
            grant_result.is_ok(),
            "Expected user_grant_role to succeed: {:?}",
            grant_result
        );

        let users = client.user_list().await.unwrap();
        let user = users
            .iter()
            .find(|u| u.name == "roleuser")
            .expect("Expected user to exist");
        assert!(
            user.roles.contains(&"userrole".to_string()),
            "Expected user to have userrole"
        );

        let revoke_result = client.user_revoke_role("roleuser", "userrole").await;
        assert!(
            revoke_result.is_ok(),
            "Expected user_revoke_role to succeed: {:?}",
            revoke_result
        );

        let users_after = client.user_list().await.unwrap();
        let user_after = users_after
            .iter()
            .find(|u| u.name == "roleuser")
            .expect("Expected user to exist");
        assert!(
            !user_after.roles.contains(&"userrole".to_string()),
            "Expected user to not have userrole"
        );

        client
            .user_delete("roleuser")
            .await
            .expect("Failed to delete user");
        client
            .role_delete("userrole")
            .await
            .expect("Failed to delete role");

        stop_etcd_container(etcd.container)
            .await
            .expect("Failed to stop etcd container");
    }

    #[tokio::test]
    #[serial]
    async fn test_auth_enable_and_disable() {
        let etcd = start_etcd_container()
            .await
            .expect("Failed to start etcd container");

        let config = make_config(&etcd.connection_string);
        let mut client = EtcdClient::connect(&config)
            .await
            .expect("Failed to connect to etcd");

        client
            .user_add("root", "root")
            .await
            .expect("Failed to add root user");
        client
            .role_add("root")
            .await
            .expect("Failed to add root role");
        client
            .user_grant_role("root", "root")
            .await
            .expect("Failed to grant root role");

        let enable_result = client.auth_enable().await;
        assert!(
            enable_result.is_ok(),
            "Expected auth_enable to succeed: {:?}",
            enable_result
        );

        let status = client.auth_status().await;
        assert!(
            status.is_ok(),
            "Expected auth_status to succeed after enable: {:?}",
            status
        );
        assert!(status.unwrap().enabled, "Expected auth to be enabled");

        let mut auth_config = make_config(&etcd.connection_string);
        auth_config.username = Some("root".to_string());
        auth_config.password = Some("root".to_string());
        let mut auth_client = EtcdClient::connect(&auth_config)
            .await
            .expect("Failed to connect with auth");

        let disable_result = auth_client.auth_disable().await;
        assert!(
            disable_result.is_ok(),
            "Expected auth_disable to succeed: {:?}",
            disable_result
        );

        let status_after = client.auth_status().await;
        assert!(
            status_after.is_ok(),
            "Expected auth_status to succeed after disable: {:?}",
            status_after
        );
        assert!(
            !status_after.unwrap().enabled,
            "Expected auth to be disabled"
        );

        stop_etcd_container(etcd.container)
            .await
            .expect("Failed to stop etcd container");
    }
}
