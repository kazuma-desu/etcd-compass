import type { UnlistenFn } from "@tauri-apps/api/event";
import { Activity, Clock, Eye, EyeOff, FileText, Key } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { WatchEvent } from "@/commands/types";
import { onWatchEvent, unwatchKey, watchKey } from "@/commands/watch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

	const startWatching = useCallback(async () => {
		if (!connectionId || !watchState.key.trim()) return;

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
		}
	}, [connectionId, watchState.key, watchState.isPrefix]);

	const stopWatching = useCallback(async () => {
		if (!watchState.watchId) return;

		try {
			await unwatchKey(watchState.watchId);
			setWatchState((prev) => ({
				...prev,
				watchId: null,
				isWatching: false,
			}));
		} catch (error) {
			console.error("Failed to stop watch:", error);
		}
	}, [watchState.watchId]);

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

		setupListener();

		return () => {
			if (unlistenFn) {
				unlistenFn();
			}
		};
	}, [connectionId, watchState.isWatching, stopWatching]);

	useEffect(() => {
		return () => {
			if (watchState.isWatching && watchState.watchId) {
				unwatchKey(watchState.watchId).catch(console.error);
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
			<Card className="h-full">
				<CardContent className="h-full flex items-center justify-center text-muted-foreground">
					<div className="text-center">
						<Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
						<p>Connect to an ETCD cluster to use watch functionality</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="h-full flex flex-col">
			<CardHeader className="pb-4">
				<div className="flex items-center justify-between">
					<CardTitle className="text-lg font-semibold flex items-center gap-2">
						<Eye className="w-5 h-5 text-primary" />
						Watch Keys
						{watchState.isWatching && (
							<span className="relative flex h-3 w-3 ml-2">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
								<span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
							</span>
						)}
					</CardTitle>
					<Badge variant={watchState.isWatching ? "default" : "secondary"}>
						{watchState.isWatching ? "Active" : "Inactive"}
					</Badge>
				</div>
			</CardHeader>

			<CardContent className="flex-1 flex flex-col space-y-4">
				<div className="space-y-4">
					<div className="space-y-2">
						<Label
							htmlFor="watch-key"
							className="text-xs uppercase text-muted-foreground"
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
							className="font-mono text-sm"
						/>
					</div>

					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-2">
							<Switch
								id="prefix-mode"
								checked={watchState.isPrefix}
								onCheckedChange={(checked) =>
									setWatchState((prev) => ({ ...prev, isPrefix: checked }))
								}
								disabled={watchState.isWatching}
							/>
							<Label htmlFor="prefix-mode" className="text-sm cursor-pointer">
								Watch as prefix
							</Label>
						</div>

						{watchState.isWatching ? (
							<Button variant="destructive" size="sm" onClick={stopWatching}>
								<EyeOff className="w-4 h-4 mr-2" />
								Stop Watching
							</Button>
						) : (
							<Button
								variant="default"
								size="sm"
								onClick={startWatching}
								disabled={!watchState.key.trim()}
							>
								<Eye className="w-4 h-4 mr-2" />
								Start Watching
							</Button>
						)}
					</div>
				</div>

				<div className="flex-1 flex flex-col min-h-0">
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-sm font-medium text-muted-foreground uppercase">
							Event History
						</h3>
						{history.length > 0 && (
							<Button variant="ghost" size="sm" onClick={() => setHistory([])}>
								Clear
							</Button>
						)}
					</div>

					<ScrollArea className="flex-1 border rounded-md">
						{history.length === 0 ? (
							<div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
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
			</CardContent>
		</Card>
	);
}
