import {
	Plus,
	RefreshCw,
	Shield,
	Trash2,
	UserMinus,
	UserPlus,
	Users,
	XCircle,
} from "lucide-react";
import { useEffect } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "./auth-store";

interface UsersTabProps {
	connectionId: string;
}

export function UsersTab({ connectionId }: Readonly<UsersTabProps>) {
	const {
		users,
		usersLoading,
		usersError,
		roles,
		showAddUserDialog,
		showDeleteUserDialog,
		showGrantRoleDialog,
		showRevokeRoleDialog,
		newUserName,
		newUserPassword,
		selectedUser,
		selectedRoleForUser,
		fetchUsers,
		fetchRoles,
		addUser,
		deleteUser,
		grantRoleToUser,
		revokeRoleFromUser,
		setShowAddUserDialog,
		setShowDeleteUserDialog,
		setShowGrantRoleDialog,
		setShowRevokeRoleDialog,
		setNewUserName,
		setNewUserPassword,
		setSelectedUser,
		setSelectedRoleForUser,
		clearErrors,
	} = useAuthStore();

	useEffect(() => {
		fetchUsers(connectionId);
		fetchRoles(connectionId);
	}, [connectionId, fetchUsers, fetchRoles]);

	const handleDeleteClick = (user: (typeof users)[0]) => {
		setSelectedUser(user);
		setShowDeleteUserDialog(true);
	};

	const handleGrantRoleClick = (user: (typeof users)[0]) => {
		setSelectedUser(user);
		setSelectedRoleForUser("");
		setShowGrantRoleDialog(true);
	};

	const handleRevokeRoleClick = (user: (typeof users)[0], role: string) => {
		setSelectedUser(user);
		setSelectedRoleForUser(role);
		setShowRevokeRoleDialog(true);
	};

	const availableRolesForGrant = (user: (typeof users)[0]) => {
		return roles.filter((r) => !user.roles.includes(r.name));
	};

	if (usersLoading && users.length === 0) {
		return (
			<Card>
				<CardHeader>
					<div className="h-5 w-32 bg-accent animate-pulse rounded" />
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						{[1, 2, 3].map((n) => (
							<div key={`user-skeleton-${n}`} className="h-12 bg-accent animate-pulse rounded" />
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	if (usersError) {
		return (
			<Card className="border-destructive">
				<CardContent className="p-6">
					<div className="flex items-start gap-4">
						<div className="p-3 bg-destructive/10 rounded-full">
							<XCircle className="w-6 h-6 text-destructive" />
						</div>
						<div className="flex-1">
							<h3 className="font-semibold text-destructive">
								Failed to load users
							</h3>
							<p className="text-sm text-muted-foreground mt-1">{usersError}</p>
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									clearErrors();
									fetchUsers(connectionId);
								}}
								className="mt-4"
							>
								<RefreshCw className="w-4 h-4 mr-2" />
								Retry
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<>
			<Card className="gap-3 py-0">
				<CardHeader className="px-5 pt-4 pb-0 gap-1">
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center gap-2 text-lg">
							<Users className="w-5 h-5" />
							Users
							<Badge
								variant="secondary"
								className="ml-1 text-[10px] px-1.5 py-0"
							>
								{users.length}
							</Badge>
						</CardTitle>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => fetchUsers(connectionId)}
								disabled={usersLoading}
							>
								<RefreshCw
									className={`w-4 h-4 mr-2 ${usersLoading ? "animate-spin" : ""}`}
								/>
								Refresh
							</Button>
							<Button
								size="sm"
								onClick={() => {
									setNewUserName("");
									setNewUserPassword("");
									setShowAddUserDialog(true);
								}}
							>
								<Plus className="w-4 h-4 mr-2" />
								Add User
							</Button>
						</div>
					</div>
					<CardDescription>
						Manage users and their assigned roles
					</CardDescription>
				</CardHeader>
				<CardContent className="px-5 pb-4">
					{users.length === 0 ? (
						<div className="flex min-h-48 flex-col items-center justify-center rounded-md border border-dashed border-border/70 bg-background/45 p-6 text-muted-foreground">
							<Users className="w-10 h-10 mb-3 opacity-50" />
							<p className="text-center text-sm font-medium text-foreground">
								No users found
							</p>
							<p className="text-xs text-center mt-1 max-w-48">
								Add a user to manage cluster access
							</p>
						</div>
					) : (
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow className="bg-muted/50">
										<TableHead>User Name</TableHead>
										<TableHead>Roles</TableHead>
										<TableHead className="w-[180px]">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{users.map((user) => (
										<TableRow key={user.name}>
											<TableCell className="font-medium">
												<div className="flex items-center gap-2">
													<span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
														{user.name.charAt(0).toUpperCase()}
													</span>
													{user.name}
												</div>
											</TableCell>
											<TableCell>
												<div className="flex flex-wrap gap-1">
													{user.roles.length === 0 ? (
														<span className="text-xs text-muted-foreground italic">
															No roles
														</span>
													) : (
														user.roles.map((role) => (
															<Badge
																key={role}
																variant="secondary"
																className="text-[10px] cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors"
																onClick={() =>
																	handleRevokeRoleClick(user, role)
																}
																title="Click to revoke"
															>
																<Shield className="w-2.5 h-2.5 mr-1" />
																{role}
															</Badge>
														))
													)}
												</div>
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-1">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleGrantRoleClick(user)}
														disabled={availableRolesForGrant(user).length === 0}
													>
														<UserPlus className="w-3.5 h-3.5 mr-1" />
														Grant
													</Button>
													<Button
														variant="ghost"
														size="sm"
														className="text-destructive hover:text-destructive"
														onClick={() => handleDeleteClick(user)}
													>
														<Trash2 className="w-3.5 h-3.5 mr-1" />
														Delete
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			<Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add New User</DialogTitle>
						<DialogDescription>
							Create a new user with a password
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="user-name">User Name</Label>
							<Input
								id="user-name"
								placeholder="e.g., admin"
								value={newUserName}
								onChange={(e) => setNewUserName(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="user-password">Password</Label>
							<Input
								id="user-password"
								type="password"
								placeholder="Enter password"
								value={newUserPassword}
								onChange={(e) => setNewUserPassword(e.target.value)}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowAddUserDialog(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={() => addUser(connectionId)}
							disabled={!newUserName.trim()}
						>
							<Plus className="w-4 h-4 mr-2" />
							Add User
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={showDeleteUserDialog}
				onOpenChange={setShowDeleteUserDialog}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete User?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete user{" "}
							<strong>{selectedUser?.name}</strong>. This action cannot be
							undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setShowDeleteUserDialog(false)}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => deleteUser(connectionId)}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							<Trash2 className="w-4 h-4 mr-2" />
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<Dialog open={showGrantRoleDialog} onOpenChange={setShowGrantRoleDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Grant Role to {selectedUser?.name}</DialogTitle>
						<DialogDescription>
							Select a role to assign to this user
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="role-select">Role</Label>
							<Select
								value={selectedRoleForUser}
								onValueChange={setSelectedRoleForUser}
							>
								<SelectTrigger id="role-select">
									<SelectValue placeholder="Select a role" />
								</SelectTrigger>
								<SelectContent>
									{availableRolesForGrant(
										selectedUser ?? { name: "", roles: [] },
									).map((role) => (
										<SelectItem key={role.name} value={role.name}>
											{role.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowGrantRoleDialog(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={() => grantRoleToUser(connectionId)}
							disabled={!selectedRoleForUser}
						>
							<UserPlus className="w-4 h-4 mr-2" />
							Grant Role
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={showRevokeRoleDialog}
				onOpenChange={setShowRevokeRoleDialog}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Revoke Role?</AlertDialogTitle>
						<AlertDialogDescription>
							Remove role <strong>{selectedRoleForUser}</strong> from user{" "}
							<strong>{selectedUser?.name}</strong>.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setShowRevokeRoleDialog(false)}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => revokeRoleFromUser(connectionId)}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							<UserMinus className="w-4 h-4 mr-2" />
							Revoke
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
