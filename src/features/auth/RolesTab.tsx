import {
	ChevronDown,
	ChevronRight,
	KeyRound,
	Lock,
	Plus,
	RefreshCw,
	Shield,
	Trash2,
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

interface RolesTabProps {
	connectionId: string;
}

const PERMISSION_TYPE_LABELS: Record<string, string> = {
	read: "Read",
	write: "Write",
	readwrite: "Read & Write",
};

export function RolesTab({ connectionId }: RolesTabProps) {
	const {
		roles,
		rolesLoading,
		rolesError,
		rolePermissions,
		expandedRoles,
		showAddRoleDialog,
		showDeleteRoleDialog,
		showGrantPermissionDialog,
		showRevokePermissionDialog,
		newRoleName,
		selectedRole,
		permissionType,
		permissionKey,
		permissionRangeEnd,
		fetchRoles,
		addRole,
		deleteRole,
		fetchRolePermissions,
		grantPermission,
		revokePermission,
		toggleRoleExpanded,
		setShowAddRoleDialog,
		setShowDeleteRoleDialog,
		setShowGrantPermissionDialog,
		setShowRevokePermissionDialog,
		setNewRoleName,
		setSelectedRole,
		setPermissionType,
		setPermissionKey,
		setPermissionRangeEnd,
	} = useAuthStore();

	useEffect(() => {
		fetchRoles(connectionId);
	}, [connectionId, fetchRoles]);

	const handleExpandRole = (roleName: string) => {
		toggleRoleExpanded(roleName);
		if (!expandedRoles.has(roleName)) {
			fetchRolePermissions(connectionId, roleName);
		}
	};

	const handleDeleteClick = (role: (typeof roles)[0]) => {
		setSelectedRole(role);
		setShowDeleteRoleDialog(true);
	};

	const handleGrantPermissionClick = (role: (typeof roles)[0]) => {
		setSelectedRole(role);
		setPermissionType("read");
		setPermissionKey("");
		setPermissionRangeEnd("");
		setShowGrantPermissionDialog(true);
	};

	const handleRevokePermissionClick = (
		role: (typeof roles)[0],
		key: string,
		rangeEnd: string | null,
	) => {
		setSelectedRole(role);
		setPermissionKey(key);
		setPermissionRangeEnd(rangeEnd ?? "");
		setShowRevokePermissionDialog(true);
	};

	if (rolesLoading && roles.length === 0) {
		return (
			<Card>
				<CardHeader>
					<div className="h-5 w-32 bg-accent animate-pulse rounded" />
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						{[...Array(3)].map((_, i) => (
							<div key={i} className="h-12 bg-accent animate-pulse rounded" />
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	if (rolesError) {
		return (
			<Card className="border-destructive">
				<CardContent className="p-6">
					<div className="flex items-start gap-4">
						<div className="p-3 bg-destructive/10 rounded-full">
							<XCircle className="w-6 h-6 text-destructive" />
						</div>
						<div className="flex-1">
							<h3 className="font-semibold text-destructive">
								Failed to load roles
							</h3>
							<p className="text-sm text-muted-foreground mt-1">{rolesError}</p>
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									fetchRoles(connectionId);
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
							<Shield className="w-5 h-5" />
							Roles
							<Badge
								variant="secondary"
								className="ml-1 text-[10px] px-1.5 py-0"
							>
								{roles.length}
							</Badge>
						</CardTitle>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => fetchRoles(connectionId)}
								disabled={rolesLoading}
							>
								<RefreshCw
									className={`w-4 h-4 mr-2 ${rolesLoading ? "animate-spin" : ""}`}
								/>
								Refresh
							</Button>
							<Button
								size="sm"
								onClick={() => {
									setNewRoleName("");
									setShowAddRoleDialog(true);
								}}
							>
								<Plus className="w-4 h-4 mr-2" />
								Add Role
							</Button>
						</div>
					</div>
					<CardDescription>Manage roles and their permissions</CardDescription>
				</CardHeader>
				<CardContent className="px-5 pb-4">
					{roles.length === 0 ? (
						<div className="flex min-h-48 flex-col items-center justify-center rounded-md border border-dashed border-border/70 bg-background/45 p-6 text-muted-foreground">
							<Shield className="w-10 h-10 mb-3 opacity-50" />
							<p className="text-center text-sm font-medium text-foreground">
								No roles found
							</p>
							<p className="text-xs text-center mt-1 max-w-48">
								Add a role to manage permissions
							</p>
						</div>
					) : (
						<div className="space-y-2">
							{roles.map((role) => {
								const isExpanded = expandedRoles.has(role.name);
								const perms = rolePermissions.get(role.name);

								return (
									<div
										key={role.name}
										className="rounded-md border border-border/60 bg-background/70 overflow-hidden"
									>
										<div className="flex items-center justify-between p-3 hover:bg-muted/35 transition-colors">
											<div className="flex items-center gap-2 min-w-0">
												<Button
													variant="ghost"
													size="icon"
													className="h-6 w-6 shrink-0"
													onClick={() => handleExpandRole(role.name)}
												>
													{isExpanded ? (
														<ChevronDown className="w-4 h-4" />
													) : (
														<ChevronRight className="w-4 h-4" />
													)}
												</Button>
												<Shield className="w-4 h-4 text-muted-foreground shrink-0" />
												<span className="font-medium text-sm truncate">
													{role.name}
												</span>
											</div>
											<div className="flex items-center gap-1 shrink-0">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleGrantPermissionClick(role)}
												>
													<Lock className="w-3.5 h-3.5 mr-1" />
													Grant
												</Button>
												<Button
													variant="ghost"
													size="sm"
													className="text-destructive hover:text-destructive"
													onClick={() => handleDeleteClick(role)}
												>
													<Trash2 className="w-3.5 h-3.5 mr-1" />
													Delete
												</Button>
											</div>
										</div>

										{isExpanded && perms && (
											<div className="border-t border-border/60 bg-muted/20">
												{perms.permissions.length === 0 ? (
													<div className="p-4 text-center text-sm text-muted-foreground">
														No permissions assigned
													</div>
												) : (
													<Table>
														<TableHeader>
															<TableRow className="bg-muted/30">
																<TableHead className="text-xs">Type</TableHead>
																<TableHead className="text-xs">Key</TableHead>
																<TableHead className="text-xs">
																	Range End
																</TableHead>
																<TableHead className="w-[80px]"></TableHead>
															</TableRow>
														</TableHeader>
														<TableBody>
															{perms.permissions.map((perm) => (
																<TableRow
																	key={`${role.name}-${perm.key}-${perm.perm_type}-${perm.range_end || ""}`}
																>
																	<TableCell>
																		<Badge
																			variant="outline"
																			className="text-[10px]"
																		>
																			{PERMISSION_TYPE_LABELS[perm.perm_type] ||
																				perm.perm_type}
																		</Badge>
																	</TableCell>
																	<TableCell className="font-mono text-xs">
																		<div className="flex items-center gap-1">
																			<KeyRound className="w-3 h-3 text-muted-foreground" />
																			<span className="truncate max-w-[200px]">
																				{perm.key}
																			</span>
																		</div>
																	</TableCell>
																	<TableCell className="font-mono text-xs text-muted-foreground">
																		{perm.range_end || "—"}
																	</TableCell>
																	<TableCell>
																		<Button
																			variant="ghost"
																			size="icon"
																			className="h-7 w-7 text-destructive hover:text-destructive"
																			onClick={() =>
																				handleRevokePermissionClick(
																					role,
																					perm.key,
																					perm.range_end,
																				)
																			}
																		>
																			<Trash2 className="w-3.5 h-3.5" />
																		</Button>
																	</TableCell>
																</TableRow>
															))}
														</TableBody>
													</Table>
												)}
											</div>
										)}
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>

			<Dialog open={showAddRoleDialog} onOpenChange={setShowAddRoleDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add New Role</DialogTitle>
						<DialogDescription>
							Create a new role for permission management
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="role-name">Role Name</Label>
							<Input
								id="role-name"
								placeholder="e.g., readonly"
								value={newRoleName}
								onChange={(e) => setNewRoleName(e.target.value)}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowAddRoleDialog(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={() => addRole(connectionId)}
							disabled={!newRoleName.trim()}
						>
							<Plus className="w-4 h-4 mr-2" />
							Add Role
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={showDeleteRoleDialog}
				onOpenChange={setShowDeleteRoleDialog}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Role?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete role{" "}
							<strong>{selectedRole?.name}</strong> and all its permissions.
							This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setShowDeleteRoleDialog(false)}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => deleteRole(connectionId)}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							<Trash2 className="w-4 h-4 mr-2" />
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<Dialog
				open={showGrantPermissionDialog}
				onOpenChange={setShowGrantPermissionDialog}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Grant Permission to {selectedRole?.name}</DialogTitle>
						<DialogDescription>
							Define a key permission for this role
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="perm-type">Permission Type</Label>
							<Select value={permissionType} onValueChange={setPermissionType}>
								<SelectTrigger id="perm-type">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="read">Read</SelectItem>
									<SelectItem value="write">Write</SelectItem>
									<SelectItem value="readwrite">Read & Write</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="perm-key">Key</Label>
							<Input
								id="perm-key"
								placeholder="e.g., /config/*"
								value={permissionKey}
								onChange={(e) => setPermissionKey(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="perm-range-end">Range End (optional)</Label>
							<Input
								id="perm-range-end"
								placeholder="e.g., /config0"
								value={permissionRangeEnd}
								onChange={(e) => setPermissionRangeEnd(e.target.value)}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowGrantPermissionDialog(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={() => grantPermission(connectionId)}
							disabled={!permissionKey.trim()}
						>
							<Lock className="w-4 h-4 mr-2" />
							Grant Permission
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={showRevokePermissionDialog}
				onOpenChange={setShowRevokePermissionDialog}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Revoke Permission?</AlertDialogTitle>
						<AlertDialogDescription>
							Remove permission for key{" "}
							<code className="text-primary">{permissionKey}</code> from role{" "}
							<strong>{selectedRole?.name}</strong>.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel
							onClick={() => setShowRevokePermissionDialog(false)}
						>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => revokePermission(connectionId)}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							<Trash2 className="w-4 h-4 mr-2" />
							Revoke
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
