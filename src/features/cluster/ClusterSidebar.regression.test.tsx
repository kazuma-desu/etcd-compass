import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSetActiveConnectionId = vi.fn();

const mockGetConnectionHistory = vi.fn().mockResolvedValue([]);
const mockListConnections = vi.fn().mockResolvedValue([]);

vi.mock("@/commands/config", () => ({
	getConnectionHistory: (...args: unknown[]) =>
		mockGetConnectionHistory(...args),
	importConnections: vi.fn(),
	removeFromHistory: vi.fn(),
	updateConnectionFavorite: vi.fn(),
	duplicateConnection: vi.fn(),
}));

vi.mock("@/commands/connection", () => ({
	disconnectEtcd: vi.fn(),
	listConnections: (...args: unknown[]) => mockListConnections(...args),
}));

vi.mock("@/commands/native", () => ({
	openFileDialog: vi.fn(),
	readFile: vi.fn(),
	saveFileDialog: vi.fn(),
	writeFile: vi.fn(),
}));

vi.mock("@/features/connections/connection-store", () => ({
	useConnectionStore: () => ({
		connectionId: null,
		disconnect: vi.fn(),
		setActiveConnectionId: mockSetActiveConnectionId,
	}),
}));

type P = { children?: React.ReactNode };
vi.mock("@/components/ui/sidebar", () => ({
	Sidebar: ({ children }: P) => <div data-testid="sidebar">{children}</div>,
	SidebarContent: ({ children }: P) => <div>{children}</div>,
	SidebarFooter: ({ children }: P) => <div>{children}</div>,
	SidebarGroup: ({ children }: P) => <div>{children}</div>,
	SidebarGroupContent: ({ children }: P) => <div>{children}</div>,
	SidebarGroupLabel: ({ children }: P) => <div>{children}</div>,
	SidebarHeader: ({ children }: P) => <div>{children}</div>,
	SidebarMenu: ({ children }: P) => <div>{children}</div>,
	SidebarMenuButton: ({ children }: P) => <div>{children}</div>,
	SidebarMenuItem: ({ children }: P) => <div>{children}</div>,
	SidebarRail: () => <div />,
	useSidebar: () => ({ state: "expanded", toggleSidebar: vi.fn() }),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: P) => <div>{children}</div>,
	DropdownMenuContent: ({ children }: P) => <div>{children}</div>,
	DropdownMenuItem: ({ children }: P) => <div>{children}</div>,
	DropdownMenuSeparator: () => <hr />,
	DropdownMenuTrigger: ({ children }: P) => <div>{children}</div>,
}));

vi.mock("@/components/ui/context-menu", () => ({
	ContextMenu: ({ children }: P) => <div>{children}</div>,
	ContextMenuContent: ({ children }: P) => <div>{children}</div>,
	ContextMenuItem: ({ children }: P) => <div>{children}</div>,
	ContextMenuSeparator: () => <hr />,
	ContextMenuTrigger: ({ children }: P) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ThemeToggle", () => ({
	ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

import { ClusterSidebar } from "./ClusterSidebar";

function isValidUUID(str: string): boolean {
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(str);
}

describe("ClusterSidebar regression - connection ID mapping", () => {
	const defaultProps = {
		onAddCluster: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockGetConnectionHistory.mockResolvedValue([]);
		mockListConnections.mockResolvedValue([]);
	});

	it("should generate a UUID for history items when listConnections returns empty", async () => {
		mockGetConnectionHistory.mockResolvedValue([
			{ endpoint: "localhost:2379" },
		]);
		mockListConnections.mockResolvedValue([]);

		render(<ClusterSidebar {...defaultProps} />);

		await waitFor(() =>
			expect(screen.getByText("localhost:2379")).toBeInTheDocument(),
		);

		fireEvent.click(screen.getByText("localhost:2379"));

		await waitFor(() => {
			expect(mockSetActiveConnectionId).toHaveBeenCalled();
		});

		const calledWithId = mockSetActiveConnectionId.mock.calls[0][0];

		expect(isValidUUID(calledWithId)).toBe(true);
		expect(calledWithId).not.toBe("localhost:2379");
	});

	it("should still use active connection UUID when listConnections returns a match", async () => {
		const activeUuid = "550e8400-e29b-41d4-a716-446655440000";
		mockGetConnectionHistory.mockResolvedValue([
			{ endpoint: "localhost:2379" },
		]);
		mockListConnections.mockResolvedValue([
			[activeUuid, "localhost:2379"],
		]);

		render(<ClusterSidebar {...defaultProps} />);

		await waitFor(() =>
			expect(screen.getByText("localhost:2379")).toBeInTheDocument(),
		);

		fireEvent.click(screen.getByText("localhost:2379"));

		await waitFor(() => {
			expect(mockSetActiveConnectionId).toHaveBeenCalledWith(activeUuid);
		});
	});
});
