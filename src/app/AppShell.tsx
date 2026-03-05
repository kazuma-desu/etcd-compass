import { BarChart3, Clock, Eye, KeyRound, Server } from "lucide-react";
import { useRef, useState } from "react";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
	SidebarInset,
	SidebarProvider,
	useSidebar,
} from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClusterSidebar } from "@/features/cluster/ClusterSidebar";
import { ClusterStatus } from "@/features/cluster/ClusterStatus";
import { MetricsDashboard } from "@/features/cluster/MetricsDashboard";
import { ConnectionForm } from "@/features/connections/ConnectionForm";
import { KeyBrowser } from "@/features/keys/KeyBrowser";
import { KeyDetail } from "@/features/keys/KeyDetail";
import { useKeysStore } from "@/features/keys/keys-store";
import { QueryBar } from "@/features/keys/QueryBar";
import { LeasePanel } from "@/features/leases/LeasePanel";
import { WatchPanel } from "@/features/watch/WatchPanel";
import { BreadcrumbNav } from "@/shared/components/BreadcrumbNav";
import { ShortcutHelp } from "@/shared/components/ShortcutHelp";
import { TabBar } from "@/shared/components/TabBar";
import { useKeyboardShortcuts } from "@/shared/hooks/use-keyboard-shortcuts";

interface AppShellProps {
	connectionId: string | null;
	onConnect: (connectionId: string) => void;
}

