import { useEffect, useState } from "react";
import "./App.css";
import { AppShell } from "@/app/AppShell";
import { useConnectionStore } from "@/features/connections/connection-store";

function App() {
	const [connectionId, setConnectionId] = useState<string | null>(null);
	const {
		connectionId: storeConnectionId,
		loadSavedConnection,
		loadConnectionHistory,
	} = useConnectionStore();

	useEffect(() => {
		loadSavedConnection();
		loadConnectionHistory();
	}, [loadConnectionHistory, loadSavedConnection]);

	useEffect(() => {
		if (storeConnectionId) {
			setConnectionId(storeConnectionId);
		}
	}, [storeConnectionId]);

	const handleConnect = (newConnectionId: string) => {
		setConnectionId(newConnectionId);
	};

	return <AppShell connectionId={connectionId} onConnect={handleConnect} />;
}

export default App;
