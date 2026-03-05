import {
	Activity,
	Crown,
	Database,
	RefreshCw,
	Server,
	Users,
	XCircle,
} from "lucide-react";
import { useEffect } from "react";
import type { ClusterMember } from "@/commands/types";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useClusterStore } from "./cluster-store";

interface ClusterStatusProps {
	connectionId: string;
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function HealthIndicator({ health }: { health: ClusterMember["health"] }) {
	if (health === "healthy") {
		return (
			<div className="flex items-center gap-2">
				<div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
				<span className="text-xs font-medium text-emerald-600">Healthy</span>
			</div>
		);
	}
	if (health === "unhealthy") {
		return (
			<div className="flex items-center gap-2">
				<div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
				<span className="text-xs font-medium text-rose-600">Unhealthy</span>
			</div>
		);
	}
	return (
		<div className="flex items-center gap-2">
			<div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
			<span className="text-xs font-medium text-amber-600">Unknown</span>
		</div>
	);
}

function MetricCard({
	title,
	value,
	subtitle,
	icon: Icon,
}: {
	title: string;
	value: string;
	subtitle?: string;
	icon: React.ElementType;
}) {
	return (
		<Card className="border-l-4 border-l-indigo-500">
			<CardContent className="p-4">
				<div className="flex items-start justify-between">
					<div>
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
							{title}
						</p>
						<p className="text-2xl font-bold mt-1 font-mono">{value}</p>
						{subtitle && (
							<p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
						)}
					</div>
					<div className="p-2 bg-indigo-50 rounded-lg">
						<Icon className="w-5 h-5 text-indigo-600" />
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function MembersTable({ members }: { members: ClusterMember[] }) {
	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow className="bg-muted/50">
						<TableHead className="w-[80px]">Status</TableHead>
						<TableHead>Member ID</TableHead>
						<TableHead>Name</TableHead>
						<TableHead>Role</TableHead>
						<TableHead className="hidden md:table-cell">Client URLs</TableHead>
						<TableHead className="hidden lg:table-cell">Peer URLs</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{members.map((member) => (
						<TableRow
							key={member.id}
							className={member.is_leader ? "bg-amber-50/50" : undefined}
						>
							<TableCell>
								<HealthIndicator health={member.health} />
							</TableCell>
							<TableCell className="font-mono text-xs">
								{member.id.slice(0, 16)}...
							</TableCell>
							<TableCell className="font-medium">
								{member.name || "—"}
							</TableCell>
							<TableCell>
								{member.is_leader ? (
									<Badge
										variant="default"
										className="bg-amber-500 hover:bg-amber-600"
									>
										<Crown className="w-3 h-3 mr-1" />
										Leader
									</Badge>
								) : (
									<Badge variant="secondary">Follower</Badge>
								)}
							</TableCell>
							<TableCell className="hidden md:table-cell">
								<div className="flex flex-col gap-1">
									{member.client_urls.map((url) => (
										<code
											key={url}
											className="text-xs bg-muted px-1.5 py-0.5 rounded"
										>
											{url}
										</code>
									))}
								</div>
							</TableCell>
							<TableCell className="hidden lg:table-cell">
								<div className="flex flex-col gap-1">
									{member.peer_urls.map((url) => (
										<code
											key={url}
											className="text-xs bg-muted px-1.5 py-0.5 rounded"
										>
											{url}
										</code>
									))}
								</div>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

function LoadingState() {
	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{[...Array(4)].map((_, i) => (
					<Card key={i}>
						<CardContent className="p-4">
							<Skeleton className="h-4 w-20 mb-2" />
							<Skeleton className="h-8 w-32" />
						</CardContent>
					</Card>
				))}
			</div>
			<Card>
				<CardHeader>
					<Skeleton className="h-5 w-40" />
				</CardHeader>
				<CardContent>
					<Skeleton className="h-32 w-full" />
				</CardContent>
			</Card>
		</div>
	);
}

export function ClusterStatus({ connectionId }: ClusterStatusProps) {
	const {
		status,
		loading,
		error,
		autoRefresh,
		fetchStatus,
		setAutoRefresh,
		clearError,
	} = useClusterStore();

	useEffect(() => {
		fetchStatus(connectionId);
		return () => {
			setAutoRefresh(false);
		};
	}, [connectionId, fetchStatus, setAutoRefresh]);

	useEffect(() => {
		if (autoRefresh) {
			setAutoRefresh(true, connectionId);
		}
	}, [connectionId, autoRefresh, setAutoRefresh]);

	if (loading && !status) {
		return <LoadingState />;
	}

	if (error) {
		return (
			<Card className="border-destructive">
				<CardContent className="p-6">
					<div className="flex items-start gap-4">
						<div className="p-3 bg-destructive/10 rounded-full">
							<XCircle className="w-6 h-6 text-destructive" />
						</div>
						<div className="flex-1">
							<h3 className="font-semibold text-destructive">
								Failed to load cluster status
							</h3>
							<p className="text-sm text-muted-foreground mt-1">{error}</p>
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									clearError();
									fetchStatus(connectionId);
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

	if (!status) return null;

	const healthyMembers = status.members.filter(
		(m) => m.health === "healthy",
	).length;
	const totalMembers = status.members.length;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">Cluster Status</h2>
					<p className="text-sm text-muted-foreground">
						Cluster ID:{" "}
						<code className="text-xs bg-muted px-1.5 py-0.5 rounded">
							{status.cluster_id}
						</code>
					</p>
				</div>
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<Switch
							id="auto-refresh"
							checked={autoRefresh}
							onCheckedChange={(checked) =>
								setAutoRefresh(checked, connectionId)
							}
						/>
						<label
							htmlFor="auto-refresh"
							className="text-sm font-medium cursor-pointer"
						>
							Auto-refresh
						</label>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={() => fetchStatus(connectionId)}
						disabled={loading}
					>
						<RefreshCw
							className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
						/>
						Refresh
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<MetricCard
					title="Database Size"
					value={formatBytes(status.db_size)}
					subtitle={`${formatBytes(status.db_size_in_use)} in use`}
					icon={Database}
				/>
				<MetricCard title="ETCD Version" value={status.version} icon={Server} />
				<MetricCard
					title="Raft Term"
					value={status.raft_term.toString()}
					subtitle={`Index: ${status.raft_index}`}
					icon={Activity}
				/>
				<MetricCard
					title="Members"
					value={`${healthyMembers}/${totalMembers}`}
					subtitle={
						healthyMembers === totalMembers
							? "All healthy"
							: `${totalMembers - healthyMembers} unknown`
					}
					icon={Users}
				/>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-lg">
						<Users className="w-5 h-5" />
						Cluster Members
					</CardTitle>
					<CardDescription>
						{status.members.length} member
						{status.members.length !== 1 ? "s" : ""} in the cluster
						{status.leader_id && (
							<span className="ml-1">
								· Leader:{" "}
								<code className="text-xs bg-muted px-1.5 py-0.5 rounded">
									{status.leader_id.slice(0, 16)}...
								</code>
							</span>
						)}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<MembersTable members={status.members} />
				</CardContent>
			</Card>

			<div className="flex items-center gap-6 text-xs text-muted-foreground pt-4 border-t">
				<div className="flex items-center gap-2">
					<div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
					<span>Healthy</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
					<span>Unknown</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
					<span>Unhealthy</span>
				</div>
				<div className="flex items-center gap-2 ml-auto">
					<Crown className="w-3.5 h-3.5 text-amber-500" />
					<span>Leader</span>
				</div>
			</div>
		</div>
	);
}
