import { open } from "@tauri-apps/plugin-shell";
import {
	BarChart3,
	Clock,
	ExternalLink,
	Eye,
	KeyRound,
	Plus,
	Server,
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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

	const handleLearnMoreClick = () => {
		open("https://etcd.io/docs/v3.5/quickstart/");
	};

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
			<SidebarInset className="flex flex-col flex-1 h-full min-w-0 overflow-hidden bg-muted/30 p-2">
				<div className="flex flex-col flex-1 min-h-0 min-w-0 bg-background rounded-lg shadow-sm border overflow-hidden">
					<TabBar />
					<div className="flex flex-col flex-1 min-h-0 min-w-0 px-4 py-2">
						<Tabs
							defaultValue="keys"
							className="flex-1 min-h-0 min-w-0 flex flex-col"
						>
							<div className="flex flex-col px-4 pt-2">
								<BreadcrumbNav />
								<div className="flex items-center gap-4 border-b mt-3">
									<TabsList className="h-9 w-auto bg-transparent justify-start space-x-2 p-0 rounded-none mb-[-1px]">
										<TabsTrigger
											value="keys"
											className="h-9 px-4 flex items-center gap-2 whitespace-nowrap rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:text-primary font-semibold text-xs transition-none"
										>
											<KeyRound className="w-3.5 h-3.5" />
											Keys
										</TabsTrigger>
										<TabsTrigger
											value="cluster"
											className="h-9 px-4 flex items-center gap-2 whitespace-nowrap rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:text-primary font-semibold text-xs transition-none"
										>
											<Server className="w-3.5 h-3.5" />
											Cluster
										</TabsTrigger>
										<TabsTrigger
											value="metrics"
											className="h-9 px-4 flex items-center gap-2 whitespace-nowrap rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:text-primary font-semibold text-xs transition-none"
										>
											<BarChart3 className="w-3.5 h-3.5" />
											Metrics
										</TabsTrigger>
									</TabsList>
								</div>
							</div>
							<TabsContent
								value="keys"
								className="flex-1 min-h-0 min-w-0 mt-0 flex flex-col px-4"
							>
								<QueryBar
									connectionId={connectionId ?? undefined}
									searchInputRef={searchInputRef}
								/>
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
											<Tabs
												defaultValue="watch"
												className="h-full flex flex-col"
											>
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
									<div className="flex-1 flex items-center justify-center h-full bg-background">
										<div className="text-center space-y-6 max-w-md mx-auto animate-in fade-in zoom-in duration-500">
											<div className="relative w-48 h-48 mx-auto flex items-center justify-center">
												{/* Illustration placeholder mimicking the Compass telescope */}
												<div className="absolute inset-0 bg-primary/5 rounded-full" />
												<Server className="w-16 h-16 text-primary z-10" />
												<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-4 border-primary/20 rounded-full z-0" />
											</div>
											<div className="space-y-3">
												<h3 className="text-xl font-bold tracking-tight text-foreground">
													Welcome to ETCD Compass
												</h3>
												<p className="text-sm text-muted-foreground pb-2">
													To get started, connect to an existing server or
													cluster.
												</p>
												<Button
													onClick={() => setShowConnectionDialog(true)}
													className="gap-2 px-4 h-9 w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md"
												>
													<Plus className="w-4 h-4" />
													Add new connection
												</Button>

												<div className="mt-8 p-4 bg-primary/5 rounded-lg border border-primary/10 text-left space-y-2 relative overflow-hidden">
													<div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
													<h4 className="font-semibold text-sm text-foreground">
														New to Compass and don't have a cluster?
													</h4>
													<p className="text-xs text-muted-foreground">
														If you don't already have a cluster, you can run a
														local ETCD instance using Docker.
													</p>
													<Button
														variant="outline"
														className="h-7 px-3 text-xs font-medium border-primary/20 text-primary hover:bg-primary/10 mt-2"
														onClick={handleLearnMoreClick}
													>
														LEARN MORE
														<ExternalLink className="w-3 h-3 ml-2" />
													</Button>
												</div>
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
										<div className="text-center space-y-5 animate-in fade-in zoom-in duration-500 delay-75">
											<div className="w-20 h-20 bg-background shadow-lg shadow-black/5 dark:shadow-white/5 border border-border/50 rounded-2xl flex items-center justify-center mx-auto transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
												<Server className="w-10 h-10 text-primary/80" />
											</div>
											<div className="space-y-1">
												<h3 className="text-xl font-semibold tracking-tight">
													No cluster connected
												</h3>
												<p className="text-sm text-muted-foreground">
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
										<div className="text-center space-y-5 animate-in fade-in zoom-in duration-500 delay-150">
											<div className="w-20 h-20 bg-background shadow-lg shadow-black/5 dark:shadow-white/5 border border-border/50 rounded-2xl flex items-center justify-center mx-auto transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
												<BarChart3 className="w-10 h-10 text-primary/80" />
											</div>
											<div className="space-y-1">
												<h3 className="text-xl font-semibold tracking-tight">
													No cluster connected
												</h3>
												<p className="text-sm text-muted-foreground">
													Connect to a cluster to view metrics
												</p>
											</div>
										</div>
									</div>
								)}
							</TabsContent>
						</Tabs>
					</div>
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
