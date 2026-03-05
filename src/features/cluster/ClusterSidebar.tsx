import {
	ChevronDown,
	ChevronRight,
	Copy,
	Database,
	Download,
	Edit,
	Folder,
	MoreVertical,
	PanelLeftClose,
	PanelLeftOpen,
	Plus,
	RefreshCw,
	Search,
	Star,
	StarOff,
	Trash2,
	Unplug,
	Upload,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
	duplicateConnection,
	getConnectionHistory,
	importConnections,
	removeFromHistory,
	updateConnectionFavorite,
} from "@/commands/config";
import { disconnectEtcd, listConnections } from "@/commands/connection";
import {
	openFileDialog,
	readFile,
	saveFileDialog,
	writeFile,
} from "@/commands/native";
import type { EtcdConfig } from "@/commands/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
	useSidebar,
} from "@/components/ui/sidebar";
import { useConnectionStore } from "@/features/connections/connection-store";
import { ThemeToggle } from "@/shared/components/ThemeToggle";

interface ClusterSidebarProps {
	onAddCluster: () => void;
	onEditCluster?: (endpoint: string) => void;
}

interface ConnectionInfo {
	id: string;
	endpoint: string;
	name?: string;
	color?: string;
	isFavorite?: boolean;
	group?: string;
}

