import { fireEvent, render, screen } from "@testing-library/react";
import { Component, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

// =============================================================================
// REGRESSION TEST: Missing Error Boundary (Bug #1)
// =============================================================================
// Bug: Any unhandled render error would crash the entire app and show a blank
// screen because there was no top-level error boundary.
// Fix: Created ErrorBoundary component with fallback UI and wrapped AppShell.
// These tests verify the boundary catches errors and renders fallback UI
// instead of letting the app crash to a blank screen.
// =============================================================================

class ThrowError extends Component<{ readonly message: string }> {
	private hasThrown = false;
	render(): ReactNode {
		if (!this.hasThrown) {
			this.hasThrown = true;
			throw new Error(this.props.message);
		}
		return null;
	}
}

function NoThrow() {
	return <div data-testid="safe-child">Safe content</div>;
}

describe("ErrorBoundary", () => {
	const originalConsoleError = console.error;

	it("should render children when no error occurs", () => {
		render(
			<ErrorBoundary>
				<NoThrow />
			</ErrorBoundary>,
		);

		expect(screen.getByTestId("safe-child")).toBeInTheDocument();
	});

	it("should show fallback UI when a child component throws", () => {
		console.error = vi.fn();

		render(
			<ErrorBoundary>
				<ThrowError message="Test error" />
			</ErrorBoundary>,
		);

		expect(screen.getByText("Something went wrong")).toBeInTheDocument();
		expect(
			screen.getByText(
				"An unexpected error occurred in the application. You can try reloading to recover.",
			),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Something went wrong — please reload or contact support",
			),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Reload Application/i }),
		).toBeInTheDocument();

		console.error = originalConsoleError;
	});

	it("should call window.location.reload when Reload Application is clicked", () => {
		const mockReload = vi.fn();
		const originalLocation = window.location;
		Object.defineProperty(window, "location", {
			writable: true,
			value: { ...originalLocation, reload: mockReload },
		});

		console.error = vi.fn();

		render(
			<ErrorBoundary>
				<ThrowError message="Click test error" />
			</ErrorBoundary>,
		);

		const reloadButton = screen.getByRole("button", {
			name: /Reload Application/i,
		});
		fireEvent.click(reloadButton);

		expect(mockReload).toHaveBeenCalledTimes(1);

		Object.defineProperty(window, "location", {
			writable: true,
			value: originalLocation,
		});
		console.error = originalConsoleError;
	});

	it("should log error with component stack to console.error", () => {
		const mockConsoleError = vi.fn();
		console.error = mockConsoleError;

		render(
			<ErrorBoundary>
				<ThrowError message="Logging test error" />
			</ErrorBoundary>,
		);

		expect(mockConsoleError).toHaveBeenCalled();
		const calls = mockConsoleError.mock.calls;
		expect(
			calls.some((call) => call[0] === "ErrorBoundary caught an error:"),
		).toBe(true);
		expect(
			calls.some((call) =>
				call.some(
					(arg) =>
						typeof arg === "string" && arg.includes("Logging test error"),
				),
			),
		).toBe(true);
		expect(
			calls.some((call) =>
				call.some(
					(arg) => typeof arg === "string" && arg.includes("Component stack"),
				),
			),
		).toBe(true);

		console.error = originalConsoleError;
	});
});
