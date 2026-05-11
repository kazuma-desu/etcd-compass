import {
	Lock,
	LockOpen,
	RefreshCw,
	Shield,
	ShieldAlert,
	ShieldCheck,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "./auth-store";

interface AuthStatusCardProps {
	connectionId: string;
}

interface ToggleAuthDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	authEnabled: boolean;
	onToggle: () => void;
}

function ToggleAuthDialog({
	open,
	onOpenChange,
	authEnabled,
	onToggle,
}: Readonly<ToggleAuthDialogProps>) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{authEnabled ? "Disable Authentication?" : "Enable Authentication?"}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{authEnabled
							? "This will remove authentication requirements from the cluster. All connections will be allowed without credentials."
							: "This will require all connections to provide valid credentials. Ensure you have created users before enabling."}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={() => onOpenChange(false)}>
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={onToggle}
						className={
							authEnabled
								? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
								: ""
						}
					>
						{authEnabled ? "Disable" : "Enable"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function AuthStatusCard({ connectionId }: Readonly<AuthStatusCardProps>) {
	const {
		authStatus,
		authLoading,
		authError,
		showToggleAuthDialog,
		fetchAuthStatus,
		toggleAuth,
		setShowToggleAuthDialog,
		clearErrors,
	} = useAuthStore();

	useEffect(() => {
		fetchAuthStatus(connectionId);
	}, [connectionId, fetchAuthStatus]);

	if (authLoading && !authStatus) {
		return (
			<Card>
				<CardHeader>
					<Skeleton className="h-5 w-32" />
					<Skeleton className="h-4 w-48" />
				</CardHeader>
				<CardContent className="space-y-4">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-8 w-full" />
				</CardContent>
			</Card>
		);
	}

	if (authError) {
		return (
			<Card className="border-destructive">
				<CardContent className="p-6">
					<div className="flex items-start gap-4">
						<div className="p-3 bg-destructive/10 rounded-full">
							<ShieldAlert className="w-6 h-6 text-destructive" />
						</div>
						<div className="flex-1">
							<h3 className="font-semibold text-destructive">
								Failed to load authentication status
							</h3>
							<p className="text-sm text-muted-foreground mt-1">{authError}</p>
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									clearErrors();
									fetchAuthStatus(connectionId);
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

	if (!authStatus) {
		return (
			<Card>
				<CardContent className="p-6">
					<div className="flex min-h-32 flex-col items-center justify-center text-muted-foreground">
						<Shield className="w-10 h-10 mb-3 opacity-50" />
						<p className="text-sm font-medium text-foreground">
							Authentication status unavailable
						</p>
						<p className="text-xs mt-1">
							Connect to a cluster to view auth status
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<>
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<CardTitle className="text-lg flex items-center gap-2">
								{authStatus.enabled ? (
									<ShieldCheck className="w-5 h-5 text-emerald-600" />
								) : (
									<Shield className="w-5 h-5 text-muted-foreground" />
								)}
								Authentication
							</CardTitle>
							<Badge
								variant={authStatus.enabled ? "default" : "secondary"}
								className={
									authStatus.enabled
										? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
										: ""
								}
							>
								{authStatus.enabled ? "Enabled" : "Disabled"}
							</Badge>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() => fetchAuthStatus(connectionId)}
							disabled={authLoading}
						>
							<RefreshCw
								className={`w-4 h-4 mr-2 ${authLoading ? "animate-spin" : ""}`}
							/>
							Refresh
						</Button>
					</div>
					<CardDescription>
						Manage cluster authentication settings
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between p-4 rounded-lg bg-muted/45 border border-border/60">
						<div className="flex items-center gap-3">
							<div
								className={`p-2 rounded-lg ${
									authStatus.enabled
										? "bg-emerald-100 text-emerald-700"
										: "bg-muted text-muted-foreground"
								}`}
							>
								{authStatus.enabled ? (
									<Lock className="w-5 h-5" />
								) : (
									<LockOpen className="w-5 h-5" />
								)}
							</div>
							<div>
								<p className="text-sm font-medium">
									{authStatus.enabled
										? "Authentication is active"
										: "Authentication is inactive"}
								</p>
								<p className="text-xs text-muted-foreground">
									{authStatus.enabled
										? "All connections require valid credentials"
										: "No credentials required to connect"}
								</p>
							</div>
						</div>
						<Switch
							checked={authStatus.enabled}
							onCheckedChange={() => setShowToggleAuthDialog(true)}
							disabled={authLoading}
							aria-label="Toggle authentication"
						/>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="p-4 rounded-lg bg-muted/45 border border-border/60">
							<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
								Auth Revision
							</p>
							<p className="text-xl font-bold mt-1 font-mono">
								{authStatus.auth_revision}
							</p>
						</div>
						<div className="p-4 rounded-lg bg-muted/45 border border-border/60">
							<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
								Status
							</p>
							<p className="text-xl font-bold mt-1">
								{authStatus.enabled ? "Active" : "Inactive"}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<ToggleAuthDialog
				open={showToggleAuthDialog}
				onOpenChange={setShowToggleAuthDialog}
				authEnabled={authStatus.enabled}
				onToggle={() => toggleAuth(connectionId)}
			/>
		</>
	);
}
