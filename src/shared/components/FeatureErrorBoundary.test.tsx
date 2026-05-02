import { fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { FeatureErrorBoundary } from "./FeatureErrorBoundary";

function ThrowError({ message }: { message: string }) {
	useEffect(() => {
		throw new Error(message);
	}, [message]);
	return <div data-testid="child">Should not render</div>;
}

function NormalChild() {
	return <div data-testid="normal-child">I am fine</div>;
}

describe("FeatureErrorBoundary", () => {
	const originalConsoleError = console.error;
	beforeEach(() => {
		console.error = vi.fn();
	});
	afterEach(() => {
		console.error = originalConsoleError;
	});

	it("should render children when there is no error", () => {
		render(
			<FeatureErrorBoundary featureName="Test Feature">
				<NormalChild />
			</FeatureErrorBoundary>,
		);

		expect(screen.getByTestId("normal-child")).toBeInTheDocument();
		expect(screen.getByText("I am fine")).toBeInTheDocument();
	});

	it("should show fallback UI with feature name when child throws", () => {
		render(
			<FeatureErrorBoundary featureName="Keys Browser">
				<ThrowError message="Something went wrong" />
			</FeatureErrorBoundary>,
		);

		expect(
			screen.getByText('Keys Browser encountered an error'),
		).toBeInTheDocument();
		expect(screen.getByText("Something went wrong")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
	});

	it("should show generic message when error has no message", () => {
		const ErrorWithoutMessage = () => {
			useEffect(() => {
				const err = new Error();
				err.message = "";
				throw err;
			}, []);
			return null;
		};

		render(
			<FeatureErrorBoundary featureName="Watch Panel">
				<ErrorWithoutMessage />
			</FeatureErrorBoundary>,
		);

		expect(
			screen.getByText("Watch Panel encountered an error"),
		).toBeInTheDocument();
		expect(
			screen.getByText("An unexpected error occurred."),
		).toBeInTheDocument();
	});

	it("should retry and re-render children after clicking retry", () => {
		let shouldThrow = true;

		function ConditionalThrow() {
			useEffect(() => {
				if (shouldThrow) {
					throw new Error("Temporary error");
				}
			}, []);
			return <div data-testid="recovered-child">Recovered!</div>;
		}

		const { rerender } = render(
			<FeatureErrorBoundary featureName="Lease Panel">
				<ConditionalThrow />
			</FeatureErrorBoundary>,
		);

		expect(
			screen.getByText("Lease Panel encountered an error"),
		).toBeInTheDocument();

		shouldThrow = false;

		fireEvent.click(screen.getByRole("button", { name: /retry/i }));

		rerender(
			<FeatureErrorBoundary featureName="Lease Panel">
				<ConditionalThrow />
			</FeatureErrorBoundary>,
		);

		expect(screen.getByTestId("recovered-child")).toBeInTheDocument();
		expect(screen.getByText("Recovered!")).toBeInTheDocument();
	});

	it("should call console.error with feature name when error is caught", () => {
		render(
			<FeatureErrorBoundary featureName="Cluster Sidebar">
				<ThrowError message="Cluster load failed" />
			</FeatureErrorBoundary>,
		);

		expect(console.error).toHaveBeenCalled();
		const calls = (console.error as ReturnType<typeof vi.fn>).mock.calls;
		const featureErrorCall = calls.find((call) =>
			call.some(
				(arg) =>
					typeof arg === "string" &&
					arg.includes('FeatureErrorBoundary caught error in "Cluster Sidebar"'),
			),
		);
		expect(featureErrorCall).toBeTruthy();
	});
});
