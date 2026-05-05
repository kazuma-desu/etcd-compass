import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// =============================================================================
// REGRESSION TEST: Double-disconnect bug (Bug #5)
// =============================================================================
// Bug: Both ClusterSidebar and TabBar independently called disconnectEtcd(id)
// followed by store.disconnect(), which internally called disconnectEtcd again.
// This caused a double backend disconnect.
// Fix: Removed the redundant store.disconnect() call from both components.
// =============================================================================

const mockDisconnectEtcd = vi.fn().mockResolvedValue(undefined);
const mockListConnections = vi.fn().mockResolvedValue([]);

vi.mock("@/commands/connection", () => ({
	disconnectEtcd: (...args: unknown[]) => mockDisconnectEtcd(...args),
	listConnections: (...args: unknown[]) => mockListConnections(...args),
}));

const mockUseConnectionStore = vi.fn().mockReturnValue({
	connectionId: null,
	setActiveConnectionId: vi.fn(),
	isConnecting: false,
	connectionError: null,
	config: { endpoint: "" },
	connect: vi.fn(),
	disconnect: vi.fn(), // This should NOT be called after the fix
});

vi.mock("@/features/connections/connection-store", () => ({
	useConnectionStore: (...args: unknown[]) => mockUseConnectionStore(...args),
}));

vi.mock("@/shared/hooks/use-keyboard-shortcuts", () => ({
	useTabShortcuts: vi.fn(),
}));

vi.mock("@/shared/components/ConnectionStatus", () => ({
	ConnectionStatus: () => <div data-testid="connection-status" />,
}));

vi.mock("@/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
	}: {
		children?: React.ReactNode;
		onClick?: () => void;
	}) => (
		<button type="button" onClick={onClick}>
			{children}
		</button>
	),
}));

import { TabBar } from "./TabBar";

describe("TabBar regression - double-disconnect", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockListConnections.mockResolvedValue([]);
		mockUseConnectionStore.mockReturnValue({
			connectionId: null,
			setActiveConnectionId: vi.fn(),
			isConnecting: false,
			connectionError: null,
			config: { endpoint: "" },
			connect: vi.fn(),
			disconnect: vi.fn(),
		});
	});

	it("should call disconnectEtcd exactly once when closing a tab", async () => {
		const tabId = "tab-abc-123";
		const tabEndpoint = "localhost:2379";

		mockListConnections.mockResolvedValue([[tabId, tabEndpoint]]);

		render(<TabBar />);

		await waitFor(() => {
			expect(screen.getByText(tabEndpoint)).toBeInTheDocument();
		});

		const closeButton = screen.getByRole("button");
		fireEvent.click(closeButton);

		await waitFor(() => {
			expect(mockDisconnectEtcd).toHaveBeenCalledTimes(1);
			expect(mockDisconnectEtcd).toHaveBeenCalledWith(tabId);
		});
	});

	it("should NOT call store.disconnect when closing a tab (regression: prevent double-disconnect)", async () => {
		const mockDisconnectStore = vi.fn();
		const tabId = "tab-def-456";
		const tabEndpoint = "localhost:2380";

		mockUseConnectionStore.mockReturnValue({
			connectionId: tabId,
			setActiveConnectionId: vi.fn(),
			isConnecting: false,
			connectionError: null,
			config: { endpoint: tabEndpoint },
			connect: vi.fn(),
			disconnect: mockDisconnectStore,
		});

		mockListConnections.mockResolvedValue([[tabId, tabEndpoint]]);

		render(<TabBar />);

		await waitFor(() => {
			expect(screen.getByText(tabEndpoint)).toBeInTheDocument();
		});

		const closeButton = screen.getByRole("button");
		fireEvent.click(closeButton);

		await waitFor(() => {
			expect(mockDisconnectEtcd).toHaveBeenCalledTimes(1);
		});

		// The critical regression assertion: store.disconnect must NOT be called,
		// because it would trigger a second disconnectEtcd call.
		expect(mockDisconnectStore).not.toHaveBeenCalled();
	});
});
