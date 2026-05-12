import { toast } from "sonner";
import { create } from "zustand";
import {
	authDisable,
	authEnable,
	authStatus as fetchAuthStatusCommand,
	roleAdd,
	roleDelete,
	roleGetPermissions,
	roleGrantPermission,
	roleList,
	roleRevokePermission,
	userAdd,
	userDelete,
	userGrantRole,
	userList,
	userRevokeRole,
} from "@/commands/auth";
import type {
	AuthStatus,
	EtcdRole,
	EtcdRolePermissions,
	EtcdUser,
} from "@/commands/types";

interface AuthState {
	authStatus: AuthStatus | null;
	authLoading: boolean;
	authError: string | null;

	users: EtcdUser[];
	usersLoading: boolean;
	usersError: string | null;

	roles: EtcdRole[];
	rolesLoading: boolean;
	rolesError: string | null;
	rolePermissions: Map<string, EtcdRolePermissions>;
	expandedRoles: Set<string>;

	showAddUserDialog: boolean;
	showDeleteUserDialog: boolean;
	showGrantRoleDialog: boolean;
	showRevokeRoleDialog: boolean;
	showAddRoleDialog: boolean;
	showDeleteRoleDialog: boolean;
	showGrantPermissionDialog: boolean;
	showRevokePermissionDialog: boolean;
	showToggleAuthDialog: boolean;

	newUserName: string;
	newUserPassword: string;
	newRoleName: string;
	selectedUser: EtcdUser | null;
	selectedRole: EtcdRole | null;
	selectedRoleForUser: string;
	permissionType: string;
	permissionKey: string;
	permissionRangeEnd: string;

	fetchAuthStatus: (connectionId: string) => Promise<void>;
	toggleAuth: (connectionId: string) => Promise<void>;

	fetchUsers: (connectionId: string) => Promise<void>;
	addUser: (connectionId: string) => Promise<void>;
	deleteUser: (connectionId: string) => Promise<void>;
	grantRoleToUser: (connectionId: string) => Promise<void>;
	revokeRoleFromUser: (connectionId: string) => Promise<void>;

	fetchRoles: (connectionId: string) => Promise<void>;
	addRole: (connectionId: string) => Promise<void>;
	deleteRole: (connectionId: string) => Promise<void>;
	fetchRolePermissions: (connectionId: string, role: string) => Promise<void>;
	grantPermission: (connectionId: string) => Promise<void>;
	revokePermission: (connectionId: string) => Promise<void>;
	toggleRoleExpanded: (role: string) => void;

	setShowAddUserDialog: (show: boolean) => void;
	setShowDeleteUserDialog: (show: boolean) => void;
	setShowGrantRoleDialog: (show: boolean) => void;
	setShowRevokeRoleDialog: (show: boolean) => void;
	setShowAddRoleDialog: (show: boolean) => void;
	setShowDeleteRoleDialog: (show: boolean) => void;
	setShowGrantPermissionDialog: (show: boolean) => void;
	setShowRevokePermissionDialog: (show: boolean) => void;
	setShowToggleAuthDialog: (show: boolean) => void;
	setNewUserName: (name: string) => void;
	setNewUserPassword: (password: string) => void;
	setNewRoleName: (name: string) => void;
	setSelectedUser: (user: EtcdUser | null) => void;
	setSelectedRole: (role: EtcdRole | null) => void;
	setSelectedRoleForUser: (role: string) => void;
	setPermissionType: (type: string) => void;
	setPermissionKey: (key: string) => void;
	setPermissionRangeEnd: (rangeEnd: string) => void;
	clearErrors: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
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

	fetchAuthStatus: async (connectionId: string) => {
		set({ authLoading: true, authError: null });
		try {
			const status = await fetchAuthStatusCommand(connectionId);
			set({ authStatus: status, authLoading: false });
		} catch (error: unknown) {
			set({
				authError:
					error instanceof Error
						? error.message
						: "Failed to fetch auth status",
				authLoading: false,
			});
		}
	},

