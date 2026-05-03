#[cfg(test)]
mod stress_tests {
    use crate::etcd::{EtcdClient, EtcdConfig};
    use crate::test_helpers::test_helpers::start_etcd_container;
    use anyhow::Result;
    use serial_test::serial;
    use std::time::Instant;

    pub struct EtcdGuard {
        pub connection_string: String,
    }

    pub async fn start_etcd_with_guard() -> Result<EtcdGuard> {
        let etcd = start_etcd_container().await?;
        Ok(EtcdGuard {
            connection_string: etcd.connection_string,
        })
    }

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

    fn compute_p95(mut latencies: Vec<u128>) -> u128 {
        if latencies.is_empty() {
            return 0;
        }
        latencies.sort_unstable();
        let idx = ((latencies.len() as f64) * 0.95).ceil() as usize - 1;
        let idx = idx.min(latencies.len() - 1);
        latencies[idx]
    }

    #[tokio::test]
    #[serial]
    async fn test_concurrent_connections() {
        let etcd = start_etcd_with_guard()
            .await
            .expect("Failed to start etcd container");

        let config = make_config(&etcd.connection_string);
        let mut handles = Vec::new();

        for i in 0..10 {
            let cfg = config.clone();
            let handle = tokio::spawn(async move {
                let start = Instant::now();
                let mut client = EtcdClient::connect(&cfg)
                    .await
                    .expect("Failed to connect to etcd");
                let connect_ms = start.elapsed().as_millis();

                let key = format!("/stress/concurrent/{}", i);
                let value = format!("value_{}", i);

                let op_start = Instant::now();
                client
                    .put_key(&key, &value, None)
                    .await
                    .expect("Failed to put key");
                let put_ms = op_start.elapsed().as_millis();

                let op_start = Instant::now();
                let fetched = client.get_key(&key).await.expect("Failed to get key");
                let get_ms = op_start.elapsed().as_millis();

                assert!(fetched.is_some(), "Expected key to exist");
                assert_eq!(fetched.unwrap().value, value);

                (connect_ms, put_ms, get_ms)
            });
            handles.push(handle);
        }

        let mut all_connect_ms = Vec::new();
        let mut all_put_ms = Vec::new();
        let mut all_get_ms = Vec::new();

        for handle in handles {
            let (connect_ms, put_ms, get_ms) = handle.await.expect("Task panicked");
            all_connect_ms.push(connect_ms);
            all_put_ms.push(put_ms);
            all_get_ms.push(get_ms);
        }

        let p95_connect = compute_p95(all_connect_ms);
        let p95_put = compute_p95(all_put_ms);
        let p95_get = compute_p95(all_get_ms);

        println!(
            "Concurrent connections P95: connect={}ms, put={}ms, get={}ms",
            p95_connect, p95_put, p95_get
        );

        assert!(
            p95_put < 100,
            "Expected P95 put latency < 100ms, got {}ms",
            p95_put
        );
        assert!(
            p95_get < 100,
            "Expected P95 get latency < 100ms, got {}ms",
            p95_get
        );
    }

    #[tokio::test]
    #[serial]
    async fn test_rapid_connect_disconnect() {
        let etcd = start_etcd_with_guard()
            .await
            .expect("Failed to start etcd container");

        let config = make_config(&etcd.connection_string);
        let mut latencies = Vec::new();

        for i in 0..50 {
            let start = Instant::now();
            let mut client = EtcdClient::connect(&config)
                .await
                .expect("Failed to connect to etcd");
            let connect_ms = start.elapsed().as_millis();

            let key = format!("/stress/rapid/{}", i);
            let value = format!("value_{}", i);

            client
                .put_key(&key, &value, None)
                .await
                .expect("Failed to put key");

            let fetched = client.get_key(&key).await.expect("Failed to get key");
            assert!(fetched.is_some());
            assert_eq!(fetched.unwrap().value, value);

            latencies.push(connect_ms);
        }

        let p95_connect = compute_p95(latencies);
        println!(
            "Rapid connect/disconnect P95 connect latency: {}ms",
            p95_connect
        );

        assert!(
            p95_connect < 100,
            "Expected P95 connect latency < 100ms, got {}ms",
            p95_connect
        );
    }

