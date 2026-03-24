import { Database, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { disconnectEtcd, listConnections } from "@/commands/connection";
import { Button } from "@/components/ui/button";
import { useConnectionStore } from "@/features/connections/connection-store";
import { useTabShortcuts } from "@/shared/hooks/use-keyboard-shortcuts";
import { ConnectionStatus } from "./ConnectionStatus";

interface ConnectionTab {
	id: string;
	endpoint: string;
}

export function TabBar() {
	const {
		connectionId,
		setActiveConnectionId,
		disconnect,
		isConnecting,
		connectionError,
		config,
		connect,
	} = useConnectionStore();
	const [tabs, setTabs] = useState<ConnectionTab[]>([]);

	const loadTabs = useCallback(async () => {
		try {
			const result = await listConnections();
			setTabs(result.map(([id, endpoint]) => ({ id, endpoint })));
		} catch (e) {
			console.error("Failed to list connections:", e);
		}
	}, []);

	useEffect(() => {
		loadTabs();
	}, [loadTabs]);

	const handleCloseTab = useCallback(
		async (id: string, e?: React.MouseEvent) => {
			e?.stopPropagation();
			try {
				await disconnectEtcd(id);
				if (id === connectionId) {
					await disconnect();
				}
				await loadTabs();
			} catch (e) {
				console.error("Failed to close tab:", e);
			}
		},
		[connectionId, disconnect, loadTabs],
	);

	const handleSelectTab = useCallback(
		(id: string) => {
			setActiveConnectionId(id);
		},
		[setActiveConnectionId],
	);

	useTabShortcuts(tabs, connectionId, handleSelectTab, handleCloseTab);

	if (tabs.length === 0) return null;

	return (
		<div className="border-b bg-background/60 backdrop-blur-xl z-10 sticky top-0 transition-all duration-300">
			<div className="flex items-center justify-between px-2">
				<div className="flex items-center">
					{tabs.map((tab) => (
						<div
							key={tab.id}
							onClick={() => handleSelectTab(tab.id)}
							className={`
								group flex items-center gap-2 px-3 py-2 text-sm cursor-pointer
								border-r border-border/50 min-w-[120px] max-w-[200px]
								transition-colors relative
								${
									tab.id === connectionId
										? "bg-background text-foreground border-t-2 border-t-primary"
										: "text-muted-foreground hover:text-foreground hover:bg-muted"
								}
							`}
						>
							<Database className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
							<span className="truncate flex-1">{tab.endpoint}</span>
							<Button
								variant="ghost"
								size="icon"
								className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
								onClick={(e) => handleCloseTab(tab.id, e)}
							>
								<X className="h-3 w-3" />
							</Button>
						</div>
					))}
				</div>
				<ConnectionStatus
					connectionId={connectionId}
					isConnecting={isConnecting}
					connectionError={connectionError || null}
					endpoint={config.endpoint}
					onRetry={connect}
				/>
			</div>
		</div>
	);
}
