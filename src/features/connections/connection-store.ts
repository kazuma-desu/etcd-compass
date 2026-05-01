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

export type ConnectionPhase =
	| "disconnected"
	| "connecting"
	| "authenticating"
	| "connected";

export function buildConnectionPhaseOrder(
	hasCredentials: boolean,
): ConnectionPhase[] {
	const order: ConnectionPhase[] = ["connecting"];
	if (hasCredentials) {
		order.push("authenticating");
	}
	return order;
}

interface ConnectionState {
	connectionId: string | null;
	config: EtcdConfig;
	isConnecting: boolean;
	connectionError: string;
	connectionHistory: EtcdConfig[];
	showPassword: boolean;
	showHistory: boolean;
	phase: ConnectionPhase;
	phaseOrder: ConnectionPhase[];

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
	phase: "disconnected",
	phaseOrder: buildConnectionPhaseOrder(false),

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
		const { config, connectionId: existingConnectionId, phase } = get();
		const hasUsername = Boolean(config.username);
		const hasPassword = Boolean(config.password);
		if (hasUsername !== hasPassword) {
			const message = "Username and password must be provided together.";
			set({
				connectionError: message,
				isConnecting: false,
				phase: "disconnected",
			});
			toast.error(message);
			return false;
		}

		const hasCredentials = hasUsername && hasPassword;
		if (existingConnectionId) {
			try {
				await disconnectEtcd(existingConnectionId);
				set({
					connectionId: null,
					phase: "disconnected",
					phaseOrder: buildConnectionPhaseOrder(false),
				});
			} catch (error: unknown) {
				const message = `Failed to disconnect existing session: ${formatError(error)}`;
				set({
					connectionError: message,
					isConnecting: false,
				});
				toast.error(message);
				return false;
			}
		} else if (phase !== "disconnected") {
			const message = "A connection attempt is already in progress.";
			set({ connectionError: message, isConnecting: false });
			toast.error(message);
			return false;
		}

		set({
			isConnecting: true,
			connectionError: "",
			phase: "connecting",
			phaseOrder: buildConnectionPhaseOrder(hasCredentials),
		});

		try {
			if (hasCredentials) {
				set({ phase: "authenticating" });
			}

			const connectionId = await connectEtcd(config);

			set({ connectionId, isConnecting: false, phase: "connected" });
			toast.success("Connected to ETCD successfully");
			return true;
		} catch (error: unknown) {
			const message = formatError(error);
			set({
				connectionError: message,
				isConnecting: false,
				phase: "disconnected",
			});
			toast.error(message);
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
				phase: "disconnected",
				phaseOrder: buildConnectionPhaseOrder(false),
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
		set({
			connectionId: id,
			phase: id ? "connected" : "disconnected",
			phaseOrder: buildConnectionPhaseOrder(false),
		});
	},
}));