    #[tokio::test]
    #[serial]
    async fn test_connection_pool_exhaustion() {
        let etcd = start_etcd_with_guard()
            .await
            .expect("Failed to start etcd container");

        let config = make_config(&etcd.connection_string);
        let mut clients = Vec::new();
        let mut latencies = Vec::new();
        let max_connections = 50;

        for i in 0..max_connections {
            let start = Instant::now();
            let result = EtcdClient::connect(&config).await;
            let connect_ms = start.elapsed().as_millis();
            latencies.push(connect_ms);

            assert!(
                result.is_ok(),
                "Connection {} should succeed: {}",
                i,
                result.as_ref().err().unwrap()
            );
            clients.push(result.unwrap());
        }

        let p95_connect = compute_p95(latencies);
        println!(
            "Connection pool exhaustion ({} conns) P95 connect latency: {}ms",
            max_connections, p95_connect
        );

        assert!(
            p95_connect < 500,
            "Expected P95 connect latency < 500ms even under load, got {}ms",
            p95_connect
        );

        let mut clients = clients;
        for (i, mut client) in clients.drain(..).enumerate() {
            let key = format!("/stress/pool/{}", i);
            client
                .put_key(&key, &format!("value_{}", i), None)
                .await
                .expect("Failed to put key with pooled connection");
        }
    }

    /// Generate a 1MB string value for large-value tests.
    fn generate_1mb_string() -> String {
        "x".repeat(1024 * 1024)
    }

    /// Clean up all keys under a prefix by iterating through paginated results.
    async fn cleanup_keys(client: &mut EtcdClient, prefix: &str) -> Result<()> {
        let mut cursor: Option<String> = None;
        loop {
            let (keys, has_more) = client
                .get_keys_with_prefix(prefix, 100, cursor.clone(), true)
                .await?;
            for key in &keys {
                client.delete_key(&key.key).await?;
            }
            if !has_more || keys.is_empty() {
                break;
            }
            cursor = keys.last().map(|k| k.key.clone());
        }
        Ok(())
    }

    #[tokio::test]
    #[serial]
    async fn test_bulk_key_insertion() {
        let etcd = start_etcd_with_guard()
            .await
            .expect("Failed to start etcd container");

        let config = make_config(&etcd.connection_string);
        let mut client = EtcdClient::connect(&config)
            .await
            .expect("Failed to connect to etcd");

        let key_count: usize = 1000;
        let prefix = "/stress/bulk/insert";

        let start = Instant::now();
        for i in 0..key_count {
            let key = format!("{}/{:04}", prefix, i);
            client
                .put_key(&key, &format!("value_{}", i), None)
                .await
                .expect("Failed to put key");
        }
        let insert_duration = start.elapsed();

        println!(
            "Inserted {} keys in {:?} ({:?} per key)",
            key_count,
            insert_duration,
            insert_duration / (key_count as u32)
        );

        assert!(
            insert_duration.as_secs_f64() < 30.0,
            "Bulk insertion took too long: {:?}",
            insert_duration
        );

        let (keys, has_more) = client
            .get_keys_with_prefix(prefix, (key_count + 1) as i64, None, true)
            .await
            .expect("Failed to get keys with prefix");

        assert_eq!(
            keys.len(),
            key_count,
            "Expected {} keys, got {}",
            key_count,
            keys.len()
        );
        assert!(!has_more, "Expected all keys in a single page");

        for idx in [0, 499, 999] {
            let key = format!("{}/{:04}", prefix, idx);
            let fetched = client
                .get_key(&key)
                .await
                .expect("Failed to get key")
                .expect("Key should exist");
            assert_eq!(fetched.value, format!("value_{}", idx));
        }

        cleanup_keys(&mut client, prefix)
            .await
            .expect("Failed to clean up keys");
    }

    #[tokio::test]
    #[serial]
    async fn test_bulk_key_deletion() {
        let etcd = start_etcd_with_guard()
            .await
            .expect("Failed to start etcd container");

        let config = make_config(&etcd.connection_string);
        let mut client = EtcdClient::connect(&config)
            .await
            .expect("Failed to connect to etcd");

        let key_count: usize = 500;
        let prefix = "/stress/bulk/delete";

        for i in 0..key_count {
            let key = format!("{}/{:04}", prefix, i);
            client
                .put_key(&key, &format!("value_{}", i), None)
                .await
                .expect("Failed to put key");
        }

        let mut all_keys = Vec::new();
        let mut cursor: Option<String> = None;
        loop {
            let (keys, has_more) = client
                .get_keys_with_prefix(prefix, 100, cursor.clone(), true)
                .await
                .expect("Failed to list keys for deletion");
            all_keys.extend(keys.iter().map(|k| k.key.clone()));
            if !has_more || keys.is_empty() {
                break;
            }
            cursor = keys.last().map(|k| k.key.clone());
        }

        assert_eq!(
            all_keys.len(),
            key_count,
            "Expected {} keys before deletion",
            key_count
        );

        let start = Instant::now();
        let deleted = client
            .delete_keys(&all_keys, None::<fn(usize, usize)>)
            .await
            .expect("Failed to delete keys");
        let delete_duration = start.elapsed();

        println!(
            "Deleted {} keys in {:?} ({:?} per key)",
            deleted,
            delete_duration,
            delete_duration / (deleted.max(1) as u32)
        );

        assert!(
            delete_duration.as_secs_f64() < 15.0,
            "Bulk deletion took too long: {:?}",
            delete_duration
        );
        assert_eq!(deleted, key_count, "Expected all keys to be deleted");

        let (remaining, _) = client
            .get_keys_with_prefix(prefix, (key_count + 1) as i64, None, true)
            .await
            .expect("Failed to check remaining keys");
        assert!(
            remaining.is_empty(),
            "Expected no remaining keys, found {}",
            remaining.len()
        );

        for idx in [0, 249, 499] {
            let key = format!("{}/{:04}", prefix, idx);
            let fetched = client.get_key(&key).await.expect("Failed to get key");
            assert!(fetched.is_none(), "Expected key {} to be deleted", key);
        }
    }

