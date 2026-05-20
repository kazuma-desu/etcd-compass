#[cfg(test)]
pub mod test_helpers {
    use anyhow::{Context, Result};
    use testcontainers::core::ports::IntoContainerPort;
    use testcontainers::runners::AsyncRunner;
    use testcontainers::{ContainerAsync, GenericImage, ImageExt};
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpStream;
    use tokio::time::{sleep, Duration};

    /// Holds the running etcd container and its connection string.
    pub struct EtcdContainer {
        pub container: ContainerAsync<GenericImage>,
        pub connection_string: String,
    }

    /// Starts an etcd container using testcontainers with dynamic port allocation.
    /// Returns the container handle and a connection string like `http://localhost:{port}`.
    pub async fn start_etcd_container() -> Result<EtcdContainer> {
        let image = GenericImage::new("gcr.io/etcd-development/etcd", "v3.5.15")
            .with_exposed_port(2379.tcp())
            .with_exposed_port(2380.tcp())
            .with_cmd(vec![
                "etcd",
                "--listen-client-urls",
                "http://0.0.0.0:2379",
                "--advertise-client-urls",
                "http://127.0.0.1:2379",
                "--listen-peer-urls",
                "http://0.0.0.0:2380",
                "--initial-advertise-peer-urls",
                "http://127.0.0.1:2380",
                "--initial-cluster",
                "default=http://127.0.0.1:2380",
            ]);

        let container = image
            .start()
            .await
            .context("Failed to start etcd container")?;

        let client_port = container
            .get_host_port_ipv4(2379.tcp())
            .await
            .context("Failed to get mapped client port")?;
        let _peer_port = container
            .get_host_port_ipv4(2380.tcp())
            .await
            .context("Failed to get mapped peer port")?;
        let connection_string = format!("http://127.0.0.1:{}", client_port);

        wait_for_etcd_ready(&connection_string).await?;

        Ok(EtcdContainer {
            container,
            connection_string,
        })
    }

    /// Stops and cleans up the etcd container.
    pub async fn stop_etcd_container(container: ContainerAsync<GenericImage>) -> Result<()> {
        container
            .stop()
            .await
            .context("Failed to stop etcd container")?;
        Ok(())
    }

    async fn wait_for_etcd_ready(connection_string: &str) -> Result<()> {
        let addr = connection_string
            .strip_prefix("http://")
            .unwrap_or(connection_string);

        let mut last_err = None;
        for attempt in 0..60 {
            match check_etcd_health(addr).await {
                Ok(()) => return Ok(()),
                Err(e) if attempt < 59 => {
                    last_err = Some(e);
                    sleep(Duration::from_millis(500)).await;
                }
                Err(e) => {
                    last_err = Some(e);
                    break;
                }
            }
        }

        anyhow::bail!(
            "Etcd container did not become healthy within timeout: {}",
            last_err
                .map(|e| e.to_string())
                .unwrap_or_else(|| "unknown error".to_string())
        )
    }

    async fn check_etcd_health(addr: &str) -> Result<()> {
        let mut stream = TcpStream::connect(addr)
            .await
            .context("Failed to connect to etcd")?;

        let request = format!(
            "GET /health HTTP/1.1\r\nHost: {}\r\nConnection: close\r\n\r\n",
            addr
        );
        stream
            .write_all(request.as_bytes())
            .await
            .context("Failed to send HTTP request")?;

        let mut buffer = [0u8; 1024];
        let n = stream
            .read(&mut buffer)
            .await
            .context("Failed to read HTTP response")?;

        let response = String::from_utf8_lossy(&buffer[..n]);
        if response.contains("200 OK") {
            Ok(())
        } else {
            anyhow::bail!("Unexpected health check response: {}", response)
        }
    }
}
