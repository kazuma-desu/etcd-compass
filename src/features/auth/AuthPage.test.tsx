import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthPage } from "./AuthPage";

vi.mock("./AuthStatusCard", () => ({
	AuthStatusCard: ({ connectionId }: { connectionId: string }) => (
		<div data-testid="auth-status-card">Status: {connectionId}</div>
	),
}));

vi.mock("./UsersTab", () => ({
	UsersTab: ({ connectionId }: { connectionId: string }) => (
		<div data-testid="users-tab">Users: {connectionId}</div>
	),
}));

vi.mock("./RolesTab", () => ({
	RolesTab: ({ connectionId }: { connectionId: string }) => (
		<div data-testid="roles-tab">Roles: {connectionId}</div>
	),
}));

describe("AuthPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders auth page with status tab active by default", () => {
		render(<AuthPage connectionId="conn-123" />);

		expect(screen.getByText("Authentication")).toBeInTheDocument();
		expect(screen.getByTestId("auth-status-card")).toBeInTheDocument();
		expect(screen.getByText("Status: conn-123")).toBeInTheDocument();
	});

	it("renders all three tabs", () => {
		render(<AuthPage connectionId="conn-123" />);

		expect(screen.getByRole("tab", { name: /status/i })).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: /users/i })).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: /roles/i })).toBeInTheDocument();
	});

	it("switches to users tab when clicked", async () => {
		render(<AuthPage connectionId="conn-123" />);

		const usersTab = screen.getByRole("tab", { name: /users/i });
		await userEvent.click(usersTab);

		expect(screen.getByTestId("users-tab")).toBeInTheDocument();
		expect(screen.getByText("Users: conn-123")).toBeInTheDocument();
	});

	it("switches to roles tab when clicked", async () => {
		render(<AuthPage connectionId="conn-123" />);

		const rolesTab = screen.getByRole("tab", { name: /roles/i });
		await userEvent.click(rolesTab);

		expect(screen.getByTestId("roles-tab")).toBeInTheDocument();
		expect(screen.getByText("Roles: conn-123")).toBeInTheDocument();
	});

	it("passes connectionId to child components", async () => {
		render(<AuthPage connectionId="my-connection" />);

		expect(screen.getByText("Status: my-connection")).toBeInTheDocument();

		await userEvent.click(screen.getByRole("tab", { name: /users/i }));
		expect(screen.getByText("Users: my-connection")).toBeInTheDocument();

		await userEvent.click(screen.getByRole("tab", { name: /roles/i }));
		expect(screen.getByText("Roles: my-connection")).toBeInTheDocument();
	});
});
