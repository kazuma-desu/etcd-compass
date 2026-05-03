import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

// =============================================================================
// REGRESSION TEST: WatchPanel Unhandled Promise Rejections (Bug #6)
// =============================================================================
// Bug: Async errors in startWatching, stopWatching, setupListener, and unmount
// cleanup were silently logged to console.error instead of being shown to the
// user. Unhandled floating promises also caused Vitest unhandled rejection
// warnings and potential crashes.
// Fix: Replaced console.error with toast.error() user-facing notifications;
// all floating promises now have .catch() handlers.
// =============================================================================

const mockWatchKey = vi.fn();
const mockUnwatchKey = vi.fn();
const mockOnWatchEvent = vi.fn();

vi.mock("@/commands/watch", () => ({
	watchKey: (...args: unknown[]) => mockWatchKey(...args),
	unwatchKey: (...args: unknown[]) => mockUnwatchKey(...args),
	onWatchEvent: (...args: unknown[]) => mockOnWatchEvent(...args),
}));

vi.mock("@/components/ui/badge", () => ({
	Badge: ({
		children,
		variant,
	}: {
		children?: React.ReactNode;
		variant?: string;
	}) => (
		<span data-testid="badge" data-variant={variant}>
			{children}
		</span>
	),
}));

vi.mock("@/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		disabled,
	}: {
		children?: React.ReactNode;
		onClick?: () => void;
		disabled?: boolean;
	}) => (
		<button type="button" onClick={onClick} disabled={disabled}>
			{children}
		</button>
	),
}));

vi.mock("@/components/ui/input", () => ({
	Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
		<input {...props} />
	),
}));

vi.mock("@/components/ui/label", () => ({
	Label: ({
		children,
		htmlFor,
	}: {
		children?: React.ReactNode;
		htmlFor?: string;
	}) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
	ScrollArea: ({ children }: { children?: React.ReactNode }) => (
		<div>{children}</div>
	),
}));

vi.mock("@/components/ui/switch", () => ({
	Switch: ({
		checked,
		onCheckedChange,
		disabled,
	}: {
		checked?: boolean;
		onCheckedChange?: (v: boolean) => void;
		disabled?: boolean;
	}) => (
		<input
			type="checkbox"
			checked={checked}
			onChange={(e) => onCheckedChange?.(e.target.checked)}
			disabled={disabled}
			data-testid="prefix-switch"
		/>
	),
}));

import { WatchPanel } from "./WatchPanel";

describe("WatchPanel error handling regression", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockOnWatchEvent.mockResolvedValue(() => {});
	});

	it("should show toast.error when watch start fails", async () => {
		mockWatchKey.mockRejectedValueOnce(new Error("connection refused"));

		render(<WatchPanel connectionId="conn-123" />);

		const input = screen.getByPlaceholderText(
			"Enter key to watch (e.g., /config/app)",
		);
		fireEvent.change(input, { target: { value: "/test/key" } });

		const startButton = screen.getByText("Start Watching");
		fireEvent.click(startButton);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Failed to start watch");
		});
	});

	it("should show toast.error when watch stop fails", async () => {
		mockWatchKey.mockResolvedValueOnce({ watch_id: "watch-abc" });
		mockUnwatchKey
			.mockRejectedValueOnce(new Error("network error"))
			.mockResolvedValue(undefined);

		render(<WatchPanel connectionId="conn-123" />);

		const input = screen.getByPlaceholderText(
			"Enter key to watch (e.g., /config/app)",
		);
		fireEvent.change(input, { target: { value: "/test/key" } });

		const startButton = screen.getByText("Start Watching");
		fireEvent.click(startButton);

		await waitFor(() => {
			expect(screen.getByText("Stop Watching")).toBeInTheDocument();
		});

		const stopButton = screen.getByText("Stop Watching");
		fireEvent.click(stopButton);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Failed to stop watch");
		});
	});

	it("should show toast.error when setupListener fails", async () => {
		mockOnWatchEvent.mockRejectedValueOnce(
			new Error("event system unavailable"),
		);

		render(<WatchPanel connectionId="conn-123" />);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(
				"Failed to set up watch listener",
			);
		});
	});

	it("should show toast.error when unmount cleanup fails", async () => {
		mockWatchKey.mockResolvedValueOnce({ watch_id: "watch-xyz" });
		mockUnwatchKey.mockRejectedValueOnce(new Error("cleanup failed"));

		const { unmount } = render(<WatchPanel connectionId="conn-123" />);

		const input = screen.getByPlaceholderText(
			"Enter key to watch (e.g., /config/app)",
		);
		fireEvent.change(input, { target: { value: "/test/key" } });

		const startButton = screen.getByText("Start Watching");
		fireEvent.click(startButton);

		await waitFor(() => {
			expect(screen.getByText("Stop Watching")).toBeInTheDocument();
		});

		unmount();

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(
				"Failed to clean up watch on unmount",
			);
		});
	});

	describe("WatchPanel UI states", () => {
		it("should show connect prompt when no connectionId is provided", () => {
			render(<WatchPanel connectionId={null as unknown as string} />);
			expect(screen.getByText("Connect to use watch.")).toBeInTheDocument();
		});

		it("should truncate long values in the UI", async () => {
			mockWatchKey.mockResolvedValueOnce({ watch_id: "watch-abc" });
			mockOnWatchEvent.mockResolvedValue(() => {});

			render(<WatchPanel connectionId="conn-123" />);

			const input = screen.getByPlaceholderText(
				"Enter key to watch (e.g., /config/app)",
			);
			fireEvent.change(input, { target: { value: "/test/key" } });

			const startButton = screen.getByText("Start Watching");
			fireEvent.click(startButton);

			await waitFor(() => {
				expect(screen.getByText("Stop Watching")).toBeInTheDocument();
			});
		});
	});
});
