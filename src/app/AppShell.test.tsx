import { fireEvent, render, screen } from "@testing-library/react";
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

vi.mock("@/shared/hooks/use-keyboard-shortcuts", () => ({
	useKeyboardShortcuts: vi.fn(),
}));

import { AppShell } from "./AppShell";

describe("AppShell", () => {
	const defaultProps = {
		connectionId: null,
		onConnect: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render the welcome screen when not connected", () => {
		render(<AppShell {...defaultProps} />);

		expect(screen.getByText("Welcome to ETCD Compass")).toBeInTheDocument();
	});

	it("should render the Learn More button", () => {
		render(<AppShell {...defaultProps} />);

		expect(screen.getByText("LEARN MORE")).toBeInTheDocument();
	});

	it("should call open() with etcd quickstart URL when Learn More is clicked", () => {
		render(<AppShell {...defaultProps} />);

		const learnMoreButton = screen.getByText("LEARN MORE").closest("button");
		expect(learnMoreButton).toBeTruthy();
		if (learnMoreButton) fireEvent.click(learnMoreButton);

		expect(mockOpen).toHaveBeenCalledWith(
			"https://etcd.io/docs/v3.5/quickstart/",
		);
	});

	it("should render Add new connection button", () => {
		render(<AppShell {...defaultProps} />);

		expect(screen.getByText("Add new connection")).toBeInTheDocument();
	});

	it("should render tab navigation", () => {
		render(<AppShell {...defaultProps} />);

		expect(screen.getByRole("tab", { name: /keys/i })).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: /cluster/i })).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: /metrics/i })).toBeInTheDocument();
	});
});
