import { create } from "zustand";
import { clusterStatus } from "@/commands/cluster";
import type { ClusterStatus } from "@/commands/types";

export interface MetricsDataPoint {
	timestamp: number;
	dbSize: number;
	dbSizeInUse: number;
	keyCount: number;
	latencyMs: number;
}

interface ClusterState {
	status: ClusterStatus | null;
	loading: boolean;
	error: string | null;
	autoRefresh: boolean;
	refreshInterval: number | null;
	refreshIntervalMs: number;
	metricsHistory: MetricsDataPoint[];
	fetchStatus: (connectionId: string) => Promise<void>;
	setAutoRefresh: (enabled: boolean, connectionId?: string) => void;
	setRefreshInterval: (intervalMs: number, connectionId?: string) => void;
	clearError: () => void;
}

const DEFAULT_REFRESH_INTERVAL_MS = 30000; // 30 seconds
const MAX_HISTORY_POINTS = 60; // Keep last 60 data points

export const useClusterStore = create<ClusterState>((set, get) => ({
	status: null,
	loading: false,
	error: null,
	autoRefresh: false,
	refreshInterval: null,
	refreshIntervalMs: DEFAULT_REFRESH_INTERVAL_MS,
	metricsHistory: [],

	fetchStatus: async (connectionId: string) => {
		set({ loading: true, error: null });
		try {
			const startTime = performance.now();
			const status = await clusterStatus(connectionId);
			const latencyMs = performance.now() - startTime;

			// Add new metrics point
			const newPoint: MetricsDataPoint = {
				timestamp: Date.now(),
				dbSize: status.db_size,
				dbSizeInUse: status.db_size_in_use,
				keyCount: status.raft_index, // Using raft_index as proxy for activity
				latencyMs: Math.round(latencyMs),
			};

			set((state) => ({
				status,
				loading: false,
				metricsHistory: [
					...state.metricsHistory.slice(-MAX_HISTORY_POINTS + 1),
					newPoint,
				],
			}));
		} catch (error) {
			set({
				error:
					error instanceof Error
						? error.message
						: "Failed to fetch cluster status",
				loading: false,
			});
		}
	},

	setAutoRefresh: (enabled: boolean, connectionId?: string) => {
		const { refreshInterval, refreshIntervalMs } = get();

		if (refreshInterval) {
			window.clearInterval(refreshInterval);
		}

		if (enabled && connectionId) {
			const interval = window.setInterval(() => {
				get().fetchStatus(connectionId);
			}, refreshIntervalMs);
			set({ autoRefresh: true, refreshInterval: interval });
		} else {
			set({ autoRefresh: false, refreshInterval: null });
		}
	},

	setRefreshInterval: (intervalMs: number, connectionId?: string) => {
		const { autoRefresh, refreshInterval } = get();

		// Clear existing interval
		if (refreshInterval) {
			window.clearInterval(refreshInterval);
		}

		// Update interval setting
		set({ refreshIntervalMs: intervalMs, refreshInterval: null });

		// Restart auto-refresh if it was enabled
		if (autoRefresh && connectionId) {
			const interval = window.setInterval(() => {
				get().fetchStatus(connectionId);
			}, intervalMs);
			set({ refreshInterval: interval });
		}
	},

	clearError: () => set({ error: null }),
}));
