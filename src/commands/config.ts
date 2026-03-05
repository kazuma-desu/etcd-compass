/**
 * Config commands — connection persistence and history
 *
 * Maps to: get_saved_connection, save_connection, get_connection_history,
 *          remove_from_history, update_connection_favorite,
 *          duplicate_connection, import_connections
 */

import { invoke } from "@tauri-apps/api/tauri";
import type { EtcdConfig } from "./types";

export async function getSavedConnection(): Promise<EtcdConfig> {
	return invoke<EtcdConfig>("get_saved_connection");
}

export async function saveConnection(config: EtcdConfig): Promise<void> {
	return invoke<void>("save_connection", { config });
}

export async function getConnectionHistory(): Promise<EtcdConfig[]> {
	return invoke<EtcdConfig[]>("get_connection_history");
}

export async function removeFromHistory(endpoint: string): Promise<void> {
	return invoke<void>("remove_from_history", { endpoint });
}

export async function updateConnectionFavorite(
	endpoint: string,
	isFavorite: boolean,
): Promise<void> {
	return invoke<void>("update_connection_favorite", { endpoint, isFavorite });
}

export async function duplicateConnection(endpoint: string): Promise<void> {
	return invoke<void>("duplicate_connection", { endpoint });
}

export async function importConnections(configs: EtcdConfig[]): Promise<void> {
	return invoke<void>("import_connections", { configs });
}
