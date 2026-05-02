import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "./auth-store";

const mockAuthStatus = vi.hoisted(() => vi.fn());
const mockAuthEnable = vi.hoisted(() => vi.fn());
const mockAuthDisable = vi.hoisted(() => vi.fn());
const mockUserList = vi.hoisted(() => vi.fn());
const mockUserAdd = vi.hoisted(() => vi.fn());
const mockUserDelete = vi.hoisted(() => vi.fn());
const mockUserGrantRole = vi.hoisted(() => vi.fn());
const mockUserRevokeRole = vi.hoisted(() => vi.fn());
const mockRoleList = vi.hoisted(() => vi.fn());
const mockRoleAdd = vi.hoisted(() => vi.fn());
const mockRoleDelete = vi.hoisted(() => vi.fn());
const mockRoleGetPermissions = vi.hoisted(() => vi.fn());
const mockRoleGrantPermission = vi.hoisted(() => vi.fn());
const mockRoleRevokePermission = vi.hoisted(() => vi.fn());

vi.mock("@/commands/auth", () => ({
	authStatus: mockAuthStatus,
	authEnable: mockAuthEnable,
	authDisable: mockAuthDisable,
	userList: mockUserList,
	userAdd: mockUserAdd,
	userDelete: mockUserDelete,
	userGrantRole: mockUserGrantRole,
	userRevokeRole: mockUserRevokeRole,
	roleList: mockRoleList,
	roleAdd: mockRoleAdd,
	roleDelete: mockRoleDelete,
	roleGetPermissions: mockRoleGetPermissions,
	roleGrantPermission: mockRoleGrantPermission,
	roleRevokePermission: mockRoleRevokePermission,
}));

