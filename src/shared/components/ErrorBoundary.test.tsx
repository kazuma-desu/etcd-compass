import { fireEvent, render, screen } from "@testing-library/react";
import { Component, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

class ThrowError extends Component<{ readonly message: string }> {
	render(): ReactNode {
		throw new Error(this.props.message);
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
		expect(screen.getByText("Test error")).toBeInTheDocument();
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
		expect(calls.some((call) => call[0] === "ErrorBoundary caught an error:")).toBe(
			true,
		);
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
					(arg) =>
						typeof arg === "string" && arg.includes("Component stack"),
				),
			),
		).toBe(true);

		console.error = originalConsoleError;
	});
});
