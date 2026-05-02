#[cfg(test)]
mod integration_tests {
    use crate::etcd::{EtcdClient, EtcdConfig};
    use crate::test_helpers::test_helpers::{
        start_etcd_container, stop_etcd_container,
    };
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
        assert!(status.is_ok(), "Expected status call to succeed: {:?}", status);

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
        assert!(put_result.is_ok(), "Expected put to succeed: {:?}", put_result);

        let get_result = client.get_key(key).await;
        assert!(get_result.is_ok(), "Expected get to succeed: {:?}", get_result);

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
        assert!(delete_result.is_ok(), "Expected delete to succeed: {:?}", delete_result);

        let get_result = client.get_key(key).await;
        assert!(get_result.is_ok(), "Expected get to succeed after delete: {:?}", get_result);
        assert!(get_result.unwrap().is_none(), "Expected key to be gone after delete");

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
                .put_key(&format!("/test/all_keys/{}", i), &format!("value_{}", i), None)
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
            keys.iter().any(|k| k.key == "/prefix/app/key1" && k.value == "val1"),
            "Expected /prefix/app/key1"
        );
        assert!(
            keys.iter().any(|k| k.key == "/prefix/app/key2" && k.value == "val2"),
            "Expected /prefix/app/key2"
        );
        assert!(!has_more, "Expected no more pages with limit 100");

        stop_etcd_container(etcd.container)
            .await
            .expect("Failed to stop etcd container");
    }
}
