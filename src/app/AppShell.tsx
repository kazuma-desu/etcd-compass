import { open } from "@tauri-apps/plugin-shell";
import {
	BarChart3,
	Check,
	Clock,
	Compass,
	ExternalLink,
	Eye,
	KeyRound,
	Loader2,
	Plus,
	Server,
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
import {
	type ConnectionPhase,
	useConnectionStore,
} from "@/features/connections/connection-store";
import { KeyBrowser } from "@/features/keys/KeyBrowser";
import { KeyDetail } from "@/features/keys/KeyDetail";
import { useKeysStore } from "@/features/keys/keys-store";
import { QueryBar } from "@/features/keys/QueryBar";
import { LeasePanel } from "@/features/leases/LeasePanel";
import { WatchPanel } from "@/features/watch/WatchPanel";
import { cn } from "@/lib/utils";
import { BreadcrumbNav } from "@/shared/components/BreadcrumbNav";
import { ShortcutHelp } from "@/shared/components/ShortcutHelp";
import { TabBar } from "@/shared/components/TabBar";
import { useKeyboardShortcuts } from "@/shared/hooks/use-keyboard-shortcuts";

interface AppShellProps {
	connectionId: string | null;
	onConnect: (connectionId: string) => void;
}

const phaseOrder: ConnectionPhase[] = [
	"connecting",
	"authenticating",
	"fetching-keys",
	"connected",
];

const phaseLabels: Record<ConnectionPhase, string> = {
	disconnected: "Disconnected",
	connecting: "Establishing connection",
	authenticating: "Authenticating",
	"fetching-keys": "Fetching keys",
	connected: "Connected",
};

function ConnectionPhaseProgress({
	phase,
	isConnecting,
}: {
	phase: ConnectionPhase;
	isConnecting: boolean;
}) {
	if (!isConnecting || phase === "disconnected" || phase === "connected") {
		return null;
	}

	const currentIndex = phaseOrder.indexOf(phase);
	const progress = ((currentIndex + 1) / phaseOrder.length) * 100;

	return (
		<div className="w-full max-w-md mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
			<div className="space-y-2">
				<div className="flex items-center justify-between text-sm">
					<span className="font-medium text-foreground">
						{phaseLabels[phase]}
					</span>
					<span className="text-muted-foreground text-xs">
						Step {currentIndex + 1} of {phaseOrder.length}
					</span>
				</div>
				<Progress value={progress} className="h-2" />
			</div>

			<div className="flex items-center justify-between gap-2">
				{phaseOrder.map((p, index) => {
					const isActive = p === phase;
					const isCompleted = index < currentIndex;
					const isPending = index > currentIndex;

					return (
						<div
							key={p}
							className={cn(
								"flex flex-col items-center gap-1 flex-1 transition-all duration-300",
								isPending && "opacity-40",
							)}
						>
							<div
								className={cn(
									"w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300",
									isCompleted && "bg-primary text-primary-foreground",
									isActive &&
										"bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2",
									isPending &&
										"bg-muted text-muted-foreground border border-border",
								)}
							>
								{isCompleted ? (
									<Check className="w-4 h-4" />
								) : isActive ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									<span>{index + 1}</span>
								)}
							</div>
							<span
								className={cn(
									"text-[10px] font-medium transition-colors duration-300",
									isActive ? "text-primary" : "text-muted-foreground",
								)}
							>
								{phaseLabels[p]}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function AppShellContent({ connectionId, onConnect }: AppShellProps) {
	const { setSelectedKey, setSearchQuery } = useKeysStore();
	const { isConnecting, phase } = useConnectionStore();
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
										<div className="text-center space-y-8 max-w-md mx-auto">
											{isConnecting ? (
												<div className="space-y-8 animate-in fade-in zoom-in duration-500">
													<div className="relative w-40 h-40 mx-auto flex items-center justify-center">
														<div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
														<div className="absolute inset-4 bg-primary/20 rounded-full animate-pulse delay-150" />
														<Compass className="w-16 h-16 text-primary z-10" />
													</div>
													<div className="space-y-2">
														<h3 className="text-xl font-semibold text-foreground">
															Connecting to ETCD
														</h3>
														<p className="text-sm text-muted-foreground">
															Please wait while we establish the connection
														</p>
													</div>
													<ConnectionPhaseProgress
														phase={phase}
														isConnecting={isConnecting}
													/>
												</div>
											) : (
												<>
													<div className="relative w-40 h-40 mx-auto flex items-center justify-center animate-in fade-in zoom-in duration-500">
														<div className="absolute inset-0 bg-primary/5 rounded-full animate-pulse" />
														<div className="absolute inset-4 bg-primary/10 rounded-full" />
														<Compass className="w-16 h-16 text-primary z-10" />
														<div className="absolute top-0 right-4 w-8 h-8 bg-background rounded-full flex items-center justify-center shadow-sm border">
															<Server className="w-4 h-4 text-muted-foreground" />
														</div>
													</div>

													<div className="space-y-4">
														<div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75 fill-mode-both">
															<h3 className="text-2xl font-bold tracking-tight text-foreground">
																Welcome to ETCD Compass
															</h3>
															<p className="text-base text-muted-foreground">
																To get started, connect to an existing server or
																cluster.
															</p>
														</div>

														<div className="pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
															<Button
																onClick={() => setShowConnectionDialog(true)}
																size="lg"
																className="gap-2 w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md shadow-lg shadow-primary/20 transition-all hover:scale-105"
															>
																<Plus className="w-5 h-5" />
																Add new connection
															</Button>
														</div>

														<div className="mt-8 p-5 bg-muted/50 rounded-xl border border-border/50 text-left space-y-3 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both group hover:border-primary/20 transition-colors">
															<div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none transition-all group-hover:bg-primary/10" />
															<h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
																<Server className="w-4 h-4 text-primary" />
																New to Compass?
															</h4>
															<p className="text-sm text-muted-foreground">
																If you don't already have a cluster, you can run
																a local ETCD instance using Docker.
															</p>
															<Button
																variant="link"
																className="h-auto p-0 text-sm font-medium text-primary hover:text-primary/80 mt-1"
																onClick={handleLearnMoreClick}
															>
																Learn how to set up a local cluster
																<ExternalLink className="w-3 h-3 ml-1" />
															</Button>
														</div>
													</div>
												</>
											)}
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
