/**
 * Lease commands — lease lifecycle management
 *
 * Maps to: lease_grant, lease_revoke, lease_keepalive, lease_time_to_live, lease_list
 */

import { invoke } from "@tauri-apps/api/tauri";
import type { LeaseInfo } from "./types";

export async function leaseGrant(
	connectionId: string,
	ttl: number,
): Promise<number> {
	return invoke<number>("lease_grant", { connectionId, ttl });
}

export async function leaseRevoke(
	connectionId: string,
	leaseId: number,
): Promise<void> {
	return invoke<void>("lease_revoke", { connectionId, leaseId });
}

export async function leaseKeepalive(
	connectionId: string,
	leaseId: number,
): Promise<void> {
	return invoke<void>("lease_keepalive", { connectionId, leaseId });
}

export async function leaseTimeToLive(
	connectionId: string,
	leaseId: number,
): Promise<LeaseInfo> {
	return invoke<LeaseInfo>("lease_time_to_live", { connectionId, leaseId });
}

export async function leaseList(connectionId: string): Promise<number[]> {
	return invoke<number[]>("lease_list", { connectionId });
}
