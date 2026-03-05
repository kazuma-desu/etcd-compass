/**
 * Key commands — CRUD operations on etcd keys
 *
 * Maps to: get_all_keys, get_key, put_key, delete_key, delete_keys, get_keys_with_prefix
 */

import { invoke } from "@tauri-apps/api/tauri";
import type { EtcdKey, PaginatedKeysResult } from "./types";

export async function getAllKeys(
	connectionId: string,
	limit: number,
	cursor: string | null,
	sortAscending: boolean,
	rangeStart?: string | null,
	rangeEnd?: string | null,
): Promise<PaginatedKeysResult> {
	return invoke<PaginatedKeysResult>("get_all_keys", {
		connectionId,
		limit,
		cursor,
		sortAscending,
		rangeStart: rangeStart || null,
		rangeEnd: rangeEnd || null,
	});
}

export async function getKey(
	connectionId: string,
	key: string,
): Promise<EtcdKey | null> {
	return invoke<EtcdKey | null>("get_key", { connectionId, key });
}

export async function putKey(
	connectionId: string,
	key: string,
	value: string,
	leaseId?: number | null,
): Promise<EtcdKey> {
	return invoke<EtcdKey>("put_key", { connectionId, key, value, leaseId });
}

export async function deleteKey(
	connectionId: string,
	key: string,
): Promise<void> {
	return invoke<void>("delete_key", { connectionId, key });
}

export async function deleteKeys(
	connectionId: string,
	keys: string[],
): Promise<number> {
	return invoke<number>("delete_keys", { connectionId, keys });
}

export async function getKeysWithPrefix(
	connectionId: string,
	prefix: string,
	limit: number,
	cursor: string | null,
	sortAscending: boolean,
): Promise<PaginatedKeysResult> {
	return invoke<PaginatedKeysResult>("get_keys_with_prefix", {
		connectionId,
		prefix,
		limit,
		cursor,
		sortAscending,
	});
}
