import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UsersTab } from "./UsersTab";

const mockFetchUsers = vi.hoisted(() => vi.fn());
const mockFetchRoles = vi.hoisted(() => vi.fn());
const mockAddUser = vi.hoisted(() => vi.fn());
const mockDeleteUser = vi.hoisted(() => vi.fn());
const mockGrantRoleToUser = vi.hoisted(() => vi.fn());
const mockRevokeRoleFromUser = vi.hoisted(() => vi.fn());
const mockSetShowAddUserDialog = vi.hoisted(() => vi.fn());
const mockSetShowDeleteUserDialog = vi.hoisted(() => vi.fn());
const mockSetShowGrantRoleDialog = vi.hoisted(() => vi.fn());
const mockSetShowRevokeRoleDialog = vi.hoisted(() => vi.fn());
const mockSetNewUserName = vi.hoisted(() => vi.fn());
const mockSetNewUserPassword = vi.hoisted(() => vi.fn());
const mockSetSelectedUser = vi.hoisted(() => vi.fn());
const mockSetSelectedRoleForUser = vi.hoisted(() => vi.fn());
const mockClearErrors = vi.hoisted(() => vi.fn());

const mockState = {
	users: [] as Array<{ name: string; roles: string[] }>,
	usersLoading: false,
	usersError: null as string | null,
	roles: [] as Array<{ name: string }>,
	showAddUserDialog: false,
	showDeleteUserDialog: false,
	showGrantRoleDialog: false,
	showRevokeRoleDialog: false,
	newUserName: "",
	newUserPassword: "",
	selectedUser: null as { name: string; roles: string[] } | null,
	selectedRoleForUser: "",
};

vi.mock("./auth-store", () => ({
	useAuthStore: vi.fn((selector) => {
		const state = {
			...mockState,
			fetchUsers: mockFetchUsers,
			fetchRoles: mockFetchRoles,
			addUser: mockAddUser,
			deleteUser: mockDeleteUser,
			grantRoleToUser: mockGrantRoleToUser,
			revokeRoleFromUser: mockRevokeRoleFromUser,
			setShowAddUserDialog: mockSetShowAddUserDialog,
			setShowDeleteUserDialog: mockSetShowDeleteUserDialog,
			setShowGrantRoleDialog: mockSetShowGrantRoleDialog,
			setShowRevokeRoleDialog: mockSetShowRevokeRoleDialog,
			setNewUserName: mockSetNewUserName,
			setNewUserPassword: mockSetNewUserPassword,
			setSelectedUser: mockSetSelectedUser,
			setSelectedRoleForUser: mockSetSelectedRoleForUser,
			clearErrors: mockClearErrors,
		};
		return selector ? selector(state) : state;
	}),
}));

