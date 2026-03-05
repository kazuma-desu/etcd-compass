/**
 * IPC types — mirrors Rust structs from src-tauri/src/
 *
 * These types define the contract between the frontend and the Tauri backend.
 * Keep them in sync with the Rust definitions in etcd.rs and main.rs.
 */

export interface EtcdKey {
	key: string;
	value: string;
	version: number;
	create_revision: number;
	mod_revision: number;
	lease: number;
}

export interface LeaseInfo {
	id: number;
	ttl: number;
	granted_ttl: number;
	keys: string[];
}

export interface EtcdConfig {
	endpoint: string;
	username?: string;
	password?: string;
	name?: string;
	color?: string;
	isFavorite?: boolean;
	group?: string;
	tls_enabled?: boolean;
	ca_cert_path?: string;
	client_cert_path?: string;
	client_key_path?: string;
	skip_verify?: boolean;
}

export interface TreeNode {
	name: string;
	fullPath: string;
	isLeaf: boolean;
	children: TreeNode[];
	value?: string;
	expanded?: boolean;
}

export interface Connection {
	id: string;
	config: EtcdConfig;
	connectedAt: Date;
}

export interface WatchEvent {
	watch_id: string;
	event_type: "PUT" | "DELETE";
	key: string;
	value: string | null;
	prev_value: string | null;
	revision: number;
	timestamp: string;
}

export interface WatchResponse {
	watch_id: string;
	key: string;
	is_prefix: boolean;
}

export interface ClusterMember {
	id: string;
	name: string;
	peer_urls: string[];
	client_urls: string[];
	is_leader: boolean;
	health: "healthy" | "unhealthy" | "unknown";
}

export interface ClusterStatus {
	cluster_id: string;
	member_id: string;
	leader_id: string;
	raft_term: number;
	raft_index: number;
	db_size: number;
	db_size_in_use: number;
	version: string;
	members: ClusterMember[];
}

export interface PaginatedKeysResult {
	keys: EtcdKey[];
	has_more: boolean;
}

export interface AuthStatus {
	enabled: boolean;
}

export interface EtcdUser {
	name: string;
	roles: string[];
}

export interface EtcdRole {
	name: string;
}

export interface EtcdRolePermissions {
	role: string;
	permissions: RolePermission[];
}

export interface RolePermission {
	perm_type: string;
	key: string;
	range_end: string | null;
}

export interface SnapshotProgress {
	bytes_written: number;
	total_bytes: number;
}
