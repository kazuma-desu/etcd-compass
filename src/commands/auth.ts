/**
 * Auth commands — authentication, users, and roles
 *
 * Maps to: auth_status, auth_enable, auth_disable,
 *          user_list, user_add, user_delete, user_grant_role, user_revoke_role,
 *          role_list, role_add, role_delete, role_get_permissions,
 *          role_grant_permission, role_revoke_permission
 */

import { invoke } from "@tauri-apps/api/core";
import type {
	AuthStatus,
	EtcdRole,
	EtcdRolePermissions,
	EtcdUser,
} from "./types";

// Auth
export async function authStatus(connectionId: string): Promise<AuthStatus> {
	return invoke<AuthStatus>("auth_status", { connectionId });
}

export async function authEnable(connectionId: string): Promise<void> {
	return invoke<void>("auth_enable", { connectionId });
}

export async function authDisable(connectionId: string): Promise<void> {
	return invoke<void>("auth_disable", { connectionId });
}

// Users
export async function userList(connectionId: string): Promise<EtcdUser[]> {
	return invoke<EtcdUser[]>("user_list", { connectionId });
}

export async function userAdd(
	connectionId: string,
	name: string,
	password: string,
): Promise<void> {
	return invoke<void>("user_add", { connectionId, name, password });
}

export async function userDelete(
	connectionId: string,
	name: string,
): Promise<void> {
	return invoke<void>("user_delete", { connectionId, name });
}

export async function userGrantRole(
	connectionId: string,
	user: string,
	role: string,
): Promise<void> {
	return invoke<void>("user_grant_role", { connectionId, user, role });
}

export async function userRevokeRole(
	connectionId: string,
	user: string,
	role: string,
): Promise<void> {
	return invoke<void>("user_revoke_role", { connectionId, user, role });
}

// Roles
export async function roleList(connectionId: string): Promise<EtcdRole[]> {
	return invoke<EtcdRole[]>("role_list", { connectionId });
}

export async function roleAdd(
	connectionId: string,
	name: string,
): Promise<void> {
	return invoke<void>("role_add", { connectionId, name });
}

export async function roleDelete(
	connectionId: string,
	name: string,
): Promise<void> {
	return invoke<void>("role_delete", { connectionId, name });
}

export async function roleGetPermissions(
	connectionId: string,
	role: string,
): Promise<EtcdRolePermissions> {
	return invoke<EtcdRolePermissions>("role_get_permissions", {
		connectionId,
		role,
	});
}

export async function roleGrantPermission(
	connectionId: string,
	role: string,
	permType: string,
	key: string,
	rangeEnd?: string,
): Promise<void> {
	return invoke<void>("role_grant_permission", {
		connectionId,
		role,
		permType,
		key,
		rangeEnd,
	});
}

export async function roleRevokePermission(
	connectionId: string,
	role: string,
	key: string,
	rangeEnd?: string,
): Promise<void> {
	return invoke<void>("role_revoke_permission", {
		connectionId,
		role,
		key,
		rangeEnd,
	});
}