    #[tokio::test]
    #[serial]
    async fn test_large_value_handling() {
        let etcd = start_etcd_with_guard()
            .await
            .expect("Failed to start etcd container");

        let config = make_config(&etcd.connection_string);
        let mut client = EtcdClient::connect(&config)
            .await
            .expect("Failed to connect to etcd");

        let key = "/stress/large_value";
        let large_value = generate_1mb_string();
        assert_eq!(
            large_value.len(),
            1024 * 1024,
            "Generated value should be exactly 1MB"
        );

        let start = Instant::now();
        client
            .put_key(key, &large_value, None)
            .await
            .expect("Failed to put large value");
        let put_duration = start.elapsed();

        let start = Instant::now();
        let fetched = client
            .get_key(key)
            .await
            .expect("Failed to get large value")
            .expect("Large value should exist");
        let get_duration = start.elapsed();

        println!(
            "1MB value put in {:?}, get in {:?}",
            put_duration, get_duration
        );

        assert!(
            put_duration.as_secs_f64() < 5.0,
            "Put of 1MB value took too long: {:?}",
            put_duration
        );
        assert!(
            get_duration.as_secs_f64() < 5.0,
            "Get of 1MB value took too long: {:?}",
            get_duration
        );

        assert_eq!(
            fetched.value.len(),
            large_value.len(),
            "Retrieved value length mismatch"
        );
        assert_eq!(fetched.value, large_value, "Retrieved value does not match");

        client
            .delete_key(key)
            .await
            .expect("Failed to delete large value");
    }

    #[tokio::test]
    #[serial]
    async fn test_pagination_performance() {
        let etcd = start_etcd_with_guard()
            .await
            .expect("Failed to start etcd container");

        let config = make_config(&etcd.connection_string);
        let mut client = EtcdClient::connect(&config)
            .await
            .expect("Failed to connect to etcd");

        let key_count: usize = 200;
        let prefix = "/stress/pagination";

        for i in 0..key_count {
            let key = format!("{}/{:04}", prefix, i);
            client
                .put_key(&key, &format!("value_{}", i), None)
                .await
                .expect("Failed to put key");
        }

        let page_sizes = vec![10, 50, 100];

        for page_size in page_sizes {
            let start = Instant::now();
            let mut total_fetched = 0usize;
            let mut cursor: Option<String> = None;
            let mut page_count = 0usize;

            loop {
                let (keys, has_more) = client
                    .get_keys_with_prefix(prefix, page_size, cursor.clone(), true)
                    .await
                    .expect("Failed to paginate keys");
                total_fetched += keys.len();
                page_count += 1;
                if !has_more || keys.is_empty() {
                    break;
                }
                cursor = keys.last().map(|k| k.key.clone());
            }

            let duration = start.elapsed();
            println!(
                "Page size {}: fetched {} keys in {} pages, total time {:?}",
                page_size, total_fetched, page_count, duration
            );

            assert_eq!(
                total_fetched, key_count,
                "Expected all {} keys to be fetched with page size {}",
                key_count, page_size
            );

            assert!(
                duration.as_secs_f64() < 2.0,
                "Pagination with page size {} took too long: {:?}",
                page_size,
                duration
            );
        }

        let start = Instant::now();
        let mut total_fetched = 0usize;
        let mut cursor: Option<String> = None;
        let mut page_count = 0usize;

        loop {
            let (keys, has_more) = client
                .get_all_keys(50, cursor.clone(), true, Some(prefix.to_string()), None)
                .await
                .expect("Failed to paginate all keys");
            total_fetched += keys.len();
            page_count += 1;
            if !has_more || keys.is_empty() {
                break;
            }
            cursor = keys.last().map(|k| k.key.clone());
        }

        let duration = start.elapsed();
        println!(
            "get_all_keys pagination: fetched {} keys in {} pages, total time {:?}",
            total_fetched, page_count, duration
        );

        assert_eq!(
            total_fetched, key_count,
            "Expected all {} keys via get_all_keys pagination",
            key_count
        );
        assert!(
            duration.as_secs_f64() < 2.0,
            "get_all_keys pagination took too long: {:?}",
            duration
        );

        cleanup_keys(&mut client, prefix)
            .await
            .expect("Failed to clean up keys");
    }
}
