import { useEffect } from "react";
import "./App.css";
import { AppShell } from "@/app/AppShell";
import { useConnectionStore } from "@/features/connections/connection-store";

function App() {
	const { loadSavedConnection, loadConnectionHistory } = useConnectionStore();

	useEffect(() => {
		loadSavedConnection();
		loadConnectionHistory();
	}, [loadConnectionHistory, loadSavedConnection]);

	return <AppShell />;
}

export default App;