describe("UsersTab", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockState.users = [];
		mockState.usersLoading = false;
		mockState.usersError = null;
		mockState.roles = [];
		mockState.showAddUserDialog = false;
		mockState.showDeleteUserDialog = false;
		mockState.showGrantRoleDialog = false;
		mockState.showRevokeRoleDialog = false;
		mockState.newUserName = "";
		mockState.newUserPassword = "";
		mockState.selectedUser = null;
		mockState.selectedRoleForUser = "";
	});

	it("fetches users and roles on mount", () => {
		render(<UsersTab connectionId="conn-1" />);
		expect(mockFetchUsers).toHaveBeenCalledWith("conn-1");
		expect(mockFetchRoles).toHaveBeenCalledWith("conn-1");
	});

	it("renders loading state", () => {
		mockState.usersLoading = true;
		render(<UsersTab connectionId="conn-1" />);
		expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
	});

	it("renders error state with retry", () => {
		mockState.usersError = "network error";
		render(<UsersTab connectionId="conn-1" />);
		expect(screen.getByText("Failed to load users")).toBeInTheDocument();
		expect(screen.getByText("network error")).toBeInTheDocument();

		fireEvent.click(screen.getByText("Retry"));
		expect(mockClearErrors).toHaveBeenCalled();
		expect(mockFetchUsers).toHaveBeenCalledWith("conn-1");
	});

	it("renders empty state", () => {
		render(<UsersTab connectionId="conn-1" />);
		expect(screen.getByText("No users found")).toBeInTheDocument();
	});

	it("renders users with roles", () => {
		mockState.users = [
			{ name: "alice", roles: ["admin", "dev"] },
			{ name: "bob", roles: [] },
		];
		mockState.roles = [{ name: "admin" }, { name: "dev" }, { name: "ops" }];
		render(<UsersTab connectionId="conn-1" />);

		expect(screen.getByText("alice")).toBeInTheDocument();
		expect(screen.getByText("bob")).toBeInTheDocument();
		expect(screen.getByText("admin")).toBeInTheDocument();
		expect(screen.getByText("dev")).toBeInTheDocument();
		expect(screen.getByText("No roles")).toBeInTheDocument();
	});

	it("opens add user dialog", () => {
		render(<UsersTab connectionId="conn-1" />);
		fireEvent.click(screen.getByText("Add User"));
		expect(mockSetNewUserName).toHaveBeenCalledWith("");
		expect(mockSetNewUserPassword).toHaveBeenCalledWith("");
		expect(mockSetShowAddUserDialog).toHaveBeenCalledWith(true);
	});

	it("calls addUser on confirm", () => {
		mockState.showAddUserDialog = true;
		mockState.newUserName = "alice";
		render(<UsersTab connectionId="conn-1" />);
		const buttons = screen.getAllByRole("button");
		const addBtn = buttons.find(
			(b) =>
				b.textContent?.includes("Add User") &&
				!(b as HTMLButtonElement).disabled,
		);
		expect(addBtn).toBeDefined();
		if (addBtn) fireEvent.click(addBtn);
		expect(mockAddUser).toHaveBeenCalledWith("conn-1");
	});

	it("disables add user when name is empty", () => {
		mockState.showAddUserDialog = true;
		render(<UsersTab connectionId="conn-1" />);
		const addBtn = screen
			.getAllByText("Add User")
			.find((el) => el.closest("button")?.disabled);
		expect(addBtn).toBeDefined();
	});

	it("opens delete dialog on delete click", () => {
		mockState.users = [{ name: "alice", roles: [] }];
		render(<UsersTab connectionId="conn-1" />);
		fireEvent.click(screen.getByText("Delete"));
		expect(mockSetSelectedUser).toHaveBeenCalledWith({
			name: "alice",
			roles: [],
		});
		expect(mockSetShowDeleteUserDialog).toHaveBeenCalledWith(true);
	});

	it("calls deleteUser on confirm", () => {
		mockState.showDeleteUserDialog = true;
		mockState.selectedUser = { name: "alice", roles: [] };
		render(<UsersTab connectionId="conn-1" />);
		fireEvent.click(screen.getByText("Delete"));
		expect(mockDeleteUser).toHaveBeenCalledWith("conn-1");
	});

	it("opens grant role dialog", () => {
		mockState.users = [{ name: "alice", roles: [] }];
		mockState.roles = [{ name: "admin" }];
		render(<UsersTab connectionId="conn-1" />);
		fireEvent.click(screen.getByText("Grant"));
		expect(mockSetSelectedUser).toHaveBeenCalledWith({
			name: "alice",
			roles: [],
		});
		expect(mockSetSelectedRoleForUser).toHaveBeenCalledWith("");
		expect(mockSetShowGrantRoleDialog).toHaveBeenCalledWith(true);
	});

	it("calls grantRoleToUser on confirm", () => {
		mockState.showGrantRoleDialog = true;
		mockState.selectedUser = { name: "alice", roles: [] };
		mockState.selectedRoleForUser = "admin";
		render(<UsersTab connectionId="conn-1" />);
		fireEvent.click(screen.getByText("Grant Role"));
		expect(mockGrantRoleToUser).toHaveBeenCalledWith("conn-1");
	});

	it("revokes role on badge click", () => {
		mockState.users = [{ name: "alice", roles: ["admin"] }];
		render(<UsersTab connectionId="conn-1" />);
		fireEvent.click(screen.getByText("admin"));
		expect(mockSetSelectedUser).toHaveBeenCalledWith({
			name: "alice",
			roles: ["admin"],
		});
		expect(mockSetSelectedRoleForUser).toHaveBeenCalledWith("admin");
		expect(mockSetShowRevokeRoleDialog).toHaveBeenCalledWith(true);
	});

	it("calls revokeRoleFromUser on confirm", () => {
		mockState.showRevokeRoleDialog = true;
		mockState.selectedUser = { name: "alice", roles: ["admin"] };
		mockState.selectedRoleForUser = "admin";
		render(<UsersTab connectionId="conn-1" />);
		fireEvent.click(screen.getByText("Revoke"));
		expect(mockRevokeRoleFromUser).toHaveBeenCalledWith("conn-1");
	});

	it("disables grant when no available roles", () => {
		mockState.users = [{ name: "alice", roles: ["admin"] }];
		mockState.roles = [{ name: "admin" }];
		render(<UsersTab connectionId="conn-1" />);
		const grantBtn = screen.getByText("Grant").closest("button");
		expect(grantBtn).toBeDisabled();
	});

	it("refreshes on refresh button click", () => {
		render(<UsersTab connectionId="conn-1" />);
		fireEvent.click(screen.getByText("Refresh"));
		expect(mockFetchUsers).toHaveBeenCalledWith("conn-1");
	});
});
