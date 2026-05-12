import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RolesTab } from "./RolesTab";

const mockFetchRoles = vi.hoisted(() => vi.fn());
const mockAddRole = vi.hoisted(() => vi.fn());
const mockDeleteRole = vi.hoisted(() => vi.fn());
const mockFetchRolePermissions = vi.hoisted(() => vi.fn());
const mockGrantPermission = vi.hoisted(() => vi.fn());
const mockRevokePermission = vi.hoisted(() => vi.fn());
const mockToggleRoleExpanded = vi.hoisted(() => vi.fn());
const mockSetShowAddRoleDialog = vi.hoisted(() => vi.fn());
const mockSetShowDeleteRoleDialog = vi.hoisted(() => vi.fn());
const mockSetShowGrantPermissionDialog = vi.hoisted(() => vi.fn());
const mockSetShowRevokePermissionDialog = vi.hoisted(() => vi.fn());
const mockSetNewRoleName = vi.hoisted(() => vi.fn());
const mockSetSelectedRole = vi.hoisted(() => vi.fn());
const mockSetPermissionType = vi.hoisted(() => vi.fn());
const mockSetPermissionKey = vi.hoisted(() => vi.fn());
const mockSetPermissionRangeEnd = vi.hoisted(() => vi.fn());

type RolePermMap = Map<
	string,
	{
		permissions: Array<{
			perm_type: string;
			key: string;
			range_end: string | null;
		}>;
	}
>;

const mockState = {
	roles: [] as Array<{ name: string }>,
	rolesLoading: false,
	rolesError: null as string | null,
	rolePermissions: new Map() as RolePermMap,
	expandedRoles: new Set<string>(),
	showAddRoleDialog: false,
	showDeleteRoleDialog: false,
	showGrantPermissionDialog: false,
	showRevokePermissionDialog: false,
	newRoleName: "",
	selectedRole: null as { name: string } | null,
	permissionType: "read",
	permissionKey: "",
	permissionRangeEnd: "",
};

vi.mock("./auth-store", () => ({
	useAuthStore: vi.fn((selector) => {
		const state = {
			...mockState,
			fetchRoles: mockFetchRoles,
			addRole: mockAddRole,
			deleteRole: mockDeleteRole,
			fetchRolePermissions: mockFetchRolePermissions,
			grantPermission: mockGrantPermission,
			revokePermission: mockRevokePermission,
			toggleRoleExpanded: mockToggleRoleExpanded,
			setShowAddRoleDialog: mockSetShowAddRoleDialog,
			setShowDeleteRoleDialog: mockSetShowDeleteRoleDialog,
			setShowGrantPermissionDialog: mockSetShowGrantPermissionDialog,
			setShowRevokePermissionDialog: mockSetShowRevokePermissionDialog,
			setNewRoleName: mockSetNewRoleName,
			setSelectedRole: mockSetSelectedRole,
			setPermissionType: mockSetPermissionType,
			setPermissionKey: mockSetPermissionKey,
			setPermissionRangeEnd: mockSetPermissionRangeEnd,
		};
		return selector ? selector(state) : state;
	}),
}));