	toggleAuth: async (connectionId: string) => {
		const { authStatus } = get();
		set({ authLoading: true, authError: null });
		try {
			if (authStatus?.enabled) {
				await authDisable(connectionId);
				toast.success("Authentication disabled");
			} else {
				await authEnable(connectionId);
				toast.success("Authentication enabled");
			}
			const newStatus = await fetchAuthStatusCommand(connectionId);
			set({
				authStatus: newStatus,
				authLoading: false,
				showToggleAuthDialog: false,
			});
		} catch (error: unknown) {
			set({
				authError:
					error instanceof Error
						? error.message
						: "Failed to toggle authentication",
				authLoading: false,
			});
			toast.error(
				`Failed to ${authStatus?.enabled ? "disable" : "enable"} authentication`,
			);
		}
	},

	fetchUsers: async (connectionId: string) => {
		set({ usersLoading: true, usersError: null });
		try {
			const users = await userList(connectionId);
			set({ users, usersLoading: false });
		} catch (error: unknown) {
			set({
				usersError:
					error instanceof Error ? error.message : "Failed to fetch users",
				usersLoading: false,
			});
		}
	},

	addUser: async (connectionId: string) => {
		const { newUserName, newUserPassword } = get();
		if (!newUserName.trim()) {
			toast.error("User name is required");
			return;
		}
		try {
			await userAdd(connectionId, newUserName.trim(), newUserPassword);
			toast.success(`User "${newUserName}" added`);
			const updatedUsers = await userList(connectionId);
			set({
				users: updatedUsers,
				showAddUserDialog: false,
				newUserName: "",
				newUserPassword: "",
			});
		} catch (error: unknown) {
			toast.error(
				`Failed to add user: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	deleteUser: async (connectionId: string) => {
		const { selectedUser, users } = get();
		if (!selectedUser) return;
		try {
			await userDelete(connectionId, selectedUser.name);
			toast.success(`User "${selectedUser.name}" deleted`);
			set({
				users: users.filter((u) => u.name !== selectedUser.name),
				showDeleteUserDialog: false,
				selectedUser: null,
			});
		} catch (error: unknown) {
			toast.error(
				`Failed to delete user: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	grantRoleToUser: async (connectionId: string) => {
		const { selectedUser, selectedRoleForUser } = get();
		if (!selectedUser || !selectedRoleForUser) return;
		try {
			await userGrantRole(connectionId, selectedUser.name, selectedRoleForUser);
			toast.success(
				`Role "${selectedRoleForUser}" granted to "${selectedUser.name}"`,
			);
			const updatedUsers = await userList(connectionId);
			set({
				users: updatedUsers,
				showGrantRoleDialog: false,
				selectedRoleForUser: "",
			});
		} catch (error: unknown) {
			toast.error(
				`Failed to grant role: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	revokeRoleFromUser: async (connectionId: string) => {
		const { selectedUser, selectedRoleForUser } = get();
		if (!selectedUser || !selectedRoleForUser) return;
		try {
			await userRevokeRole(
				connectionId,
				selectedUser.name,
				selectedRoleForUser,
			);
			toast.success(
				`Role "${selectedRoleForUser}" revoked from "${selectedUser.name}"`,
			);
			const updatedUsers = await userList(connectionId);
			set({
				users: updatedUsers,
				showRevokeRoleDialog: false,
				selectedRoleForUser: "",
			});
		} catch (error: unknown) {
			toast.error(
				`Failed to revoke role: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	fetchRoles: async (connectionId: string) => {
		set({ rolesLoading: true, rolesError: null });
		try {
			const roles = await roleList(connectionId);
			set({ roles, rolesLoading: false });
		} catch (error: unknown) {
			set({
				rolesError:
					error instanceof Error ? error.message : "Failed to fetch roles",
				rolesLoading: false,
			});
		}
	},

	addRole: async (connectionId: string) => {
		const { newRoleName } = get();
		if (!newRoleName.trim()) {
			toast.error("Role name is required");
			return;
		}
		try {
			await roleAdd(connectionId, newRoleName.trim());
			toast.success(`Role "${newRoleName}" added`);
			const updatedRoles = await roleList(connectionId);
			set({
				roles: updatedRoles,
				showAddRoleDialog: false,
				newRoleName: "",
			});
		} catch (error: unknown) {
			toast.error(
				`Failed to add role: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	deleteRole: async (connectionId: string) => {
		const { selectedRole, roles } = get();
		if (!selectedRole) return;
		try {
			await roleDelete(connectionId, selectedRole.name);
			toast.success(`Role "${selectedRole.name}" deleted`);
			const newRolePermissions = new Map(get().rolePermissions);
			newRolePermissions.delete(selectedRole.name);
			const newExpandedRoles = new Set(get().expandedRoles);
			newExpandedRoles.delete(selectedRole.name);
			set({
				roles: roles.filter((r) => r.name !== selectedRole.name),
				showDeleteRoleDialog: false,
				selectedRole: null,
				rolePermissions: newRolePermissions,
				expandedRoles: newExpandedRoles,
			});
		} catch (error: unknown) {
			toast.error(
				`Failed to delete role: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	fetchRolePermissions: async (connectionId: string, role: string) => {
		try {
			const perms = await roleGetPermissions(connectionId, role);
			const newRolePermissions = new Map(get().rolePermissions);
			newRolePermissions.set(role, perms);
			set({ rolePermissions: newRolePermissions });
		} catch (error: unknown) {
			toast.error(
				`Failed to fetch permissions: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	grantPermission: async (connectionId: string) => {
		const { selectedRole, permissionType, permissionKey, permissionRangeEnd } =
			get();
		if (!selectedRole || !permissionKey.trim()) {
			toast.error("Key is required");
			return;
		}
		try {
			await roleGrantPermission(
				connectionId,
				selectedRole.name,
				permissionType,
				permissionKey.trim(),
				permissionRangeEnd.trim() || undefined,
			);
			toast.success(`Permission granted to "${selectedRole.name}"`);
			await get().fetchRolePermissions(connectionId, selectedRole.name);
			set({
				showGrantPermissionDialog: false,
				permissionKey: "",
				permissionRangeEnd: "",
			});
		} catch (error: unknown) {
			toast.error(
				`Failed to grant permission: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	revokePermission: async (connectionId: string) => {
		const { selectedRole, permissionKey, permissionRangeEnd } = get();
		if (!selectedRole || !permissionKey.trim()) return;
		try {
			await roleRevokePermission(
				connectionId,
				selectedRole.name,
				permissionKey.trim(),
				permissionRangeEnd.trim() || undefined,
			);
			toast.success(`Permission revoked from "${selectedRole.name}"`);
			await get().fetchRolePermissions(connectionId, selectedRole.name);
			set({
				showRevokePermissionDialog: false,
				permissionKey: "",
				permissionRangeEnd: "",
			});
		} catch (error: unknown) {
			toast.error(
				`Failed to revoke permission: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	toggleRoleExpanded: (role: string) => {
		const { expandedRoles } = get();
		const newExpanded = new Set(expandedRoles);
		if (newExpanded.has(role)) {
			newExpanded.delete(role);
		} else {
			newExpanded.add(role);
		}
		set({ expandedRoles: newExpanded });
	},

	setShowAddUserDialog: (show) => set({ showAddUserDialog: show }),
	setShowDeleteUserDialog: (show) => set({ showDeleteUserDialog: show }),
	setShowGrantRoleDialog: (show) => set({ showGrantRoleDialog: show }),
	setShowRevokeRoleDialog: (show) => set({ showRevokeRoleDialog: show }),
	setShowAddRoleDialog: (show) => set({ showAddRoleDialog: show }),
	setShowDeleteRoleDialog: (show) => set({ showDeleteRoleDialog: show }),
	setShowGrantPermissionDialog: (show) =>
		set({ showGrantPermissionDialog: show }),
	setShowRevokePermissionDialog: (show) =>
		set({ showRevokePermissionDialog: show }),
	setShowToggleAuthDialog: (show) => set({ showToggleAuthDialog: show }),
	setNewUserName: (name) => set({ newUserName: name }),
	setNewUserPassword: (password) => set({ newUserPassword: password }),
	setNewRoleName: (name) => set({ newRoleName: name }),
	setSelectedUser: (user) => set({ selectedUser: user }),
	setSelectedRole: (role) => set({ selectedRole: role }),
	setSelectedRoleForUser: (role) => set({ selectedRoleForUser: role }),
	setPermissionType: (type) => set({ permissionType: type }),
	setPermissionKey: (key) => set({ permissionKey: key }),
	setPermissionRangeEnd: (rangeEnd) => set({ permissionRangeEnd: rangeEnd }),
	clearErrors: () =>
		set({ authError: null, usersError: null, rolesError: null }),
}));
