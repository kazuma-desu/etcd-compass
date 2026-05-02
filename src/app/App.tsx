import { useEffect } from "react";
import "./App.css";
import { AppShell } from "@/app/AppShell";
import { useConnectionStore } from "@/features/connections/connection-store";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";

function App() {
	const { loadSavedConnection, loadConnectionHistory } = useConnectionStore();

	useEffect(() => {
		loadSavedConnection();
		loadConnectionHistory();
	}, [loadConnectionHistory, loadSavedConnection]);

	return (
		<ErrorBoundary>
			<AppShell />
		</ErrorBoundary>
	);
}

export default App;
