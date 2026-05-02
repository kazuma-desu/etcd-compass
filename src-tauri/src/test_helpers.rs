#[cfg(test)]
pub mod test_helpers {
    use anyhow::{Context, Result};
    use std::net::TcpListener;
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
        let client_port = find_free_port().context("Failed to find a free client port for etcd")?;
        let peer_port = find_free_port().context("Failed to find a free peer port for etcd")?;
        let connection_string = format!("http://127.0.0.1:{}", client_port);

        let image = GenericImage::new("gcr.io/etcd-development/etcd", "v3.5.15")
            .with_cmd(vec![
                "etcd",
                "--listen-client-urls",
                &format!("http://0.0.0.0:{}", client_port),
                "--advertise-client-urls",
                &format!("http://127.0.0.1:{}", client_port),
                "--listen-peer-urls",
                &format!("http://0.0.0.0:{}", peer_port),
                "--initial-advertise-peer-urls",
                &format!("http://127.0.0.1:{}", peer_port),
                "--initial-cluster",
                &format!("default=http://127.0.0.1:{}", peer_port),
            ]);

        let container = image
            .start()
            .await
            .context("Failed to start etcd container")?;

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

    fn find_free_port() -> Result<u16> {
        let listener = TcpListener::bind("127.0.0.1:0")
            .context("Failed to bind to ephemeral port")?;
        let port = listener
            .local_addr()
            .context("Failed to get local address")?
            .port();
        drop(listener);
        Ok(port)
    }

    async fn wait_for_etcd_ready(connection_string: &str) -> Result<()> {
        let addr = connection_string
            .strip_prefix("http://")
            .unwrap_or(connection_string);

        for attempt in 0..60 {
            match check_etcd_health(addr).await {
                Ok(()) => return Ok(()),
                Err(_) if attempt < 59 => {
                    sleep(Duration::from_millis(500)).await;
                }
                Err(e) => return Err(e),
            }
        }

        anyhow::bail!("Etcd container did not become healthy within timeout")
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

    #[tokio::test]
    async fn test_etcd_container_starts() {
        let etcd = start_etcd_container()
            .await
            .expect("Failed to start etcd container");

        let addr = etcd
            .connection_string
            .strip_prefix("http://")
            .expect("valid connection string");
        check_etcd_health(addr)
            .await
            .expect("Etcd should respond to health check");

        stop_etcd_container(etcd.container)
            .await
            .expect("Failed to stop etcd container");
    }
}
