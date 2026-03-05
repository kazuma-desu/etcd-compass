import { toast } from "sonner";
import { create } from "zustand";
import { getConnectionHistory, getSavedConnection } from "@/commands/config";
import { connectEtcd, disconnectEtcd } from "@/commands/connection";
import type { EtcdConfig } from "@/commands/types";

function formatError(error: unknown): string {
	const errorStr = error instanceof Error ? error.message : String(error);

	if (
		errorStr.includes("transport error") ||
		errorStr.includes("Connection refused")
	) {
		return "Cannot connect to ETCD cluster. Please check if ETCD is running and the endpoint is correct.";
	}

	if (
		errorStr.includes("dns error") ||
		errorStr.includes("Name resolution failed")
	) {
		return "Cannot resolve ETCD host. Please check the endpoint address.";
	}

	if (errorStr.includes("timeout")) {
		return "Connection timed out. The ETCD cluster may be unreachable or overloaded.";
	}

	if (
		errorStr.toLowerCase().includes("tls") ||
		errorStr.toLowerCase().includes("certificate") ||
		errorStr.toLowerCase().includes("handshake")
	) {
		return "TLS/SSL error. If your cluster uses TLS, enable it and provide certificates. If not, ensure TLS is disabled in connection settings.";
	}

	if (
		errorStr.includes("authentication failed") ||
		errorStr.includes("invalid auth")
	) {
		return "Authentication failed. Please check your username and password.";
	}

	return errorStr || "An unexpected error occurred";
}

interface ConnectionState {
	connectionId: string | null;
	config: EtcdConfig;
	isConnecting: boolean;
	connectionError: string;
	connectionHistory: EtcdConfig[];
	showPassword: boolean;
	showHistory: boolean;

	setConfig: (config: EtcdConfig) => void;
	setShowPassword: (show: boolean) => void;
	setShowHistory: (show: boolean) => void;
	loadSavedConnection: () => Promise<void>;
	loadConnectionHistory: () => Promise<void>;
	connect: () => Promise<boolean>;
	disconnect: () => Promise<void>;
	selectFromHistory: (hist: EtcdConfig) => void;
	setActiveConnectionId: (id: string | null) => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
	connectionId: null,
	config: {
		endpoint: "localhost:2379",
		username: "",
		password: "",
		tls_enabled: false,
		ca_cert_path: "",
		client_cert_path: "",
		client_key_path: "",
		skip_verify: false,
	},
	isConnecting: false,
	connectionError: "",
	connectionHistory: [],
	showPassword: false,
	showHistory: false,

	setConfig: (config) => set({ config }),
	setShowPassword: (show) => set({ showPassword: show }),
	setShowHistory: (show) => set({ showHistory: show }),

	loadSavedConnection: async () => {
		try {
			const saved = await getSavedConnection();
			if (saved) {
				set({ config: saved });
			}
		} catch (_e) {
			set({
				config: { endpoint: "localhost:2379", username: "", password: "" },
			});
		}
	},

	loadConnectionHistory: async () => {
		try {
			const history = await getConnectionHistory();
			set({ connectionHistory: history || [] });
		} catch (e: unknown) {
			toast.error(
				"Failed to load connection history: " +
					(e instanceof Error ? e.message : String(e)),
			);
		}
	},

	connect: async () => {
		const { config } = get();
		set({ isConnecting: true, connectionError: "" });

		try {
			const connectionId = await connectEtcd(config);

			set({ connectionId, isConnecting: false });
			toast.success("Connected to ETCD successfully");
			return true;
		} catch (error: unknown) {
			set({
				connectionError: error instanceof Error ? error.message : String(error),
				isConnecting: false,
			});
			toast.error(`Failed to connect: ${formatError(error)}`);
			return false;
		}
	},

	disconnect: async () => {
		const { connectionId } = get();
		if (!connectionId) return;

		try {
			await disconnectEtcd(connectionId);
			set({
				connectionId: null,
				config: {
					endpoint: "localhost:2379",
					username: "",
					password: "",
					tls_enabled: false,
					ca_cert_path: "",
					client_cert_path: "",
					client_key_path: "",
					skip_verify: false,
				},
			});
			toast.info("Disconnected from ETCD");
		} catch (error: unknown) {
			toast.error(`Failed to disconnect: ${formatError(error)}`);
		}
	},

	selectFromHistory: (hist) => {
		set({ config: hist, showHistory: false });
	},
	setActiveConnectionId: (id) => {
		set({ connectionId: id });
	},
}));
