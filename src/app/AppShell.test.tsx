import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock @tauri-apps/plugin-shell
const mockOpen = vi.fn();
vi.mock("@tauri-apps/plugin-shell", () => ({
	open: (...args: unknown[]) => mockOpen(...args),
}));

// Mock heavy child components to isolate AppShell
vi.mock("@/features/cluster/ClusterSidebar", () => ({
	ClusterSidebar: ({ onAddCluster }: { onAddCluster: () => void }) => (
		<div data-testid="cluster-sidebar">
			<button type="button" onClick={onAddCluster}>
				mock-add-cluster
			</button>
		</div>
	),
}));

vi.mock("@/features/cluster/ClusterStatus", () => ({
	ClusterStatus: () => <div data-testid="cluster-status" />,
}));

vi.mock("@/features/cluster/MetricsDashboard", () => ({
	MetricsDashboard: () => <div data-testid="metrics-dashboard" />,
}));

vi.mock("@/features/connections/ConnectionForm", () => ({
	ConnectionForm: () => <div data-testid="connection-form" />,
}));

vi.mock("@/features/keys/KeyBrowser", () => ({
	KeyBrowser: () => <div data-testid="key-browser" />,
}));

vi.mock("@/features/keys/KeyDetail", () => ({
	KeyDetail: () => <div data-testid="key-detail" />,
}));

vi.mock("@/features/keys/QueryBar", () => ({
	QueryBar: () => <div data-testid="query-bar" />,
}));

vi.mock("@/features/leases/LeasePanel", () => ({
	LeasePanel: () => <div data-testid="lease-panel" />,
}));

vi.mock("@/features/watch/WatchPanel", () => ({
	WatchPanel: () => <div data-testid="watch-panel" />,
}));

vi.mock("@/shared/components/BreadcrumbNav", () => ({
	BreadcrumbNav: () => <div data-testid="breadcrumb-nav" />,
}));

vi.mock("@/shared/components/ShortcutHelp", () => ({
	ShortcutHelp: () => <div data-testid="shortcut-help" />,
}));

vi.mock("@/shared/components/TabBar", () => ({
	TabBar: () => <div data-testid="tab-bar" />,
}));

vi.mock("@/components/ui/resizable", () => ({
	ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="resizable-panel-group">{children}</div>
	),
	ResizablePanel: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="resizable-panel">{children}</div>
	),
	ResizableHandle: () => <div data-testid="resizable-handle" />,
}));

vi.mock("@/shared/hooks/use-keyboard-shortcuts", () => ({
	useKeyboardShortcuts: vi.fn(),
}));

import {
	buildConnectionPhaseOrder,
	useConnectionStore,
} from "@/features/connections/connection-store";
import { AppShell } from "./AppShell";

describe("AppShell", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockOpen.mockResolvedValue(undefined);
		useConnectionStore.setState({
			connectionId: null,
			isConnecting: false,
			phase: "disconnected",
			phaseOrder: buildConnectionPhaseOrder(false),
			connectionError: "",
			config: {
				endpoint: "localhost:2379",
				username: "",
				password: "",
				tls_enabled: false,
				ca_cert_path: "",
				client_cert_path: "",
				client_key_path: "",
				skip_verify: false,
			},
		});
	});

	it("should render the welcome screen when not connected", () => {
		render(<AppShell />);

		expect(screen.getByText("Welcome to ETCD Compass")).toBeInTheDocument();
	});

	it("should render the Learn More button", () => {
		render(<AppShell />);

		expect(screen.getByText("LEARN MORE")).toBeInTheDocument();
	});

	it("should call open() with etcd quickstart URL when Learn More is clicked", () => {
		render(<AppShell />);

		const learnMoreButton = screen.getByText("LEARN MORE").closest("button");
		expect(learnMoreButton).toBeTruthy();
		if (learnMoreButton) fireEvent.click(learnMoreButton);

		expect(mockOpen).toHaveBeenCalledWith(
			"https://etcd.io/docs/v3.5/quickstart/",
		);
	});

	it("should show an error when Learn More cannot be opened", async () => {
		mockOpen.mockRejectedValueOnce(new Error("permission denied"));
		render(<AppShell />);

		const learnMoreButton = screen.getByText("LEARN MORE").closest("button");
		expect(learnMoreButton).toBeTruthy();
		if (learnMoreButton) fireEvent.click(learnMoreButton);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(
				"Unable to open the ETCD quickstart guide.",
			);
		});
	});

	it("should render Add new connection button", () => {
		render(<AppShell />);

		expect(screen.getByText("Add new connection")).toBeInTheDocument();
	});

	it("should render tab navigation", () => {
		render(<AppShell />);

		expect(screen.getByRole("tab", { name: /keys/i })).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: /cluster/i })).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: /metrics/i })).toBeInTheDocument();
	});

	it("should render anonymous in-progress connection steps", () => {
		useConnectionStore.setState({
			isConnecting: true,
			phase: "connecting",
			connectionId: null,
			phaseOrder: buildConnectionPhaseOrder(false),
			config: {
				endpoint: "localhost:2379",
				username: "",
				password: "",
				tls_enabled: false,
				ca_cert_path: "",
				client_cert_path: "",
				client_key_path: "",
				skip_verify: false,
			},
		});

		render(<AppShell />);

		expect(screen.getByText("Connecting to ETCD")).toBeInTheDocument();
		expect(screen.getAllByText("Establishing connection")).toHaveLength(2);
		expect(screen.getByText("Step 1 of 1")).toBeInTheDocument();
		expect(screen.queryByText("Authenticating")).not.toBeInTheDocument();
	});

	it("should render authenticated in-progress connection steps", () => {
		useConnectionStore.setState({
			isConnecting: true,
			phase: "authenticating",
			connectionId: null,
			phaseOrder: buildConnectionPhaseOrder(true),
			config: {
				endpoint: "localhost:2379",
				username: "x",
				password: "y",
				tls_enabled: false,
				ca_cert_path: "",
				client_cert_path: "",
				client_key_path: "",
				skip_verify: false,
			},
		});

		render(<AppShell />);

		expect(screen.getByText("Connecting to ETCD")).toBeInTheDocument();
		expect(screen.getAllByText("Authenticating")).toHaveLength(2);
		expect(screen.getByText("Step 2 of 2")).toBeInTheDocument();
	});

	it("should render key browser when connected", () => {
		useConnectionStore.setState({ connectionId: "test-uuid-123" });
		render(<AppShell />);

		expect(screen.getByTestId("key-browser")).toBeInTheDocument();
		expect(screen.getByTestId("query-bar")).toBeInTheDocument();
	});
});
