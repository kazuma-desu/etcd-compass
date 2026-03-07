/**
 * Cluster commands — cluster status and snapshots
 *
 * Maps to: cluster_status, snapshot_save
 */

import { invoke } from "@tauri-apps/api/core";
import type { ClusterStatus } from "./types";

export async function clusterStatus(
	connectionId: string,
): Promise<ClusterStatus> {
	return invoke<ClusterStatus>("cluster_status", { connectionId });
}

export async function snapshotSave(
	connectionId: string,
): Promise<string | null> {
	return invoke<string | null>("snapshot_save", { connectionId });
}