function AppShellContent({ connectionId, onConnect }: AppShellProps) {
	const { setSelectedKey, setSearchQuery } = useKeysStore();
	const { toggleSidebar } = useSidebar();
	const [showConnectionDialog, setShowConnectionDialog] = useState(false);
	const [showHelpDialog, setShowHelpDialog] = useState(false);
	const searchInputRef = useRef<HTMLInputElement>(null);

	useKeyboardShortcuts(
		connectionId,
		() => setShowHelpDialog(true),
		toggleSidebar,
		searchInputRef,
	);

	const handleConnect = (newConnectionId: string) => {
		setSelectedKey(null);
		setSearchQuery("");
		onConnect(newConnectionId);
		setShowConnectionDialog(false);
	};

	return (
		<>
			<ClusterSidebar onAddCluster={() => setShowConnectionDialog(true)} />
			<SidebarInset className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
				<TabBar />
				<div className="flex flex-col flex-1 min-h-0 min-w-0 px-4 py-2">
					<BreadcrumbNav />
					<Tabs
						defaultValue="keys"
						className="flex-1 min-h-0 min-w-0 flex flex-col"
					>
						<div className="flex flex-col sm:flex-row items-start sm:items-end justify-between border-b pb-2 mb-2 gap-2">
							<QueryBar searchInputRef={searchInputRef} />
							<TabsList className="w-full sm:w-auto overflow-x-auto justify-start sm:ml-2 sm:shrink-0 h-10">
								<TabsTrigger
									value="keys"
									className="flex items-center gap-2 whitespace-nowrap"
								>
									<KeyRound className="w-4 h-4" />
									Keys
								</TabsTrigger>
								<TabsTrigger
									value="cluster"
									className="flex items-center gap-2 whitespace-nowrap"
								>
									<Server className="w-4 h-4" />
									Cluster
								</TabsTrigger>
								<TabsTrigger
									value="metrics"
									className="flex items-center gap-2 whitespace-nowrap"
								>
									<BarChart3 className="w-4 h-4" />
									Metrics
								</TabsTrigger>
							</TabsList>
						</div>
						<TabsContent value="keys" className="flex-1 min-h-0 min-w-0 mt-0">
							{connectionId ? (
								<ResizablePanelGroup
									orientation="horizontal"
									className="h-full rounded-lg border"
								>
									<ResizablePanel defaultSize={45} minSize={25}>
										<KeyBrowser connectionId={connectionId} />
									</ResizablePanel>
									<ResizableHandle withHandle />
									<ResizablePanel defaultSize={30} minSize={20}>
										<KeyDetail />
									</ResizablePanel>
									<ResizableHandle withHandle />
									<ResizablePanel defaultSize={25} minSize={20}>
										<Tabs defaultValue="watch" className="h-full flex flex-col">
											<TabsList className="grid w-full grid-cols-2">
												<TabsTrigger
													value="watch"
													className="flex items-center gap-2"
												>
													<Eye className="w-4 h-4" />
													Watch
												</TabsTrigger>
												<TabsTrigger
													value="leases"
													className="flex items-center gap-2"
												>
													<Clock className="w-4 h-4" />
													Leases
												</TabsTrigger>
											</TabsList>
											<TabsContent
												value="watch"
												className="flex-1 min-h-0 mt-0"
											>
												<WatchPanel connectionId={connectionId} />
											</TabsContent>
											<TabsContent
												value="leases"
												className="flex-1 min-h-0 mt-0"
											>
												<LeasePanel connectionId={connectionId} />
											</TabsContent>
										</Tabs>
									</ResizablePanel>
								</ResizablePanelGroup>
							) : (
								<div className="flex-1 flex items-center justify-center h-full">
									<div className="text-center space-y-4">
										<div className="w-16 h-16 bg-muted/80 border border-border rounded-full flex items-center justify-center mx-auto">
											<Server className="w-8 h-8 text-muted-foreground" />
										</div>
										<div>
											<h3 className="text-lg font-medium">
												No cluster connected
											</h3>
											<p className="text-sm text-muted-foreground mt-1">
												Click "Add Cluster" in the sidebar to connect to an ETCD
												cluster
											</p>
										</div>
									</div>
								</div>
							)}
						</TabsContent>
						<TabsContent
							value="cluster"
							className="flex-1 min-h-0 mt-0 overflow-auto"
						>
							{connectionId ? (
								<ClusterStatus connectionId={connectionId} />
							) : (
								<div className="flex-1 flex items-center justify-center h-full">
									<div className="text-center space-y-4">
										<div className="w-16 h-16 bg-muted/80 border border-border rounded-full flex items-center justify-center mx-auto">
											<Server className="w-8 h-8 text-muted-foreground" />
										</div>
										<div>
											<h3 className="text-lg font-medium">
												No cluster connected
											</h3>
											<p className="text-sm text-muted-foreground mt-1">
												Connect to a cluster to view status
											</p>
										</div>
									</div>
								</div>
							)}
						</TabsContent>
						<TabsContent
							value="metrics"
							className="flex-1 min-h-0 mt-0 overflow-auto"
						>
							{connectionId ? (
								<MetricsDashboard connectionId={connectionId} />
							) : (
								<div className="flex-1 flex items-center justify-center h-full">
									<div className="text-center space-y-4">
										<div className="w-16 h-16 bg-muted/80 border border-border rounded-full flex items-center justify-center mx-auto">
											<BarChart3 className="w-8 h-8 text-muted-foreground" />
										</div>
										<div>
											<h3 className="text-lg font-medium">
												No cluster connected
											</h3>
											<p className="text-sm text-muted-foreground mt-1">
												Connect to a cluster to view metrics
											</p>
										</div>
									</div>
								</div>
							)}
						</TabsContent>
					</Tabs>
				</div>
			</SidebarInset>

			<ConnectionForm
				open={showConnectionDialog}
				onOpenChange={setShowConnectionDialog}
				onConnect={handleConnect}
			/>

			<ShortcutHelp open={showHelpDialog} onOpenChange={setShowHelpDialog} />
		</>
	);
}

export function AppShell({ connectionId, onConnect }: AppShellProps) {
	return (
		<SidebarProvider
			defaultOpen={true}
			className="h-screen overflow-hidden bg-background"
		>
			<AppShellContent connectionId={connectionId} onConnect={onConnect} />
		</SidebarProvider>
	);
}
