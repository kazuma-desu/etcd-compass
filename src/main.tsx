import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import App from "./app/App.tsx";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
	<StrictMode>
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
			<App />
			<Toaster position="top-right" richColors />
		</ThemeProvider>
	</StrictMode>,
);
