import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock command modules
const mockGetConnectionHistory = vi.fn().mockResolvedValue([]);
const mockImportConnections = vi.fn().mockResolvedValue(undefined);
const mockListConnections = vi.fn().mockResolvedValue([]);
const mockOpenFileDialog = vi.fn();
const mockReadFile = vi.fn();

vi.mock("@/commands/config", () => ({
	getConnectionHistory: (...args: unknown[]) =>
		mockGetConnectionHistory(...args),
	importConnections: (...args: unknown[]) => mockImportConnections(...args),
	removeFromHistory: vi.fn(),
	updateConnectionFavorite: vi.fn(),
	duplicateConnection: vi.fn(),
}));

vi.mock("@/commands/connection", () => ({
	disconnectEtcd: vi.fn(),
	listConnections: (...args: unknown[]) => mockListConnections(...args),
}));

vi.mock("@/commands/native", () => ({
	openFileDialog: (...args: unknown[]) => mockOpenFileDialog(...args),
	readFile: (...args: unknown[]) => mockReadFile(...args),
	saveFileDialog: vi.fn(),
	writeFile: vi.fn(),
}));

vi.mock("@/features/connections/connection-store", () => ({
	useConnectionStore: () => ({
		connectionId: null,
		disconnect: vi.fn(),
		setActiveConnectionId: vi.fn(),
	}),
}));

// Minimal sidebar context mock
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

// Mock dropdown and context menu to render content directly
type ClickP = { children?: React.ReactNode; onClick?: () => void };
vi.mock("@/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: P) => <div>{children}</div>,
	DropdownMenuContent: ({ children }: P) => <div>{children}</div>,
	DropdownMenuItem: ({ children, onClick }: ClickP) => (
		<button type="button" onClick={onClick}>
			{children}
		</button>
	),
	DropdownMenuSeparator: () => <hr />,
	DropdownMenuTrigger: ({ children }: P) => <div>{children}</div>,
}));

