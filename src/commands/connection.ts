/**
 * Connection commands — connect/disconnect/test etcd clusters
 *
 * Maps to: connect_etcd, disconnect_etcd, test_connection, list_connections
 */

import { invoke } from "@tauri-apps/api/tauri";
import type { EtcdConfig } from "./types";

export async function connectEtcd(config: EtcdConfig): Promise<string> {
	return invoke<string>("connect_etcd", {
		endpoint: config.endpoint,
		username: config.username || null,
		password: config.password || null,
		tlsEnabled: config.tls_enabled || false,
		caCertPath: config.ca_cert_path || null,
		clientCertPath: config.client_cert_path || null,
		clientKeyPath: config.client_key_path || null,
		skipVerify: config.skip_verify || false,
	});
}

export async function disconnectEtcd(connectionId: string): Promise<string> {
	return invoke<string>("disconnect_etcd", { connectionId });
}

export async function testConnection(config: EtcdConfig): Promise<string> {
	return invoke<string>("test_connection", {
		endpoint: config.endpoint,
		username: config.username || null,
		password: config.password || null,
		tlsEnabled: config.tls_enabled || false,
		caCertPath: config.ca_cert_path || null,
		clientCertPath: config.client_cert_path || null,
		clientKeyPath: config.client_key_path || null,
		skipVerify: config.skip_verify || false,
	});
}

export async function listConnections(): Promise<[string, string][]> {
	return invoke<[string, string][]>("list_connections");
}