describe("RolesTab", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockState.roles = [];
		mockState.rolesLoading = false;
		mockState.rolesError = null;
		mockState.rolePermissions = new Map();
		mockState.expandedRoles = new Set();
		mockState.showAddRoleDialog = false;
		mockState.showDeleteRoleDialog = false;
		mockState.showGrantPermissionDialog = false;
		mockState.showRevokePermissionDialog = false;
		mockState.newRoleName = "";
		mockState.selectedRole = null;
		mockState.permissionType = "read";
		mockState.permissionKey = "";
		mockState.permissionRangeEnd = "";
	});

	it("fetches roles on mount", () => {
		render(<RolesTab connectionId="conn-1" />);
		expect(mockFetchRoles).toHaveBeenCalledWith("conn-1");
	});

	it("renders loading state", () => {
		mockState.rolesLoading = true;
		render(<RolesTab connectionId="conn-1" />);
		expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
	});

	it("renders error state with retry", () => {
		mockState.rolesError = "network error";
		render(<RolesTab connectionId="conn-1" />);
		expect(screen.getByText("Failed to load roles")).toBeInTheDocument();
		expect(screen.getByText("network error")).toBeInTheDocument();

		fireEvent.click(screen.getByText("Retry"));
		expect(mockFetchRoles).toHaveBeenCalledWith("conn-1");
	});

	it("renders empty state", () => {
		render(<RolesTab connectionId="conn-1" />);
		expect(screen.getByText("No roles found")).toBeInTheDocument();
	});

	it("renders roles list", () => {
		mockState.roles = [{ name: "admin" }, { name: "dev" }];
		render(<RolesTab connectionId="conn-1" />);
		expect(screen.getByText("admin")).toBeInTheDocument();
		expect(screen.getByText("dev")).toBeInTheDocument();
	});

	it("expands role and fetches permissions", () => {
		mockState.roles = [{ name: "admin" }];
		render(<RolesTab connectionId="conn-1" />);
		const chevronBtn = screen.getByRole("button", { name: /expand role/i });
		fireEvent.click(chevronBtn);
		expect(mockToggleRoleExpanded).toHaveBeenCalledWith("admin");
		expect(mockFetchRolePermissions).toHaveBeenCalledWith("conn-1", "admin");
	});

	it("does not refetch permissions for already expanded role", () => {
		mockState.roles = [{ name: "admin" }];
		mockState.expandedRoles = new Set(["admin"]);
		render(<RolesTab connectionId="conn-1" />);
		const chevronBtn = screen.getByRole("button", { name: /collapse role/i });
		fireEvent.click(chevronBtn);
		expect(mockToggleRoleExpanded).toHaveBeenCalledWith("admin");
		expect(mockFetchRolePermissions).not.toHaveBeenCalled();
	});

	it("renders permissions when expanded", () => {
		mockState.roles = [{ name: "admin" }];
		mockState.expandedRoles = new Set(["admin"]);
		mockState.rolePermissions = new Map([
			[
				"admin",
				{
					permissions: [
						{ perm_type: "read", key: "/config/*", range_end: null },
						{ perm_type: "write", key: "/data", range_end: "/data\u0000" },
					],
				},
			],
		]);
		render(<RolesTab connectionId="conn-1" />);
		expect(screen.getByText("Read")).toBeInTheDocument();
		expect(screen.getByText("Write")).toBeInTheDocument();
		expect(screen.getByText("/config/*")).toBeInTheDocument();
	});

	it("shows no permissions message", () => {
		mockState.roles = [{ name: "admin" }];
		mockState.expandedRoles = new Set(["admin"]);
		mockState.rolePermissions = new Map([["admin", { permissions: [] }]]);
		render(<RolesTab connectionId="conn-1" />);
		expect(screen.getByText("No permissions assigned")).toBeInTheDocument();
	});

	it("opens add role dialog", () => {
		render(<RolesTab connectionId="conn-1" />);
		fireEvent.click(screen.getByText("Add Role"));
		expect(mockSetNewRoleName).toHaveBeenCalledWith("");
		expect(mockSetShowAddRoleDialog).toHaveBeenCalledWith(true);
	});

	it("calls addRole on confirm", () => {
		mockState.showAddRoleDialog = true;
		mockState.newRoleName = "ops";
		render(<RolesTab connectionId="conn-1" />);
		const buttons = screen.getAllByRole("button");
		const addBtn = buttons.find(
			(b) =>
				b.textContent?.includes("Add Role") &&
				!(b as HTMLButtonElement).disabled,
		);
		expect(addBtn).toBeDefined();
		if (addBtn) fireEvent.click(addBtn);
		expect(mockAddRole).toHaveBeenCalledWith("conn-1");
	});

	it("disables add role when name is empty", () => {
		mockState.showAddRoleDialog = true;
		render(<RolesTab connectionId="conn-1" />);
		const addBtn = screen
			.getAllByText("Add Role")
			.find((el) => el.closest("button")?.disabled);
		expect(addBtn).toBeDefined();
	});

	it("opens delete dialog on delete click", () => {
		mockState.roles = [{ name: "admin" }];
		render(<RolesTab connectionId="conn-1" />);
		fireEvent.click(screen.getByText("Delete"));
		expect(mockSetSelectedRole).toHaveBeenCalledWith({ name: "admin" });
		expect(mockSetShowDeleteRoleDialog).toHaveBeenCalledWith(true);
	});

	it("calls deleteRole on confirm", () => {
		mockState.showDeleteRoleDialog = true;
		mockState.selectedRole = { name: "admin" };
		render(<RolesTab connectionId="conn-1" />);
		fireEvent.click(screen.getByText("Delete"));
		expect(mockDeleteRole).toHaveBeenCalledWith("conn-1");
	});

	it("opens grant permission dialog", () => {
		mockState.roles = [{ name: "admin" }];
		render(<RolesTab connectionId="conn-1" />);
		fireEvent.click(screen.getByText("Grant"));
		expect(mockSetSelectedRole).toHaveBeenCalledWith({ name: "admin" });
		expect(mockSetPermissionType).toHaveBeenCalledWith("read");
		expect(mockSetPermissionKey).toHaveBeenCalledWith("");
		expect(mockSetPermissionRangeEnd).toHaveBeenCalledWith("");
		expect(mockSetShowGrantPermissionDialog).toHaveBeenCalledWith(true);
	});

	it("calls grantPermission on confirm", () => {
		mockState.showGrantPermissionDialog = true;
		mockState.selectedRole = { name: "admin" };
		mockState.permissionKey = "/config/*";
		render(<RolesTab connectionId="conn-1" />);
		const buttons = screen.getAllByRole("button");
		const grantBtn = buttons.find(
			(b) =>
				b.textContent?.includes("Grant Permission") &&
				!(b as HTMLButtonElement).disabled,
		);
		expect(grantBtn).toBeDefined();
		if (grantBtn) fireEvent.click(grantBtn);
		expect(mockGrantPermission).toHaveBeenCalledWith("conn-1");
	});

	it("disables grant permission when key is empty", () => {
		mockState.showGrantPermissionDialog = true;
		render(<RolesTab connectionId="conn-1" />);
		const grantBtn = screen
			.getAllByText("Grant Permission")
			.find((el) => el.closest("button")?.disabled);
		expect(grantBtn).toBeDefined();
	});

	it("opens revoke permission dialog on revoke icon click", () => {
		mockState.roles = [{ name: "admin" }];
		mockState.expandedRoles = new Set(["admin"]);
		mockState.rolePermissions = new Map([
			[
				"admin",
				{
					permissions: [
						{ perm_type: "read", key: "/config/*", range_end: null },
					],
				},
			],
		]);
		render(<RolesTab connectionId="conn-1" />);
		const revokeBtn = screen.getByRole("button", {
			name: /revoke permission/i,
		});
		expect(revokeBtn).toBeInTheDocument();
		fireEvent.click(revokeBtn);
		expect(mockSetSelectedRole).toHaveBeenCalledWith({ name: "admin" });
		expect(mockSetPermissionKey).toHaveBeenCalledWith("/config/*");
		expect(mockSetPermissionRangeEnd).toHaveBeenCalledWith("");
		expect(mockSetShowRevokePermissionDialog).toHaveBeenCalledWith(true);
	});

	it("calls revokePermission on confirm", () => {
		mockState.showRevokePermissionDialog = true;
		mockState.selectedRole = { name: "admin" };
		mockState.permissionKey = "/config/*";
		render(<RolesTab connectionId="conn-1" />);
		fireEvent.click(screen.getByText("Revoke"));
		expect(mockRevokePermission).toHaveBeenCalledWith("conn-1");
	});

	it("refreshes on refresh button click", () => {
		render(<RolesTab connectionId="conn-1" />);
		fireEvent.click(screen.getByText("Refresh"));
		expect(mockFetchRoles).toHaveBeenCalledWith("conn-1");
	});

	it("shows loading spinner on refresh button when loading with roles", () => {
		mockState.roles = [{ name: "admin" }];
		mockState.rolesLoading = true;
		render(<RolesTab connectionId="conn-1" />);
		expect(document.querySelector(".animate-spin")).toBeInTheDocument();
	});
});
