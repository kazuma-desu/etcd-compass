import {
	Activity,
	AlertTriangle,
	Clock,
	Key,
	Plus,
	RefreshCw,
	Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLeaseStore } from "./lease-store";

interface LeasePanelProps {
	connectionId: string;
}

function formatDuration(seconds: number): string {
	if (seconds < 0) return "Expired";
	if (seconds < 60) return `${seconds}s`;
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	return `${hours}h ${minutes}m`;
}

export function LeasePanel({ connectionId }: LeasePanelProps) {
	const {
		leases,
		isLoading,
		selectedLeaseId,
		showGrantDialog,
		showRevokeDialog,
		grantTtl,
		setSelectedLeaseId,
		setShowGrantDialog,
		setShowRevokeDialog,
		setGrantTtl,
		loadLeases,
		grantLease,
		revokeLease,
		keepaliveLease,
	} = useLeaseStore();

	const [countdowns, setCountdowns] = useState<Record<number, number>>({});

	useEffect(() => {
		loadLeases(connectionId);
	}, [connectionId, loadLeases]);

	useEffect(() => {
		setCountdowns((prev) => {
			const next: Record<number, number> = {};
			let changed = false;
			const currentIds = new Set(leases.map((l) => l.id));
			leases.forEach((lease) => {
				if (prev[lease.id] === undefined) {
					next[lease.id] = lease.remaining;
					changed = true;
				} else if (lease.remaining !== prev[lease.id]) {
					next[lease.id] = lease.remaining;
					changed = true;
				} else {
					next[lease.id] = prev[lease.id];
				}
			});
			for (const id of Object.keys(prev)) {
				const numId = Number(id);
				if (!currentIds.has(numId)) {
					changed = true;
				}
			}
			return changed ? next : prev;
		});
	}, [leases]);

	useEffect(() => {
		const interval = setInterval(() => {
			setCountdowns((prev) => {
				const next: Record<number, number> = {};
				leases.forEach((lease) => {
					const current = prev[lease.id] ?? lease.remaining;
					next[lease.id] = Math.max(0, current - 1);
				});
				return next;
			});
		}, 1000);

		return () => clearInterval(interval);
	}, [leases]);

	const handleRefresh = useCallback(() => {
		loadLeases(connectionId);
	}, [connectionId, loadLeases]);

	const handleGrant = async () => {
		await grantLease(connectionId);
	};

	const handleRevoke = async () => {
		if (selectedLeaseId) {
			await revokeLease(connectionId, selectedLeaseId);
		}
	};

	const handleKeepalive = async (leaseId: number) => {
		await keepaliveLease(connectionId, leaseId);
	};

	const openRevokeDialog = (leaseId: number) => {
		setSelectedLeaseId(leaseId);
		setShowRevokeDialog(true);
	};

	return (
		<div className="h-full flex flex-col overflow-hidden">
			<div className="px-4 py-3 border-b border-border/70">
				<div className="flex items-center justify-between gap-2">
					<div className="min-w-0">
						<h2 className="text-sm font-semibold flex items-center gap-2 truncate">
							<Clock className="w-4 h-4 text-primary" />
							Leases
							<Badge
								variant="secondary"
								className="ml-1 text-[10px] px-1.5 py-0"
							>
								{leases.length}
							</Badge>
						</h2>
						<p className="mt-0.5 text-[11px] text-muted-foreground truncate">
							Manage TTL leases attached to keys
						</p>
					</div>
					<div className="flex items-center gap-1.5 shrink-0">
						<Button
							variant="outline"
							size="icon"
							onClick={handleRefresh}
							disabled={isLoading}
							className="h-8 w-8"
							title="Refresh leases"
							aria-label="Refresh leases"
						>
							<RefreshCw
								className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
							/>
						</Button>
						<Button
							variant="default"
							size="sm"
							onClick={() => setShowGrantDialog(true)}
							className="h-8 px-2.5"
						>
							<Plus className="w-3.5 h-3.5" />
							Grant
						</Button>
					</div>
				</div>
			</div>

			<ScrollArea className="flex-1 min-h-0 p-4">
				{leases.length === 0 ? (
					<div className="flex min-h-48 flex-col items-center justify-center rounded-md border border-dashed border-border/70 bg-background/45 p-6 text-muted-foreground">
						<Clock className="w-10 h-10 mb-3 opacity-50" />
						<p className="text-center text-sm font-medium text-foreground">
							No active leases
						</p>
						<p className="text-xs text-center mt-1 max-w-48">
							Grant a lease to attach TTL to keys
						</p>
					</div>
				) : (
					<div className="space-y-2">
						{leases.map((lease) => {
							const remaining = countdowns[lease.id] ?? lease.remaining;
							const isExpiring = remaining < 10;

							return (
								<div
									key={lease.id}
									className="rounded-md border border-border/60 bg-background/70 p-3 shadow-sm transition-colors hover:bg-muted/35"
								>
									<div className="flex items-start justify-between gap-2">
										<div className="min-w-0 space-y-1">
											<div className="text-[10px] uppercase tracking-wide text-muted-foreground">
												Lease ID
											</div>
											<div className="truncate font-mono text-xs font-medium">
												{lease.id}
											</div>
										</div>
										<div className="flex items-center gap-1 shrink-0">
											<Button
												variant="ghost"
												size="icon"
												onClick={() => handleKeepalive(lease.id)}
												title="Keep alive"
												aria-label={`Keep lease ${lease.id} alive`}
												className="h-7 w-7"
											>
												<Activity className="w-3.5 h-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => openRevokeDialog(lease.id)}
												className="h-7 w-7 text-destructive hover:text-destructive"
												title="Revoke"
												aria-label={`Revoke lease ${lease.id}`}
											>
												<Trash2 className="w-3.5 h-3.5" />
											</Button>
										</div>
									</div>

									<div className="mt-3 grid grid-cols-3 gap-2 text-xs">
										<div className="rounded-sm bg-muted/45 px-2 py-1.5">
											<div className="text-[10px] text-muted-foreground">
												Remaining
											</div>
											<div className="mt-0.5 flex items-center gap-1 font-medium">
												<span>{formatDuration(remaining)}</span>
												{isExpiring && remaining > 0 && (
													<AlertTriangle className="w-3 h-3 text-destructive" />
												)}
											</div>
										</div>
										<div className="rounded-sm bg-muted/45 px-2 py-1.5">
											<div className="text-[10px] text-muted-foreground">
												TTL
											</div>
											<div className="mt-0.5 font-medium">
												{formatDuration(lease.grantedTtl)}
											</div>
										</div>
										<div className="rounded-sm bg-muted/45 px-2 py-1.5">
											<div className="text-[10px] text-muted-foreground">
												Keys
											</div>
											<div className="mt-0.5 flex items-center gap-1 font-medium">
												<Key className="w-3 h-3 text-muted-foreground" />
												{lease.keys.length}
											</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</ScrollArea>

			<Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Grant New Lease</DialogTitle>
						<DialogDescription>
							Create a new lease with a specified TTL (time-to-live) in seconds.
							Keys attached to this lease will expire when the lease expires.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="ttl">TTL (seconds)</Label>
							<Input
								id="ttl"
								type="number"
								min="1"
								placeholder="e.g., 60"
								value={grantTtl}
								onChange={(e) => setGrantTtl(e.target.value)}
							/>
							<p className="text-xs text-muted-foreground">
								Minimum: 1 second. Recommended: 60+ seconds.
							</p>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setShowGrantDialog(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleGrant}
							disabled={!grantTtl || parseInt(grantTtl, 10) <= 0}
						>
							Grant Lease
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Revoke Lease?</AlertDialogTitle>
						<AlertDialogDescription>
							This will immediately revoke lease{" "}
							<strong>{selectedLeaseId}</strong>. All keys attached to this
							lease will be deleted immediately. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setShowRevokeDialog(false)}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleRevoke}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Revoke
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
