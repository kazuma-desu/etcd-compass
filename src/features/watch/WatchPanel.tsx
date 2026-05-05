import type { UnlistenFn } from "@tauri-apps/api/event";
import { Activity, Clock, Eye, EyeOff, FileText, Key } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { WatchEvent } from "@/commands/types";
import { onWatchEvent, unwatchKey, watchKey } from "@/commands/watch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

interface WatchPanelProps {
	connectionId: string | null;
}

interface WatchState {
	watchId: string | null;
	key: string;
	isPrefix: boolean;
	isWatching: boolean;
}

interface WatchHistoryItem extends WatchEvent {
	id: string;
}

export function WatchPanel({ connectionId }: WatchPanelProps) {
	const [watchState, setWatchState] = useState<WatchState>({
		watchId: null,
		key: "",
		isPrefix: false,
		isWatching: false,
	});
	const [history, setHistory] = useState<WatchHistoryItem[]>([]);
	const [unlisten, setUnlisten] = useState<UnlistenFn | null>(null);
	const [isWatchPending, setIsWatchPending] = useState(false);

	const startWatching = useCallback(async () => {
		if (!connectionId || !watchState.key.trim() || isWatchPending) return;

		setIsWatchPending(true);
		try {
			const response = await watchKey(
				connectionId,
				watchState.key.trim(),
				watchState.isPrefix,
			);

			setWatchState((prev) => ({
				...prev,
				watchId: response.watch_id,
				isWatching: true,
			}));
		} catch (error) {
			console.error("Failed to start watch:", error);
			toast.error("Failed to start watch");
		} finally {
			setIsWatchPending(false);
		}
	}, [connectionId, isWatchPending, watchState.key, watchState.isPrefix]);

	const stopWatching = useCallback(async () => {
		if (!watchState.watchId || isWatchPending) return;

		setIsWatchPending(true);
		try {
			await unwatchKey(watchState.watchId);
			setWatchState((prev) => ({
				...prev,
				watchId: null,
				isWatching: false,
			}));
		} catch (error) {
			console.error("Failed to stop watch:", error);
			toast.error("Failed to stop watch");
		} finally {
			setIsWatchPending(false);
		}
	}, [isWatchPending, watchState.watchId]);

	useEffect(() => {
		if (!connectionId) {
			if (watchState.isWatching) {
				stopWatching();
			}
			return;
		}

		let unlistenFn: UnlistenFn | null = null;

		const setupListener = async () => {
			unlistenFn = await onWatchEvent((event) => {
				const newEvent: WatchHistoryItem = {
					...event,
					id: `${event.watch_id}-${Date.now()}-${Math.random()}`,
				};
				setHistory((prev) => [newEvent, ...prev].slice(0, 100));
			});
			setUnlisten(() => unlistenFn);
		};

		setupListener().catch(() => {
			toast.error("Failed to set up watch listener");
		});

		return () => {
			if (unlistenFn) {
				unlistenFn();
			}
		};
	}, [connectionId, watchState.isWatching, stopWatching]);

	useEffect(() => {
		return () => {
			if (watchState.isWatching && watchState.watchId) {
				unwatchKey(watchState.watchId).catch(() => {
					toast.error("Failed to clean up watch on unmount");
				});
			}
			if (unlisten) {
				unlisten();
			}
		};
	}, [unlisten, watchState.isWatching, watchState.watchId]);

	const formatTimestamp = (timestamp: string) => {
		try {
			const date = new Date(timestamp);
			return date.toLocaleTimeString();
		} catch {
			return timestamp;
		}
	};

	const truncateValue = (value: string | null, maxLength: number = 50) => {
		if (!value) return "—";
		if (value.length <= maxLength) return value;
		return `${value.substring(0, maxLength)}...`;
	};

	if (!connectionId) {
		return (
			<div className="h-full flex items-center justify-center p-4 text-muted-foreground">
				<div className="text-center text-sm">
					<Activity className="w-10 h-10 mx-auto mb-3 opacity-50" />
					<p>Connect to use watch.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col overflow-hidden">
			<div className="px-4 py-3 border-b border-border/70">
				<div className="flex items-center justify-between gap-2">
					<div className="min-w-0">
						<h2 className="text-sm font-semibold flex items-center gap-2 truncate">
							<Eye className="w-4 h-4 text-primary" />
							Watch Keys
							{watchState.isWatching && (
								<span className="relative flex h-2.5 w-2.5 ml-1">
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60"></span>
									<span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
								</span>
							)}
						</h2>
						<p className="mt-0.5 text-[11px] text-muted-foreground truncate">
							Stream changes for a key or prefix
						</p>
					</div>
					<Badge variant={watchState.isWatching ? "default" : "secondary"}>
						{watchState.isWatching ? "Active" : "Inactive"}
					</Badge>
				</div>
			</div>

			<div className="flex-1 flex flex-col min-h-0 p-4 gap-4">
				<div className="space-y-3">
					<div className="space-y-1.5">
						<Label
							htmlFor="watch-key"
							className="text-[11px] uppercase tracking-wide text-muted-foreground"
						>
							Key or Prefix
						</Label>
						<Input
							id="watch-key"
							placeholder="Enter key to watch (e.g., /config/app)"
							value={watchState.key}
							onChange={(e) =>
								setWatchState((prev) => ({ ...prev, key: e.target.value }))
							}
							disabled={watchState.isWatching}
							className="h-9 font-mono text-xs"
						/>
					</div>

					<div className="grid gap-2">
						<div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/35 px-3 py-2">
							<Label htmlFor="prefix-mode" className="text-xs cursor-pointer">
								Watch prefix
							</Label>
							<Switch
								id="prefix-mode"
								checked={watchState.isPrefix}
								onCheckedChange={(checked) =>
									setWatchState((prev) => ({ ...prev, isPrefix: checked }))
								}
								disabled={watchState.isWatching}
							/>
						</div>

						{watchState.isWatching ? (
							<Button
								variant="destructive"
								size="sm"
								onClick={stopWatching}
								disabled={isWatchPending}
								className="w-full"
							>
								<EyeOff className="w-4 h-4" />
								Stop Watching
							</Button>
						) : (
							<Button
								variant="default"
								size="sm"
								onClick={startWatching}
								disabled={!watchState.key.trim() || isWatchPending}
								className="w-full"
							>
								<Eye className="w-4 h-4" />
								Start Watching
							</Button>
						)}
					</div>
				</div>

				<div className="flex-1 flex flex-col min-h-0">
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
							Event History
						</h3>
						{history.length > 0 && (
							<Button variant="ghost" size="sm" onClick={() => setHistory([])}>
								Clear
							</Button>
						)}
					</div>

					<ScrollArea className="flex-1 border border-border/60 rounded-md bg-background/45">
						{history.length === 0 ? (
							<div className="h-full min-h-32 flex items-center justify-center text-muted-foreground text-sm">
								<p>No events yet</p>
							</div>
						) : (
							<div className="space-y-2 p-2">
								{history.map((event) => (
									<div
										key={event.id}
										className="p-3 bg-muted/50 rounded-md space-y-2"
									>
										<div className="flex items-center justify-between">
											<Badge
												variant={
													event.event_type === "PUT" ? "default" : "destructive"
												}
												className="text-xs"
											>
												{event.event_type}
											</Badge>
											<div className="flex items-center gap-1 text-xs text-muted-foreground">
												<Clock className="w-3 h-3" />
												{formatTimestamp(event.timestamp)}
											</div>
										</div>

										<div className="space-y-1">
											<div className="flex items-center gap-2 text-sm">
												<Key className="w-3 h-3 text-muted-foreground" />
												<code className="text-xs bg-background px-1 py-0.5 rounded break-all">
													{event.key}
												</code>
											</div>

											{event.event_type === "PUT" && event.value && (
												<div className="flex items-start gap-2 text-sm">
													<FileText className="w-3 h-3 text-muted-foreground mt-0.5" />
													<div className="flex-1 min-w-0">
														<div className="text-xs text-muted-foreground">
															New value:
														</div>
														<code className="text-xs bg-background px-1 py-0.5 rounded block truncate">
															{truncateValue(event.value)}
														</code>
													</div>
												</div>
											)}

											{event.prev_value && (
												<div className="flex items-start gap-2 text-sm">
													<FileText className="w-3 h-3 text-muted-foreground mt-0.5" />
													<div className="flex-1 min-w-0">
														<div className="text-xs text-muted-foreground">
															Previous value:
														</div>
														<code className="text-xs bg-background px-1 py-0.5 rounded block truncate">
															{truncateValue(event.prev_value)}
														</code>
													</div>
												</div>
											)}

											<div className="text-xs text-muted-foreground">
												Revision: {event.revision}
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</ScrollArea>
				</div>
			</div>
		</div>
	);
}
