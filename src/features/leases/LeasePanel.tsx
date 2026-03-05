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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
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
		<div className="h-full flex flex-col">
			<div className="flex items-center justify-between p-4 border-b">
				<div className="flex items-center gap-2">
					<Clock className="w-5 h-5 text-primary" />
					<h2 className="text-lg font-semibold">Leases</h2>
					<Badge variant="secondary" className="text-xs">
						{leases.length}
					</Badge>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleRefresh}
						disabled={isLoading}
					>
						<RefreshCw
							className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
						/>
					</Button>
					<Button
						variant="default"
						size="sm"
						onClick={() => setShowGrantDialog(true)}
					>
						<Plus className="w-4 h-4 mr-2" />
						Grant
					</Button>
				</div>
			</div>

			<ScrollArea className="flex-1">
				{leases.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
						<Clock className="w-12 h-12 mb-4 opacity-50" />
						<p className="text-center">No active leases</p>
						<p className="text-sm text-center mt-2">
							Grant a lease to attach TTL to keys
						</p>
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[100px]">ID</TableHead>
								<TableHead>Remaining</TableHead>
								<TableHead>TTL</TableHead>
								<TableHead>Keys</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{leases.map((lease) => {
								const remaining = countdowns[lease.id] ?? lease.remaining;
								const isExpiring = remaining < 10;

								return (
									<TableRow key={lease.id}>
										<TableCell className="font-mono text-xs">
											{lease.id}
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<Badge
													variant={isExpiring ? "destructive" : "secondary"}
													className="text-xs"
												>
													{formatDuration(remaining)}
												</Badge>
												{isExpiring && remaining > 0 && (
													<AlertTriangle className="w-4 h-4 text-destructive" />
												)}
											</div>
										</TableCell>

										<TableCell className="text-muted-foreground text-sm">
											{formatDuration(lease.grantedTtl)}
										</TableCell>

										<TableCell>
											<div className="flex items-center gap-1">
												<Key className="w-3 h-3 text-muted-foreground" />
												<span className="text-sm">{lease.keys.length}</span>
											</div>
										</TableCell>

										<TableCell className="text-right">
											<div className="flex items-center justify-end gap-1">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleKeepalive(lease.id)}
													title="Keep alive"
												>
													<Activity className="w-4 h-4" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => openRevokeDialog(lease.id)}
													className="text-destructive hover:text-destructive"
													title="Revoke"
												>
													<Trash2 className="w-4 h-4" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
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
