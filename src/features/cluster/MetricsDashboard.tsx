import {
	Activity,
	BarChart3,
	Clock,
	Database,
	KeyRound,
	RefreshCw,
	XCircle,
} from "lucide-react";
import { useEffect } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { type MetricsDataPoint, useClusterStore } from "./cluster-store";

interface MetricsDashboardProps {
	connectionId: string;
}

const REFRESH_OPTIONS = [
	{ value: "5000", label: "5s" },
	{ value: "10000", label: "10s" },
	{ value: "30000", label: "30s" },
	{ value: "60000", label: "60s" },
];

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function formatTime(timestamp: number): string {
	return new Date(timestamp).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

function MetricCard({
	title,
	value,
	subtitle,
	icon: Icon,
	trend,
}: {
	title: string;
	value: string;
	subtitle?: string;
	icon: React.ElementType;
	trend?: "up" | "down" | "neutral";
}) {
	const trendColors = {
		up: "text-emerald-500",
		down: "text-rose-500",
		neutral: "text-muted-foreground",
	};

	return (
		<Card className="border-l-4 border-l-violet-500 overflow-hidden">
			<CardContent className="p-4">
				<div className="flex items-start justify-between">
					<div className="flex-1 min-w-0">
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
							{title}
						</p>
						<p className="text-2xl font-bold mt-1 font-mono truncate">
							{value}
						</p>
						{subtitle && (
							<p
								className={`text-xs mt-0.5 truncate ${trend ? trendColors[trend] : "text-muted-foreground"}`}
							>
								{subtitle}
							</p>
						)}
					</div>
					<div className="p-2 bg-violet-50 rounded-lg shrink-0 ml-3">
						<Icon className="w-5 h-5 text-violet-600" />
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function ChartCard({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<Card className="flex flex-col">
			<CardHeader className="pb-2">
				<CardTitle className="text-lg flex items-center gap-2">
					<BarChart3 className="w-5 h-5 text-violet-500" />
					{title}
				</CardTitle>
				{description && <CardDescription>{description}</CardDescription>}
			</CardHeader>
			<CardContent className="flex-1 min-h-[300px]">{children}</CardContent>
		</Card>
	);
}

function DBSizeChart({ data }: { data: MetricsDataPoint[] }) {
	return (
		<ResponsiveContainer width="100%" height="100%">
			<AreaChart
				data={data}
				margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
			>
				<defs>
					<linearGradient id="dbSizeGradient" x1="0" y1="0" x2="0" y2="1">
						<stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
						<stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
					</linearGradient>
				</defs>
				<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
				<XAxis
					dataKey="timestamp"
					tickFormatter={formatTime}
					stroke="#64748b"
					fontSize={12}
					tickLine={false}
				/>
				<YAxis
					stroke="#64748b"
					fontSize={12}
					tickLine={false}
					tickFormatter={(value) => formatBytes(value)}
				/>
				<Tooltip
					content={({ active, payload }) => {
						if (active && payload && payload.length) {
							const point = payload[0].payload as MetricsDataPoint;
							return (
								<div className="bg-background border rounded-lg shadow-lg p-3">
									<p className="text-sm font-medium text-muted-foreground">
										{formatTime(point.timestamp)}
									</p>
									<p className="text-lg font-semibold mt-1">
										{formatBytes(point.dbSize)}
									</p>
									<p className="text-sm text-muted-foreground">
										In use: {formatBytes(point.dbSizeInUse)}
									</p>
								</div>
							);
						}
						return null;
					}}
				/>
				<Area
					type="monotone"
					dataKey="dbSize"
					stroke="#8b5cf6"
					strokeWidth={2}
					fill="url(#dbSizeGradient)"
				/>
			</AreaChart>
		</ResponsiveContainer>
	);
}

function LatencyChart({ data }: { data: MetricsDataPoint[] }) {
	return (
		<ResponsiveContainer width="100%" height="100%">
			<LineChart
				data={data}
				margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
			>
				<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
				<XAxis
					dataKey="timestamp"
					tickFormatter={formatTime}
					stroke="#64748b"
					fontSize={12}
					tickLine={false}
				/>
				<YAxis
					stroke="#64748b"
					fontSize={12}
					tickLine={false}
					tickFormatter={(value) => `${value}ms`}
				/>
				<Tooltip
					content={({ active, payload }) => {
						if (active && payload && payload.length) {
							const point = payload[0].payload as MetricsDataPoint;
							return (
								<div className="bg-background border rounded-lg shadow-lg p-3">
									<p className="text-sm font-medium text-muted-foreground">
										{formatTime(point.timestamp)}
									</p>
									<p className="text-lg font-semibold mt-1">
										{Math.round(point.latencyMs)}ms
									</p>
								</div>
							);
						}
						return null;
					}}
				/>
				<Line
					type="monotone"
					dataKey="latencyMs"
					stroke="#f59e0b"
					strokeWidth={2}
					dot={false}
					activeDot={{ r: 6, fill: "#f59e0b" }}
				/>
			</LineChart>
		</ResponsiveContainer>
	);
}

function KeyCountChart({ data }: { data: MetricsDataPoint[] }) {
	return (
		<ResponsiveContainer width="100%" height="100%">
			<AreaChart
				data={data}
				margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
			>
				<defs>
					<linearGradient id="keyCountGradient" x1="0" y1="0" x2="0" y2="1">
						<stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
						<stop offset="95%" stopColor="#10b981" stopOpacity={0} />
					</linearGradient>
				</defs>
				<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
				<XAxis
					dataKey="timestamp"
					tickFormatter={formatTime}
					stroke="#64748b"
					fontSize={12}
					tickLine={false}
				/>
				<YAxis stroke="#64748b" fontSize={12} tickLine={false} />
				<Tooltip
					content={({ active, payload }) => {
						if (active && payload && payload.length) {
							const point = payload[0].payload as MetricsDataPoint;
							return (
								<div className="bg-background border rounded-lg shadow-lg p-3">
									<p className="text-sm font-medium text-muted-foreground">
										{formatTime(point.timestamp)}
									</p>
									<p className="text-lg font-semibold mt-1">
										{point.keyCount.toLocaleString()} keys
									</p>
								</div>
							);
						}
						return null;
					}}
				/>
				<Area
					type="monotone"
					dataKey="keyCount"
					stroke="#10b981"
					strokeWidth={2}
					fill="url(#keyCountGradient)"
				/>
			</AreaChart>
		</ResponsiveContainer>
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
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{[...Array(2)].map((_, i) => (
					<Card key={i}>
						<CardHeader>
							<Skeleton className="h-5 w-40" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-48 w-full" />
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}

export function MetricsDashboard({ connectionId }: MetricsDashboardProps) {
	const {
		status,
		loading,
		error,
		autoRefresh,
		refreshIntervalMs,
		metricsHistory,
		fetchStatus,
		setAutoRefresh,
		setRefreshInterval,
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
								Failed to load metrics
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

	const latestMetrics = metricsHistory[metricsHistory.length - 1];
	const avgLatency =
		metricsHistory.length > 0
			? metricsHistory.reduce((acc, m) => acc + m.latencyMs, 0) /
				metricsHistory.length
			: 0;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between flex-wrap gap-4">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">Metrics</h2>
					<p className="text-sm text-muted-foreground">
						Real-time performance monitoring and historical data
					</p>
				</div>
				<div className="flex items-center gap-4 flex-wrap">
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
					<Select
						value={refreshIntervalMs.toString()}
						onValueChange={(value) =>
							setRefreshInterval(parseInt(value, 10), connectionId)
						}
						disabled={autoRefresh}
					>
						<SelectTrigger className="w-24">
							<SelectValue placeholder="Interval" />
						</SelectTrigger>
						<SelectContent>
							{REFRESH_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
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
				<MetricCard
					title="Total Keys"
					value={latestMetrics?.keyCount.toLocaleString() ?? "—"}
					subtitle="Active keys in cluster"
					icon={KeyRound}
				/>
				<MetricCard
					title="Avg Latency"
					value={`${Math.round(avgLatency)}ms`}
					subtitle="Request response time"
					icon={Activity}
					trend={
						avgLatency < 100 ? "down" : avgLatency > 500 ? "up" : "neutral"
					}
				/>
				<MetricCard
					title="Leader Uptime"
					value={status.raft_term.toString()}
					subtitle={`Raft Index: ${status.raft_index.toLocaleString()}`}
					icon={Clock}
				/>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<ChartCard
					title="Database Size Over Time"
					description="Total database size including free space"
				>
					{metricsHistory.length > 1 ? (
						<DBSizeChart data={metricsHistory} />
					) : (
						<div className="h-full flex items-center justify-center text-muted-foreground">
							<p className="text-sm">
								Collecting data... Check back after a few refresh cycles.
							</p>
						</div>
					)}
				</ChartCard>

				<ChartCard
					title="Request Latency"
					description="API response time in milliseconds"
				>
					{metricsHistory.length > 1 ? (
						<LatencyChart data={metricsHistory} />
					) : (
						<div className="h-full flex items-center justify-center text-muted-foreground">
							<p className="text-sm">
								Collecting data... Check back after a few refresh cycles.
							</p>
						</div>
					)}
				</ChartCard>

				<ChartCard
					title="Key Count Trend"
					description="Estimated key count over time"
				>
					{metricsHistory.length > 1 ? (
						<KeyCountChart data={metricsHistory} />
					) : (
						<div className="h-full flex items-center justify-center text-muted-foreground">
							<p className="text-sm">
								Collecting data... Check back after a few refresh cycles.
							</p>
						</div>
					)}
				</ChartCard>

				<ChartCard
					title="Live Status"
					description="Current cluster health and activity"
				>
					<div className="h-full flex flex-col justify-center space-y-4">
						<div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
							<span className="text-sm font-medium">Cluster Health</span>
							<Badge
								variant="default"
								className="bg-emerald-500 hover:bg-emerald-600"
							>
								Healthy
							</Badge>
						</div>
						<div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
							<span className="text-sm font-medium">Leader ID</span>
							<code className="text-xs bg-muted px-2 py-1 rounded">
								{status.leader_id.slice(0, 16)}...
							</code>
						</div>
						<div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
							<span className="text-sm font-medium">ETCD Version</span>
							<span className="text-sm font-mono">{status.version}</span>
						</div>
						<div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
							<span className="text-sm font-medium">Data Points</span>
							<span className="text-sm font-mono">
								{metricsHistory.length} / {60}
							</span>
						</div>
					</div>
				</ChartCard>
			</div>

			<div className="flex items-center gap-6 text-xs text-muted-foreground pt-4 border-t">
				<div className="flex items-center gap-2">
					<div className="w-2 h-2 rounded-full bg-violet-500" />
					<span>DB Size</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-2 h-2 rounded-full bg-amber-500" />
					<span>Latency</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-2 h-2 rounded-full bg-emerald-500" />
					<span>Key Count</span>
				</div>
				<div className="ml-auto">
					<Badge variant="outline" className="text-xs">
						{autoRefresh
							? `Refreshing every ${refreshIntervalMs / 1000}s`
							: "Auto-refresh paused"}
					</Badge>
				</div>
			</div>
		</div>
	);
}
