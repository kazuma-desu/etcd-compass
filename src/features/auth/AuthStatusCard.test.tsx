import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthStatusCard } from "./AuthStatusCard";

const mockFetchAuthStatus = vi.hoisted(() => vi.fn());
const mockToggleAuth = vi.hoisted(() => vi.fn());
const mockSetShowToggleAuthDialog = vi.hoisted(() => vi.fn());
const mockClearErrors = vi.hoisted(() => vi.fn());

const mockState = {
	authStatus: { enabled: false, auth_revision: 1 } as {
		enabled: boolean;
		auth_revision: number;
	} | null,
	authLoading: false,
	authError: null as string | null,
	showToggleAuthDialog: false,
};

vi.mock("./auth-store", () => ({
	useAuthStore: vi.fn((selector) => {
		const state = {
			...mockState,
			fetchAuthStatus: mockFetchAuthStatus,
			toggleAuth: mockToggleAuth,
			setShowToggleAuthDialog: mockSetShowToggleAuthDialog,
			clearErrors: mockClearErrors,
		};
		return selector ? selector(state) : state;
	}),
}));

describe("AuthStatusCard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockState.authStatus = { enabled: false, auth_revision: 1 };
		mockState.authLoading = false;
		mockState.authError = null;
		mockState.showToggleAuthDialog = false;
	});

	it("renders auth status card", () => {
		render(<AuthStatusCard connectionId="conn-1" />);

		expect(screen.getByText("Authentication")).toBeInTheDocument();
		expect(screen.getByText("Disabled")).toBeInTheDocument();
	});

	it("shows disabled status when auth is disabled", () => {
		render(<AuthStatusCard connectionId="conn-1" />);

		expect(screen.getByText("Disabled")).toBeInTheDocument();
		expect(screen.getByText("Authentication is inactive")).toBeInTheDocument();
		expect(
			screen.getByText("No credentials required to connect"),
		).toBeInTheDocument();
	});

	it("shows enabled status when auth is enabled", () => {
		mockState.authStatus = { enabled: true, auth_revision: 42 };

		render(<AuthStatusCard connectionId="conn-1" />);

		expect(screen.getByText("Enabled")).toBeInTheDocument();
		expect(screen.getByText("Authentication is active")).toBeInTheDocument();
		expect(
			screen.getByText("All connections require valid credentials"),
		).toBeInTheDocument();
		expect(screen.getByText("42")).toBeInTheDocument();
	});

	it("calls fetchAuthStatus on mount", () => {
		render(<AuthStatusCard connectionId="conn-1" />);

		expect(mockFetchAuthStatus).toHaveBeenCalledWith("conn-1");
	});

	it("shows loading state", () => {
		mockState.authStatus = null;
		mockState.authLoading = true;

		const { container } = render(<AuthStatusCard connectionId="conn-1" />);

		const skeletons = container.querySelectorAll("[data-slot='skeleton']");
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it("shows error state with retry button", () => {
		mockState.authStatus = null;
		mockState.authError = "Connection refused";

		render(<AuthStatusCard connectionId="conn-1" />);

		expect(
			screen.getByText("Failed to load authentication status"),
		).toBeInTheDocument();
		expect(screen.getByText("Connection refused")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: /retry/i }));
		expect(mockClearErrors).toHaveBeenCalled();
		expect(mockFetchAuthStatus).toHaveBeenCalledWith("conn-1");
	});

	it("opens toggle dialog when switch is clicked", () => {
		render(<AuthStatusCard connectionId="conn-1" />);

		const toggleSwitch = screen.getByRole("switch", {
			name: /toggle authentication/i,
		});
		fireEvent.click(toggleSwitch);

		expect(mockSetShowToggleAuthDialog).toHaveBeenCalledWith(true);
	});

	it("shows unavailable state when authStatus is null and not loading", () => {
		mockState.authStatus = null;
		mockState.authLoading = false;

		render(<AuthStatusCard connectionId="conn-1" />);

		expect(
			screen.getByText("Authentication status unavailable"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Connect to a cluster to view auth status"),
		).toBeInTheDocument();
	});

	it("calls fetchAuthStatus when refresh button is clicked", () => {
		render(<AuthStatusCard connectionId="conn-1" />);

		const refreshButton = screen.getByRole("button", { name: /refresh/i });
		fireEvent.click(refreshButton);

		expect(mockFetchAuthStatus).toHaveBeenCalledWith("conn-1");
	});

	it("closes toggle dialog when cancel is clicked", () => {
		mockState.showToggleAuthDialog = true;

		render(<AuthStatusCard connectionId="conn-1" />);

		const cancelButton = screen.getByRole("button", { name: /cancel/i });
		fireEvent.click(cancelButton);

		expect(mockSetShowToggleAuthDialog).toHaveBeenCalledWith(false);
	});

	it("calls toggleAuth when confirm is clicked in dialog", () => {
		mockState.showToggleAuthDialog = true;

		render(<AuthStatusCard connectionId="conn-1" />);

		const confirmButton = screen.getByRole("button", { name: /enable/i });
		fireEvent.click(confirmButton);

		expect(mockToggleAuth).toHaveBeenCalledWith("conn-1");
	});

	it("shows disable button in dialog when auth is enabled", () => {
		mockState.authStatus = { enabled: true, auth_revision: 42 };
		mockState.showToggleAuthDialog = true;

		render(<AuthStatusCard connectionId="conn-1" />);

		expect(
			screen.getByRole("button", { name: /disable/i }),
		).toBeInTheDocument();
	});
});
