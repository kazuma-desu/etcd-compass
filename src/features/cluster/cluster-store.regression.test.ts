import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// =============================================================================
// REGRESSION TEST: Cluster Auto-Refresh Interval Leak (Bug #8)
// =============================================================================
// Bug: ClusterStatus had two competing useEffect hooks reacting to connectionId
// changes. Effect 1 fetched status and disabled auto-refresh in cleanup.
// Effect 2 re-enabled auto-refresh. This created a race where intervals were
// never properly cleaned up when switching connections, causing memory leaks
// and multiple concurrent fetch loops.
// Fix: Separated concerns into two clean effects with explicit interval
// tracking (refreshConnectionId) and consolidated cleanup in the store.
// =============================================================================

const mockClusterStatus = vi.fn().mockResolvedValue({
	members: [],
	db_size: 0,
	db_size_in_use: 0,
	raft_term: 1,
	raft_index: 1,
	version: "3.5.0",
	cluster_id: "test-cluster",
	leader_id: "leader-1",
});

vi.mock("@/commands/cluster", () => ({
	clusterStatus: (...args: unknown[]) => mockClusterStatus(...args),
}));

import { useClusterStore } from "./cluster-store";

describe("cluster-store auto-refresh regression", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		// Reset store to initial state
		useClusterStore.setState({
			status: null,
			loading: false,
			error: null,
			autoRefresh: false,
			refreshInterval: null,
			refreshIntervalMs: 30000,
			refreshConnectionId: null,
			metricsHistory: [],
		});
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should clear old interval when switching connections with auto-refresh on", () => {
		const clearIntervalSpy = vi.spyOn(window, "clearInterval");
		const setIntervalSpy = vi.spyOn(window, "setInterval");

		// Start auto-refresh for connection "A"
		useClusterStore.getState().setAutoRefresh(true, "conn-A");
		expect(setIntervalSpy).toHaveBeenCalledTimes(1);
		const intervalA = setIntervalSpy.mock.results[0].value;
		expect(intervalA).toBeDefined();
		expect(useClusterStore.getState().refreshConnectionId).toBe("conn-A");

		// Switch to connection "B" with auto-refresh still on
		useClusterStore.getState().setAutoRefresh(true, "conn-B");

		// Old interval should have been cleared
		expect(clearIntervalSpy).toHaveBeenCalledWith(intervalA);
		// New interval should have been created
		expect(setIntervalSpy).toHaveBeenCalledTimes(2);
		const intervalB = setIntervalSpy.mock.results[1].value;
		expect(intervalB).toBeDefined();
		expect(intervalB).not.toBe(intervalA);
		expect(useClusterStore.getState().refreshConnectionId).toBe("conn-B");

		// Stop auto-refresh
		useClusterStore.getState().setAutoRefresh(false);
		expect(clearIntervalSpy).toHaveBeenCalledWith(intervalB);
		expect(useClusterStore.getState().refreshConnectionId).toBeNull();
		expect(useClusterStore.getState().autoRefresh).toBe(false);

		clearIntervalSpy.mockRestore();
		setIntervalSpy.mockRestore();
	});

	it("should clean up interval on component unmount simulation", () => {
		const clearIntervalSpy = vi.spyOn(window, "clearInterval");
		const setIntervalSpy = vi.spyOn(window, "setInterval");

		// Start auto-refresh
		useClusterStore.getState().setAutoRefresh(true, "conn-A");
		expect(setIntervalSpy).toHaveBeenCalledTimes(1);
		const interval = setIntervalSpy.mock.results[0].value;

		// Simulate unmount cleanup
		useClusterStore.getState().setAutoRefresh(false);

		expect(clearIntervalSpy).toHaveBeenCalledWith(interval);
		expect(useClusterStore.getState().refreshInterval).toBeNull();
		expect(useClusterStore.getState().autoRefresh).toBe(false);

		clearIntervalSpy.mockRestore();
		setIntervalSpy.mockRestore();
	});

	it("should not leak intervals when setAutoRefresh is called multiple times for same connection", () => {
		const clearIntervalSpy = vi.spyOn(window, "clearInterval");
		const setIntervalSpy = vi.spyOn(window, "setInterval");

		// Start auto-refresh
		useClusterStore.getState().setAutoRefresh(true, "conn-A");
		const interval1 = setIntervalSpy.mock.results[0].value;

		// Call again for same connection
		useClusterStore.getState().setAutoRefresh(true, "conn-A");
		const interval2 = setIntervalSpy.mock.results[1].value;

		// Old interval should have been cleared
		expect(clearIntervalSpy).toHaveBeenCalledWith(interval1);
		// Only 2 intervals should have been created total
		expect(setIntervalSpy).toHaveBeenCalledTimes(2);
		expect(interval2).not.toBe(interval1);

		clearIntervalSpy.mockRestore();
		setIntervalSpy.mockRestore();
	});
});