vi.mock("@/components/ui/context-menu", () => ({
	ContextMenu: ({ children }: P) => <div>{children}</div>,
	ContextMenuContent: ({ children }: P) => <div>{children}</div>,
	ContextMenuItem: ({ children, onClick }: ClickP) => (
		<button type="button" onClick={onClick}>
			{children}
		</button>
	),
	ContextMenuSeparator: () => <hr />,
	ContextMenuTrigger: ({ children }: P) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ThemeToggle", () => ({
	ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

import { ClusterSidebar } from "./ClusterSidebar";

describe("ClusterSidebar", () => {
	const defaultProps = {
		onAddCluster: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockGetConnectionHistory.mockResolvedValue([]);
		mockListConnections.mockResolvedValue([]);
	});

	it("should render the sidebar with Compass header", () => {
		render(<ClusterSidebar {...defaultProps} />);

		expect(screen.getByText("Compass")).toBeInTheDocument();
	});

	it("should show empty state when no connections exist", () => {
		render(<ClusterSidebar {...defaultProps} />);

		expect(
			screen.getByText("You have not connected to any deployments."),
		).toBeInTheDocument();
	});

	it("should render search input", () => {
		render(<ClusterSidebar {...defaultProps} />);

		expect(
			screen.getByPlaceholderText("Search connections"),
		).toBeInTheDocument();
	});

	describe("handleImportProfiles validation", () => {
		const triggerImport = async () => {
			render(<ClusterSidebar {...defaultProps} />);

			// The mocked DropdownMenu renders all items directly (no popup),
			// so we can click "Import connections" text directly.
			const importButtons = screen.getAllByText("Import connections");
			fireEvent.click(importButtons[0]);
		};

		it("should show error toast when file contains a non-array", async () => {
			mockOpenFileDialog.mockResolvedValue("/fake/path.json");
			mockReadFile.mockResolvedValue('{"not": "an array"}');

			await triggerImport();

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith(
					"Invalid file: expected an array of connections",
				);
			});
			expect(mockImportConnections).not.toHaveBeenCalled();
		});

		it("should skip entries missing endpoint and show count", async () => {
			mockOpenFileDialog.mockResolvedValue("/fake/path.json");
			mockReadFile.mockResolvedValue(
				JSON.stringify([
					{ endpoint: "localhost:2379" },
					{ name: "no-endpoint" },
					{ endpoint: "" },
				]),
			);

			await triggerImport();

			await waitFor(() => {
				expect(mockImportConnections).toHaveBeenCalledWith([
					{ endpoint: "localhost:2379" },
				]);
				expect(toast.success).toHaveBeenCalledWith(
					"1 connections imported (2 invalid entries skipped)",
				);
			});
		});

		it("should show error when all entries are invalid", async () => {
			mockOpenFileDialog.mockResolvedValue("/fake/path.json");
			mockReadFile.mockResolvedValue(
				JSON.stringify([{ name: "no-endpoint" }, { endpoint: "" }]),
			);

			await triggerImport();

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith(
					"No valid connections found (2 entries skipped — missing endpoint)",
				);
			});
			expect(mockImportConnections).not.toHaveBeenCalled();
		});

		it("should import all valid entries without skip message", async () => {
			mockOpenFileDialog.mockResolvedValue("/fake/path.json");
			mockReadFile.mockResolvedValue(
				JSON.stringify([
					{ endpoint: "localhost:2379" },
					{ endpoint: "localhost:2380", name: "second" },
				]),
			);

			await triggerImport();

			await waitFor(() => {
				expect(mockImportConnections).toHaveBeenCalledWith([
					{ endpoint: "localhost:2379" },
					{ endpoint: "localhost:2380", name: "second" },
				]);
				expect(toast.success).toHaveBeenCalledWith(
					"2 connections imported successfully",
				);
			});
		});

		it("should not import when user cancels file dialog", async () => {
			mockOpenFileDialog.mockResolvedValue(null);

			await triggerImport();

			await waitFor(() => {
				expect(mockImportConnections).not.toHaveBeenCalled();
			});
		});

		it("should show error toast on JSON parse failure", async () => {
			mockOpenFileDialog.mockResolvedValue("/fake/path.json");
			mockReadFile.mockResolvedValue("not valid json {{{");

			await triggerImport();

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith(
					expect.stringContaining("Failed to import connections:"),
				);
			});
		});
	});

	it("should show no-match state when filter has no results", async () => {
		mockGetConnectionHistory.mockResolvedValue([
			{ endpoint: "localhost:2379", name: "My Cluster" },
		]);
		mockListConnections.mockResolvedValue([]);
		render(<ClusterSidebar {...defaultProps} />);

		await waitFor(() =>
			expect(screen.getByText("My Cluster")).toBeInTheDocument(),
		);

		fireEvent.change(screen.getByPlaceholderText("Search connections"), {
			target: { value: "nonexistent" },
		});

		await waitFor(() =>
			expect(
				screen.getByText("No connections match your filter."),
			).toBeInTheDocument(),
		);
		expect(screen.getByText("Clear filter")).toBeInTheDocument();
	});

	it("should show onboarding state when zero connections exist", async () => {
		mockGetConnectionHistory.mockResolvedValue([]);
		mockListConnections.mockResolvedValue([]);
		render(<ClusterSidebar {...defaultProps} />);

		await waitFor(() =>
			expect(
				screen.getByText("You have not connected to any deployments."),
			).toBeInTheDocument(),
		);
		expect(screen.getByText("Add new connection")).toBeInTheDocument();
	});

	it("should show error toast when refresh fails", async () => {
		// Initial load succeeds
		mockGetConnectionHistory.mockResolvedValueOnce([]);
		mockListConnections.mockResolvedValueOnce([]);
		render(<ClusterSidebar {...defaultProps} />);

		// Wait for initial render to settle
		await waitFor(() => {
			expect(
				screen.getByText("You have not connected to any deployments."),
			).toBeInTheDocument();
		});

		// Now mock refresh to fail
		mockGetConnectionHistory.mockRejectedValueOnce(new Error("Refresh error"));

		const refreshButtons = screen.getAllByText("Refresh list");
		fireEvent.click(refreshButtons[0]);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(
				"Failed to refresh cluster list",
			);
		});
	});
});