export function ClusterSidebar({
	onAddCluster,
	onEditCluster,
}: ClusterSidebarProps) {
	const { connectionId, disconnect } = useConnectionStore();
	const { state, toggleSidebar } = useSidebar();
	const [connections, setConnections] = useState<ConnectionInfo[]>([]);
	const [filter, setFilter] = useState("");
	const [expandedClusters, setExpandedClusters] = useState<Set<string>>(
		new Set(),
	);

	const loadConnections = useCallback(async () => {
		try {
			// Get full config details from history
			const history = await getConnectionHistory();
			// Get active connection UUIDs mapped to endpoints
			const active = await listConnections();
			const endpointToId = new Map(
				active.map(([id, endpoint]) => [endpoint, id]),
			);

			setConnections(
				history.map((config) => ({
					id: endpointToId.get(config.endpoint) || config.endpoint,
					endpoint: config.endpoint,
					name: config.name,
					color: config.color,
					isFavorite: config.isFavorite,
					group: config.group,
				})),
			);
		} catch (e: unknown) {
			toast.error(
				"Failed to list connections: " +
					(e instanceof Error ? e.message : String(e)),
			);
		}
	}, []);

	useEffect(() => {
		loadConnections();
	}, [loadConnections]);

	const handleDisconnect = async (id: string) => {
		try {
			await disconnectEtcd(id);
			if (id === connectionId) {
				await disconnect();
			}
			await loadConnections();
			toast.success("Disconnected from cluster");
		} catch (_e) {
			toast.error("Failed to disconnect");
		}
	};

	const handleRemove = async (id: string, endpoint: string) => {
		try {
			await removeFromHistory(endpoint);
			if (id === connectionId) {
				await disconnect();
			}
			await loadConnections();
			toast.success("Removed cluster");
		} catch (_e) {
			toast.error("Failed to remove cluster");
		}
	};

	const handleCopyEndpoint = (endpoint: string) => {
		navigator.clipboard.writeText(endpoint);
		toast.success("Endpoint copied to clipboard");
	};

	const handleEditConnection = (endpoint: string) => {
		if (onEditCluster) {
			onEditCluster(endpoint);
		} else {
			toast.info(`Edit connection: ${endpoint}`);
		}
	};

	const handleRefresh = () => {
		loadConnections();
		toast.success("Refreshed cluster list");
	};

	const handleToggleFavorite = async (
		endpoint: string,
		isFavorite: boolean,
	) => {
		try {
			await updateConnectionFavorite(endpoint, !isFavorite);
			await loadConnections();
			toast.success(
				isFavorite ? "Removed from favorites" : "Added to favorites",
			);
		} catch (_e) {
			toast.error("Failed to update favorite status");
		}
	};

	const handleDuplicate = async (conn: ConnectionInfo) => {
		try {
			await duplicateConnection(conn.endpoint);
			await loadConnections();
			toast.success("Connection duplicated");
		} catch (_e) {
			toast.error("Failed to duplicate connection");
		}
	};

	const handleExportProfiles = async () => {
		try {
			const filePath = await saveFileDialog(
				[{ name: "JSON", extensions: ["json"] }],
				"etcd-connections.json",
			);

			if (filePath) {
				const configs = await getConnectionHistory();
				await writeFile(filePath as string, JSON.stringify(configs, null, 2));
				toast.success("Connections exported successfully");
			}
		} catch (_e) {
			toast.error("Failed to export connections");
		}
	};

	const handleImportProfiles = async () => {
		try {
			const filePath = await openFileDialog(
				[{ name: "JSON", extensions: ["json"] }],
				false,
			);

			if (filePath && typeof filePath === "string") {
				const content = await readFile(filePath);
				const configs: EtcdConfig[] = JSON.parse(content);
				await importConnections(configs);
				await loadConnections();
				toast.success(`${configs.length} connections imported successfully`);
			}
		} catch (e: unknown) {
			toast.error(
				"Failed to import connections: " +
					(e instanceof Error ? e.message : String(e)),
			);
		}
	};

	const toggleClusterExpanded = (clusterId: string) => {
		const newExpanded = new Set(expandedClusters);
		if (newExpanded.has(clusterId)) {
			newExpanded.delete(clusterId);
		} else {
			newExpanded.add(clusterId);
		}
		setExpandedClusters(newExpanded);
	};

	// Sort connections: favorites first, then alphabetically by name/endpoint
	const sortedConnections = [...connections].sort((a, b) => {
		if (a.isFavorite && !b.isFavorite) return -1;
		if (!a.isFavorite && b.isFavorite) return 1;
		const aName = a.name || a.endpoint;
		const bName = b.name || b.endpoint;
		return aName.localeCompare(bName);
	});

	const filteredConnections = sortedConnections.filter((conn) => {
		const searchStr = filter.toLowerCase();
		const nameMatch = (conn.name || "").toLowerCase().includes(searchStr);
		const endpointMatch = conn.endpoint.toLowerCase().includes(searchStr);
		const groupMatch = (conn.group || "").toLowerCase().includes(searchStr);
		return nameMatch || endpointMatch || groupMatch;
	});

	// Group connections by group
	const groupedConnections = filteredConnections.reduce(
		(acc, conn) => {
			const group = conn.group || "Ungrouped";
			if (!acc[group]) acc[group] = [];
			acc[group].push(conn);
			return acc;
		},
		{} as Record<string, ConnectionInfo[]>,
	);

	return (
		<Sidebar collapsible="icon" variant="sidebar">
			<SidebarRail />

			<SidebarHeader className="pb-3 group-data-[collapsible=icon]:pb-1 group-data-[collapsible=icon]:px-0">
				<div className="flex items-center gap-2 px-3 py-1.5 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-1">
					<Database className="h-5 w-5 text-primary shrink-0" />
					<span className="font-semibold text-sm group-data-[collapsible=icon]:hidden">
						ETCD Compass
					</span>
					<Button
						variant="ghost"
						size="icon"
						className="ml-auto h-7 w-7 shrink-0 group-data-[collapsible=icon]:ml-0"
						onClick={toggleSidebar}
						aria-label={
							state === "expanded" ? "Collapse sidebar" : "Expand sidebar"
						}
					>
						{state === "expanded" ? (
							<PanelLeftClose className="h-4 w-4" />
						) : (
							<PanelLeftOpen className="h-4 w-4" />
						)}
					</Button>
				</div>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup className="group-data-[collapsible=icon]:px-0">
					<div className="px-3 py-2 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
						<Button
							variant="default"
							size="sm"
							className="w-full justify-start gap-2 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center"
							onClick={onAddCluster}
						>
							<Plus className="h-4 w-4 shrink-0" />
							<span className="group-data-[collapsible=icon]:hidden">
								Add Cluster
							</span>
						</Button>
					</div>
				</SidebarGroup>

				<Separator className="my-1 group-data-[collapsible=icon]:hidden" />

				<SidebarGroup className="flex-1 min-h-0 overflow-hidden">
					<SidebarGroupLabel className="px-3">
						<div className="flex items-center justify-between w-full">
							<span>Clusters</span>
							<div className="flex items-center gap-1">
								<Badge variant="outline" className="text-xs font-medium">
									{connections.length}
								</Badge>
							</div>
						</div>
					</SidebarGroupLabel>

					<div className="px-3 py-2 space-y-2 group-data-[collapsible=icon]:hidden">
						<div className="relative">
							<Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
							<Input
								placeholder="Filter..."
								value={filter}
								onChange={(e) => setFilter(e.target.value)}
								className="h-7 pl-7 text-xs"
							/>
						</div>
					</div>

					<SidebarGroupContent className="flex-1 min-h-0">
						<ScrollArea className="h-full">
							<SidebarMenu>
								{filteredConnections.length === 0 ? (
									<div className="px-3 py-4 text-xs text-muted-foreground text-center group-data-[collapsible=icon]:hidden">
										No clusters found
									</div>
								) : (
									Object.entries(groupedConnections).map(([group, conns]) => (
										<div key={group}>
											{group !== "Ungrouped" && (
												<div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1 group-data-[collapsible=icon]:hidden">
													<Folder className="h-3 w-3" />
													{group}
												</div>
											)}
											{conns.map((conn) => (
												<SidebarMenuItem key={conn.id}>
													<ContextMenu>
														<ContextMenuTrigger asChild>
															<div className="w-full">
																<SidebarMenuButton
																	asChild
																	isActive={conn.id === connectionId}
																	className="w-full justify-between"
																>
																	<button
																		type="button"
																		onClick={() =>
																			toggleClusterExpanded(conn.id)
																		}
																		className="flex items-center gap-2"
																	>
																		<span className="flex items-center gap-2">
																			{expandedClusters.has(conn.id) ? (
																				<ChevronDown className="h-3 w-3" />
																			) : (
																				<ChevronRight className="h-3 w-3" />
																			)}
																			{conn.color ? (
																				<span
																					className="h-2 w-2 rounded-full"
																					style={{
																						backgroundColor: conn.color,
																					}}
																				/>
																			) : (
																				<span
																					className={`h-2 w-2 rounded-full ${conn.id === connectionId ? "bg-emerald-500" : "bg-muted-foreground"}`}
																				/>
																			)}
																			<span className="truncate">
																				{conn.name || conn.endpoint}
																			</span>
																			{conn.isFavorite && (
																				<Star className="h-3 w-3 fill-amber-400 text-amber-400" />
																			)}
																		</span>
																	</button>
																</SidebarMenuButton>
															</div>
														</ContextMenuTrigger>
														<ContextMenuContent className="w-48">
															<ContextMenuItem
																onClick={() =>
																	handleToggleFavorite(
																		conn.endpoint,
																		!!conn.isFavorite,
																	)
																}
																className="gap-2"
															>
																{conn.isFavorite ? (
																	<>
																		<StarOff className="h-4 w-4" />
																		Remove from favorites
																	</>
																) : (
																	<>
																		<Star className="h-4 w-4" />
																		Add to favorites
																	</>
																)}
															</ContextMenuItem>
															<ContextMenuSeparator />
															<ContextMenuItem
																onClick={() => handleDuplicate(conn)}
																className="gap-2"
															>
																<Copy className="h-4 w-4" />
																Duplicate connection
															</ContextMenuItem>
															<ContextMenuItem
																onClick={() =>
																	handleEditConnection(conn.endpoint)
																}
																className="gap-2"
															>
																<Edit className="h-4 w-4" />
																Edit connection
															</ContextMenuItem>
															<ContextMenuItem
																onClick={handleRefresh}
																className="gap-2"
															>
																<RefreshCw className="h-4 w-4" />
																Refresh
															</ContextMenuItem>
															<ContextMenuItem
																onClick={() =>
																	handleCopyEndpoint(conn.endpoint)
																}
																className="gap-2"
															>
																<Copy className="h-4 w-4" />
																Copy endpoint
															</ContextMenuItem>
															{conn.id === connectionId && (
																<>
																	<ContextMenuSeparator />
																	<ContextMenuItem
																		onClick={() => handleDisconnect(conn.id)}
																		className="gap-2"
																	>
																		<Unplug className="h-4 w-4" />
																		Disconnect
																	</ContextMenuItem>
																</>
															)}
															<ContextMenuSeparator />
															<ContextMenuItem
																onClick={() =>
																	handleRemove(conn.id, conn.endpoint)
																}
																className="gap-2 text-destructive"
															>
																<Trash2 className="h-4 w-4" />
																Remove
															</ContextMenuItem>
														</ContextMenuContent>
													</ContextMenu>
												</SidebarMenuItem>
											))}
										</div>
									))
								)}
							</SidebarMenu>
						</ScrollArea>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="border-t group-data-[collapsible=icon]:px-0">
				<div className="flex items-center justify-between px-3 py-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-1">
					<ThemeToggle />
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
								<MoreVertical className="h-4 w-4" />
								<span className="sr-only">More options</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" side="right" className="w-48">
							<DropdownMenuItem
								onClick={handleExportProfiles}
								className="gap-2"
							>
								<Download className="h-4 w-4" />
								Export connections
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={handleImportProfiles}
								className="gap-2"
							>
								<Upload className="h-4 w-4" />
								Import connections
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={handleRefresh} className="gap-2">
								<RefreshCw className="h-4 w-4" />
								Refresh list
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</SidebarFooter>
		</Sidebar>
	);
}