describe("Auth Store", () => {
	beforeEach(() => {
		mockAuthStatus.mockReset();
		mockAuthEnable.mockReset();
		mockAuthDisable.mockReset();
		mockUserList.mockReset();
		mockUserAdd.mockReset();
		mockUserDelete.mockReset();
		mockUserGrantRole.mockReset();
		mockUserRevokeRole.mockReset();
		mockRoleList.mockReset();
		mockRoleAdd.mockReset();
		mockRoleDelete.mockReset();
		mockRoleGetPermissions.mockReset();
		mockRoleGrantPermission.mockReset();
		mockRoleRevokePermission.mockReset();

		useAuthStore.setState({
			authStatus: null,
			authLoading: false,
			authError: null,

			users: [],
			usersLoading: false,
			usersError: null,

			roles: [],
			rolesLoading: false,
			rolesError: null,
			rolePermissions: new Map(),
			expandedRoles: new Set(),

			showAddUserDialog: false,
			showDeleteUserDialog: false,
			showGrantRoleDialog: false,
			showRevokeRoleDialog: false,
			showAddRoleDialog: false,
			showDeleteRoleDialog: false,
			showGrantPermissionDialog: false,
			showRevokePermissionDialog: false,
			showToggleAuthDialog: false,

			newUserName: "",
			newUserPassword: "",
			newRoleName: "",
			selectedUser: null,
			selectedRole: null,
			selectedRoleForUser: "",
			permissionType: "read",
			permissionKey: "",
			permissionRangeEnd: "",
		});

		vi.clearAllMocks();
	});

	describe("Initial State", () => {
		it("should have default initial state", () => {
			const state = useAuthStore.getState();

			expect(state.authStatus).toBeNull();
			expect(state.authLoading).toBe(false);
			expect(state.authError).toBeNull();

			expect(state.users).toEqual([]);
			expect(state.usersLoading).toBe(false);
			expect(state.usersError).toBeNull();

			expect(state.roles).toEqual([]);
			expect(state.rolesLoading).toBe(false);
			expect(state.rolesError).toBeNull();
			expect(state.rolePermissions).toEqual(new Map());
			expect(state.expandedRoles).toEqual(new Set());

			expect(state.showAddUserDialog).toBe(false);
			expect(state.showDeleteUserDialog).toBe(false);
			expect(state.showGrantRoleDialog).toBe(false);
			expect(state.showRevokeRoleDialog).toBe(false);
			expect(state.showAddRoleDialog).toBe(false);
			expect(state.showDeleteRoleDialog).toBe(false);
			expect(state.showGrantPermissionDialog).toBe(false);
			expect(state.showRevokePermissionDialog).toBe(false);
			expect(state.showToggleAuthDialog).toBe(false);

			expect(state.newUserName).toBe("");
			expect(state.newUserPassword).toBe("");
			expect(state.newRoleName).toBe("");
			expect(state.selectedUser).toBeNull();
			expect(state.selectedRole).toBeNull();
			expect(state.selectedRoleForUser).toBe("");
			expect(state.permissionType).toBe("read");
			expect(state.permissionKey).toBe("");
			expect(state.permissionRangeEnd).toBe("");
		});
	});

	describe("Dialog Setters", () => {
		it.each([
			["setShowAddUserDialog", "showAddUserDialog"],
			["setShowDeleteUserDialog", "showDeleteUserDialog"],
			["setShowGrantRoleDialog", "showGrantRoleDialog"],
			["setShowRevokeRoleDialog", "showRevokeRoleDialog"],
			["setShowAddRoleDialog", "showAddRoleDialog"],
			["setShowDeleteRoleDialog", "showDeleteRoleDialog"],
			["setShowGrantPermissionDialog", "showGrantPermissionDialog"],
			["setShowRevokePermissionDialog", "showRevokePermissionDialog"],
			["setShowToggleAuthDialog", "showToggleAuthDialog"],
		] as const)("%s should update %s", (setter, field) => {
			const fn = useAuthStore.getState()[setter];
			fn(true);
			expect(useAuthStore.getState()[field]).toBe(true);
			fn(false);
			expect(useAuthStore.getState()[field]).toBe(false);
		});
	});

	describe("Form Field Setters", () => {
		it("should update newUserName", () => {
			useAuthStore.getState().setNewUserName("alice");
			expect(useAuthStore.getState().newUserName).toBe("alice");
		});

		it("should update newUserPassword", () => {
			useAuthStore.getState().setNewUserPassword("secret");
			expect(useAuthStore.getState().newUserPassword).toBe("secret");
		});

		it("should update newRoleName", () => {
			useAuthStore.getState().setNewRoleName("admin");
			expect(useAuthStore.getState().newRoleName).toBe("admin");
		});

		it("should update selectedUser", () => {
			const user = { name: "alice", roles: ["admin"] };
			useAuthStore.getState().setSelectedUser(user);
			expect(useAuthStore.getState().selectedUser).toEqual(user);
			useAuthStore.getState().setSelectedUser(null);
			expect(useAuthStore.getState().selectedUser).toBeNull();
		});

		it("should update selectedRole", () => {
			const role = { name: "admin" };
			useAuthStore.getState().setSelectedRole(role);
			expect(useAuthStore.getState().selectedRole).toEqual(role);
			useAuthStore.getState().setSelectedRole(null);
			expect(useAuthStore.getState().selectedRole).toBeNull();
		});

		it("should update selectedRoleForUser", () => {
			useAuthStore.getState().setSelectedRoleForUser("admin");
			expect(useAuthStore.getState().selectedRoleForUser).toBe("admin");
		});

		it("should update permissionType", () => {
			useAuthStore.getState().setPermissionType("write");
			expect(useAuthStore.getState().permissionType).toBe("write");
		});

		it("should update permissionKey", () => {
			useAuthStore.getState().setPermissionKey("/config/*");
			expect(useAuthStore.getState().permissionKey).toBe("/config/*");
		});

		it("should update permissionRangeEnd", () => {
			useAuthStore.getState().setPermissionRangeEnd("/config/~");
			expect(useAuthStore.getState().permissionRangeEnd).toBe("/config/~");
		});
	});

	describe("clearErrors", () => {
		it("should reset all error fields", () => {
			useAuthStore.setState({
				authError: "auth error",
				usersError: "users error",
				rolesError: "roles error",
			});

			useAuthStore.getState().clearErrors();

			const state = useAuthStore.getState();
			expect(state.authError).toBeNull();
			expect(state.usersError).toBeNull();
			expect(state.rolesError).toBeNull();
		});
	});

	describe("toggleRoleExpanded", () => {
		it("should add role to expanded set", () => {
			useAuthStore.getState().toggleRoleExpanded("admin");
			expect(useAuthStore.getState().expandedRoles.has("admin")).toBe(true);
		});

		it("should remove role from expanded set if already present", () => {
			useAuthStore.setState({ expandedRoles: new Set(["admin"]) });
			useAuthStore.getState().toggleRoleExpanded("admin");
			expect(useAuthStore.getState().expandedRoles.has("admin")).toBe(false);
		});
	});

	describe("fetchAuthStatus", () => {
		it("should fetch and set auth status on success", async () => {
			const status = { enabled: true, auth_revision: 42 };
			mockAuthStatus.mockResolvedValue(status);

			await useAuthStore.getState().fetchAuthStatus("conn-1");

			const state = useAuthStore.getState();
			expect(state.authStatus).toEqual(status);
			expect(state.authLoading).toBe(false);
			expect(state.authError).toBeNull();
			expect(mockAuthStatus).toHaveBeenCalledWith("conn-1");
		});

		it("should set authError on failure", async () => {
			mockAuthStatus.mockRejectedValue(new Error("network error"));

			await useAuthStore.getState().fetchAuthStatus("conn-1");

			const state = useAuthStore.getState();
			expect(state.authLoading).toBe(false);
			expect(state.authError).toBe("network error");
		});
	});

	describe("toggleAuth", () => {
		it("should disable auth when currently enabled", async () => {
			useAuthStore.setState({
				authStatus: { enabled: true, auth_revision: 1 },
			});
			mockAuthDisable.mockResolvedValue(undefined);
			mockAuthStatus.mockResolvedValue({ enabled: false, auth_revision: 2 });

			await useAuthStore.getState().toggleAuth("conn-1");

			expect(mockAuthDisable).toHaveBeenCalledWith("conn-1");
			expect(mockAuthEnable).not.toHaveBeenCalled();
			expect(toast.success).toHaveBeenCalledWith("Authentication disabled");

			const state = useAuthStore.getState();
			expect(state.authStatus).toEqual({ enabled: false, auth_revision: 2 });
			expect(state.authLoading).toBe(false);
			expect(state.showToggleAuthDialog).toBe(false);
		});

		it("should enable auth when currently disabled", async () => {
			useAuthStore.setState({
				authStatus: { enabled: false, auth_revision: 1 },
			});
			mockAuthEnable.mockResolvedValue(undefined);
			mockAuthStatus.mockResolvedValue({ enabled: true, auth_revision: 2 });

			await useAuthStore.getState().toggleAuth("conn-1");

			expect(mockAuthEnable).toHaveBeenCalledWith("conn-1");
			expect(mockAuthDisable).not.toHaveBeenCalled();
			expect(toast.success).toHaveBeenCalledWith("Authentication enabled");

			const state = useAuthStore.getState();
			expect(state.authStatus).toEqual({ enabled: true, auth_revision: 2 });
			expect(state.authLoading).toBe(false);
		});

		it("should set authError and show toast.error on failure when enabled", async () => {
			useAuthStore.setState({
				authStatus: { enabled: true, auth_revision: 1 },
			});
			mockAuthDisable.mockRejectedValue(new Error("disable failed"));

			await useAuthStore.getState().toggleAuth("conn-1");

			const state = useAuthStore.getState();
			expect(state.authError).toBe("disable failed");
			expect(state.authLoading).toBe(false);
			expect(toast.error).toHaveBeenCalledWith(
				"Failed to disable authentication",
			);
		});

		it("should set authError and show toast.error on failure when disabled", async () => {
			useAuthStore.setState({
				authStatus: { enabled: false, auth_revision: 1 },
			});
			mockAuthEnable.mockRejectedValue(new Error("enable failed"));

			await useAuthStore.getState().toggleAuth("conn-1");

			const state = useAuthStore.getState();
			expect(state.authError).toBe("enable failed");
			expect(state.authLoading).toBe(false);
			expect(toast.error).toHaveBeenCalledWith(
				"Failed to enable authentication",
			);
		});
	});

	describe("fetchUsers", () => {
		it("should fetch and set users on success", async () => {
			const users = [{ name: "alice", roles: ["admin"] }];
			mockUserList.mockResolvedValue(users);

			await useAuthStore.getState().fetchUsers("conn-1");

			const state = useAuthStore.getState();
			expect(state.users).toEqual(users);
			expect(state.usersLoading).toBe(false);
			expect(state.usersError).toBeNull();
		});

		it("should set usersError on failure", async () => {
			mockUserList.mockRejectedValue(new Error("fetch failed"));

			await useAuthStore.getState().fetchUsers("conn-1");

			const state = useAuthStore.getState();
			expect(state.usersLoading).toBe(false);
			expect(state.usersError).toBe("fetch failed");
		});
	});

	describe("addUser", () => {
		it("should show error if user name is empty", async () => {
			await useAuthStore.getState().addUser("conn-1");
			expect(toast.error).toHaveBeenCalledWith("User name is required");
			expect(mockUserAdd).not.toHaveBeenCalled();
		});

		it("should add user and refresh list on success", async () => {
			useAuthStore.setState({
				newUserName: "alice",
				newUserPassword: "secret",
			});
			mockUserAdd.mockResolvedValue(undefined);
			const updatedUsers = [{ name: "alice", roles: [] }];
			mockUserList.mockResolvedValue(updatedUsers);

			await useAuthStore.getState().addUser("conn-1");

			expect(mockUserAdd).toHaveBeenCalledWith("conn-1", "alice", "secret");
			expect(toast.success).toHaveBeenCalledWith('User "alice" added');

			const state = useAuthStore.getState();
			expect(state.users).toEqual(updatedUsers);
			expect(state.showAddUserDialog).toBe(false);
			expect(state.newUserName).toBe("");
			expect(state.newUserPassword).toBe("");
		});

		it("should show toast.error on failure", async () => {
			useAuthStore.setState({ newUserName: "alice" });
			mockUserAdd.mockRejectedValue(new Error("add failed"));

			await useAuthStore.getState().addUser("conn-1");

			expect(toast.error).toHaveBeenCalledWith(
				"Failed to add user: add failed",
			);
		});
	});

	describe("deleteUser", () => {
		it("should do nothing if no user selected", async () => {
			await useAuthStore.getState().deleteUser("conn-1");
			expect(mockUserDelete).not.toHaveBeenCalled();
		});

		it("should delete user and update state on success", async () => {
			useAuthStore.setState({
				selectedUser: { name: "alice", roles: ["admin"] },
				users: [
					{ name: "alice", roles: ["admin"] },
					{ name: "bob", roles: [] },
				],
			});
			mockUserDelete.mockResolvedValue(undefined);

			await useAuthStore.getState().deleteUser("conn-1");

			expect(mockUserDelete).toHaveBeenCalledWith("conn-1", "alice");
			expect(toast.success).toHaveBeenCalledWith('User "alice" deleted');

			const state = useAuthStore.getState();
			expect(state.users).toEqual([{ name: "bob", roles: [] }]);
			expect(state.showDeleteUserDialog).toBe(false);
			expect(state.selectedUser).toBeNull();
		});

		it("should show toast.error on failure", async () => {
			useAuthStore.setState({
				selectedUser: { name: "alice", roles: [] },
			});
			mockUserDelete.mockRejectedValue(new Error("delete failed"));

			await useAuthStore.getState().deleteUser("conn-1");

			expect(toast.error).toHaveBeenCalledWith(
				"Failed to delete user: delete failed",
			);
		});
	});

	describe("grantRoleToUser", () => {
		it("should do nothing if no user or role selected", async () => {
			await useAuthStore.getState().grantRoleToUser("conn-1");
			expect(mockUserGrantRole).not.toHaveBeenCalled();
		});

		it("should grant role and refresh users on success", async () => {
			useAuthStore.setState({
				selectedUser: { name: "alice", roles: [] },
				selectedRoleForUser: "admin",
			});
			mockUserGrantRole.mockResolvedValue(undefined);
			const updatedUsers = [{ name: "alice", roles: ["admin"] }];
			mockUserList.mockResolvedValue(updatedUsers);

			await useAuthStore.getState().grantRoleToUser("conn-1");

			expect(mockUserGrantRole).toHaveBeenCalledWith(
				"conn-1",
				"alice",
				"admin",
			);
			expect(toast.success).toHaveBeenCalledWith(
				'Role "admin" granted to "alice"',
			);

			const state = useAuthStore.getState();
			expect(state.users).toEqual(updatedUsers);
			expect(state.showGrantRoleDialog).toBe(false);
			expect(state.selectedRoleForUser).toBe("");
		});

		it("should show toast.error on failure", async () => {
			useAuthStore.setState({
				selectedUser: { name: "alice", roles: [] },
				selectedRoleForUser: "admin",
			});
			mockUserGrantRole.mockRejectedValue(new Error("grant failed"));

			await useAuthStore.getState().grantRoleToUser("conn-1");

			expect(toast.error).toHaveBeenCalledWith(
				"Failed to grant role: grant failed",
			);
		});
	});

	describe("revokeRoleFromUser", () => {
		it("should do nothing if no user or role selected", async () => {
			await useAuthStore.getState().revokeRoleFromUser("conn-1");
			expect(mockUserRevokeRole).not.toHaveBeenCalled();
		});

		it("should revoke role and refresh users on success", async () => {
			useAuthStore.setState({
				selectedUser: { name: "alice", roles: ["admin"] },
				selectedRoleForUser: "admin",
			});
			mockUserRevokeRole.mockResolvedValue(undefined);
			const updatedUsers = [{ name: "alice", roles: [] }];
			mockUserList.mockResolvedValue(updatedUsers);

			await useAuthStore.getState().revokeRoleFromUser("conn-1");

			expect(mockUserRevokeRole).toHaveBeenCalledWith(
				"conn-1",
				"alice",
				"admin",
			);
			expect(toast.success).toHaveBeenCalledWith(
				'Role "admin" revoked from "alice"',
			);

			const state = useAuthStore.getState();
			expect(state.users).toEqual(updatedUsers);
			expect(state.showRevokeRoleDialog).toBe(false);
			expect(state.selectedRoleForUser).toBe("");
		});

		it("should show toast.error on failure", async () => {
			useAuthStore.setState({
				selectedUser: { name: "alice", roles: ["admin"] },
				selectedRoleForUser: "admin",
			});
			mockUserRevokeRole.mockRejectedValue(new Error("revoke failed"));

			await useAuthStore.getState().revokeRoleFromUser("conn-1");

			expect(toast.error).toHaveBeenCalledWith(
				"Failed to revoke role: revoke failed",
			);
		});
	});

	describe("fetchRoles", () => {
		it("should fetch and set roles on success", async () => {
			const roles = [{ name: "admin" }, { name: "reader" }];
			mockRoleList.mockResolvedValue(roles);

			await useAuthStore.getState().fetchRoles("conn-1");

			const state = useAuthStore.getState();
			expect(state.roles).toEqual(roles);
			expect(state.rolesLoading).toBe(false);
			expect(state.rolesError).toBeNull();
		});

		it("should set rolesError on failure", async () => {
			mockRoleList.mockRejectedValue(new Error("fetch failed"));

			await useAuthStore.getState().fetchRoles("conn-1");

			const state = useAuthStore.getState();
			expect(state.rolesLoading).toBe(false);
			expect(state.rolesError).toBe("fetch failed");
		});
	});

	describe("addRole", () => {
		it("should show error if role name is empty", async () => {
			await useAuthStore.getState().addRole("conn-1");
			expect(toast.error).toHaveBeenCalledWith("Role name is required");
			expect(mockRoleAdd).not.toHaveBeenCalled();
		});

		it("should add role and refresh list on success", async () => {
			useAuthStore.setState({ newRoleName: "admin" });
			mockRoleAdd.mockResolvedValue(undefined);
			const updatedRoles = [{ name: "admin" }];
			mockRoleList.mockResolvedValue(updatedRoles);

			await useAuthStore.getState().addRole("conn-1");

			expect(mockRoleAdd).toHaveBeenCalledWith("conn-1", "admin");
			expect(toast.success).toHaveBeenCalledWith('Role "admin" added');

			const state = useAuthStore.getState();
			expect(state.roles).toEqual(updatedRoles);
			expect(state.showAddRoleDialog).toBe(false);
			expect(state.newRoleName).toBe("");
		});

		it("should show toast.error on failure", async () => {
			useAuthStore.setState({ newRoleName: "admin" });
			mockRoleAdd.mockRejectedValue(new Error("add failed"));

			await useAuthStore.getState().addRole("conn-1");

			expect(toast.error).toHaveBeenCalledWith(
				"Failed to add role: add failed",
			);
		});
	});

	describe("deleteRole", () => {
		it("should do nothing if no role selected", async () => {
			await useAuthStore.getState().deleteRole("conn-1");
			expect(mockRoleDelete).not.toHaveBeenCalled();
		});

		it("should delete role and clean up state on success", async () => {
			useAuthStore.setState({
				selectedRole: { name: "admin" },
				roles: [{ name: "admin" }, { name: "reader" }],
				rolePermissions: new Map([
					["admin", { role: "admin", permissions: [] }],
				]),
				expandedRoles: new Set(["admin"]),
			});
			mockRoleDelete.mockResolvedValue(undefined);

			await useAuthStore.getState().deleteRole("conn-1");

			expect(mockRoleDelete).toHaveBeenCalledWith("conn-1", "admin");
			expect(toast.success).toHaveBeenCalledWith('Role "admin" deleted');

			const state = useAuthStore.getState();
			expect(state.roles).toEqual([{ name: "reader" }]);
			expect(state.showDeleteRoleDialog).toBe(false);
			expect(state.selectedRole).toBeNull();
			expect(state.rolePermissions.has("admin")).toBe(false);
			expect(state.expandedRoles.has("admin")).toBe(false);
		});

		it("should show toast.error on failure", async () => {
			useAuthStore.setState({ selectedRole: { name: "admin" } });
			mockRoleDelete.mockRejectedValue(new Error("delete failed"));

			await useAuthStore.getState().deleteRole("conn-1");

			expect(toast.error).toHaveBeenCalledWith(
				"Failed to delete role: delete failed",
			);
		});
	});

	describe("fetchRolePermissions", () => {
		it("should fetch and store permissions on success", async () => {
			const perms = {
				role: "admin",
				permissions: [{ perm_type: "read", key: "/", range_end: null }],
			};
			mockRoleGetPermissions.mockResolvedValue(perms);

			await useAuthStore.getState().fetchRolePermissions("conn-1", "admin");

			expect(mockRoleGetPermissions).toHaveBeenCalledWith("conn-1", "admin");
			expect(useAuthStore.getState().rolePermissions.get("admin")).toEqual(
				perms,
			);
		});

		it("should show toast.error on failure", async () => {
			mockRoleGetPermissions.mockRejectedValue(new Error("fetch failed"));

			await useAuthStore.getState().fetchRolePermissions("conn-1", "admin");

			expect(toast.error).toHaveBeenCalledWith(
				"Failed to fetch permissions: fetch failed",
			);
		});
	});

	describe("grantPermission", () => {
		it("should show error if key is empty", async () => {
			useAuthStore.setState({ selectedRole: { name: "admin" } });
			await useAuthStore.getState().grantPermission("conn-1");
			expect(toast.error).toHaveBeenCalledWith("Key is required");
			expect(mockRoleGrantPermission).not.toHaveBeenCalled();
		});

		it("should grant permission and refresh on success", async () => {
			useAuthStore.setState({
				selectedRole: { name: "admin" },
				permissionType: "write",
				permissionKey: "/config/*",
				permissionRangeEnd: "/config/~",
			});
			mockRoleGrantPermission.mockResolvedValue(undefined);
			mockRoleGetPermissions.mockResolvedValue({
				role: "admin",
				permissions: [],
			});

			await useAuthStore.getState().grantPermission("conn-1");

			expect(mockRoleGrantPermission).toHaveBeenCalledWith(
				"conn-1",
				"admin",
				"write",
				"/config/*",
				"/config/~",
			);
			expect(toast.success).toHaveBeenCalledWith(
				'Permission granted to "admin"',
			);

			const state = useAuthStore.getState();
			expect(state.showGrantPermissionDialog).toBe(false);
			expect(state.permissionKey).toBe("");
			expect(state.permissionRangeEnd).toBe("");
		});

		it("should pass undefined for empty rangeEnd", async () => {
			useAuthStore.setState({
				selectedRole: { name: "admin" },
				permissionType: "read",
				permissionKey: "/",
				permissionRangeEnd: "",
			});
			mockRoleGrantPermission.mockResolvedValue(undefined);
			mockRoleGetPermissions.mockResolvedValue({
				role: "admin",
				permissions: [],
			});

			await useAuthStore.getState().grantPermission("conn-1");

			expect(mockRoleGrantPermission).toHaveBeenCalledWith(
				"conn-1",
				"admin",
				"read",
				"/",
				undefined,
			);
		});

		it("should show toast.error on failure", async () => {
			useAuthStore.setState({
				selectedRole: { name: "admin" },
				permissionKey: "/",
			});
			mockRoleGrantPermission.mockRejectedValue(new Error("grant failed"));

			await useAuthStore.getState().grantPermission("conn-1");

			expect(toast.error).toHaveBeenCalledWith(
				"Failed to grant permission: grant failed",
			);
		});
	});

	describe("revokePermission", () => {
		it("should do nothing if no role or key selected", async () => {
			await useAuthStore.getState().revokePermission("conn-1");
			expect(mockRoleRevokePermission).not.toHaveBeenCalled();
		});

		it("should revoke permission and refresh on success", async () => {
			useAuthStore.setState({
				selectedRole: { name: "admin" },
				permissionKey: "/config/*",
				permissionRangeEnd: "/config/~",
			});
			mockRoleRevokePermission.mockResolvedValue(undefined);
			mockRoleGetPermissions.mockResolvedValue({
				role: "admin",
				permissions: [],
			});

			await useAuthStore.getState().revokePermission("conn-1");

			expect(mockRoleRevokePermission).toHaveBeenCalledWith(
				"conn-1",
				"admin",
				"/config/*",
				"/config/~",
			);
			expect(toast.success).toHaveBeenCalledWith(
				'Permission revoked from "admin"',
			);

			const state = useAuthStore.getState();
			expect(state.showRevokePermissionDialog).toBe(false);
			expect(state.permissionKey).toBe("");
			expect(state.permissionRangeEnd).toBe("");
		});

		it("should pass undefined for empty rangeEnd", async () => {
			useAuthStore.setState({
				selectedRole: { name: "admin" },
				permissionKey: "/",
				permissionRangeEnd: "",
			});
			mockRoleRevokePermission.mockResolvedValue(undefined);
			mockRoleGetPermissions.mockResolvedValue({
				role: "admin",
				permissions: [],
			});

			await useAuthStore.getState().revokePermission("conn-1");

			expect(mockRoleRevokePermission).toHaveBeenCalledWith(
				"conn-1",
				"admin",
				"/",
				undefined,
			);
		});

		it("should show toast.error on failure", async () => {
			useAuthStore.setState({
				selectedRole: { name: "admin" },
				permissionKey: "/",
			});
			mockRoleRevokePermission.mockRejectedValue(new Error("revoke failed"));

			await useAuthStore.getState().revokePermission("conn-1");

			expect(toast.error).toHaveBeenCalledWith(
				"Failed to revoke permission: revoke failed",
			);
		});
	});
});
