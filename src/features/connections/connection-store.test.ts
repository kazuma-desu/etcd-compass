import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildConnectionPhaseOrder,
	useConnectionStore,
} from "./connection-store";

const mockInvoke = vi.mocked(invoke);

describe("Connection Store", () => {
	beforeEach(() => {
		useConnectionStore.setState({
			connectionId: null,
			config: {
				endpoint: "localhost:2379",
				username: "",
				password: "",
			},
			isConnecting: false,
			connectionError: "",
			connectionHistory: [],
			showPassword: false,
			showHistory: false,
			phase: "disconnected",
			phaseOrder: buildConnectionPhaseOrder(false),
		});
		vi.clearAllMocks();
	});

	describe("State Management", () => {
		it("should have default initial state", () => {
			const state = useConnectionStore.getState();
			expect(state.connectionId).toBeNull();
			expect(state.config).toEqual({
				endpoint: "localhost:2379",
				username: "",
				password: "",
			});
			expect(state.isConnecting).toBe(false);
			expect(state.connectionError).toBe("");
			expect(state.connectionHistory).toEqual([]);
			expect(state.showPassword).toBe(false);
			expect(state.showHistory).toBe(false);
			expect(state.phaseOrder).toEqual(["connecting"]);
		});

		it("should update config with setConfig", () => {
			const { setConfig } = useConnectionStore.getState();
			const newConfig = {
				endpoint: "192.168.1.1:2379",
				username: "admin",
				password: "secret",
			};
			setConfig(newConfig);

			expect(useConnectionStore.getState().config).toEqual(newConfig);
		});

		it("should toggle showPassword", () => {
			const { setShowPassword } = useConnectionStore.getState();
			setShowPassword(true);
			expect(useConnectionStore.getState().showPassword).toBe(true);

			setShowPassword(false);
			expect(useConnectionStore.getState().showPassword).toBe(false);
		});

		it("should toggle showHistory", () => {
			const { setShowHistory } = useConnectionStore.getState();
			setShowHistory(true);
			expect(useConnectionStore.getState().showHistory).toBe(true);

			setShowHistory(false);
			expect(useConnectionStore.getState().showHistory).toBe(false);
		});

		it("should set active connection id", () => {
			const { setActiveConnectionId } = useConnectionStore.getState();
			setActiveConnectionId("conn-123");
			expect(useConnectionStore.getState().connectionId).toBe("conn-123");

			setActiveConnectionId(null);
			expect(useConnectionStore.getState().connectionId).toBeNull();
		});
	});

	describe("Connection History", () => {
		it("should load connection history from backend", async () => {
			const mockHistory = [
				{ endpoint: "server1:2379", username: "user1" },
				{ endpoint: "server2:2379", username: "user2" },
			];
			mockInvoke.mockResolvedValueOnce(mockHistory);

			const { loadConnectionHistory } = useConnectionStore.getState();
			await loadConnectionHistory();

			expect(useConnectionStore.getState().connectionHistory).toEqual(
				mockHistory,
			);
			expect(mockInvoke).toHaveBeenCalledWith("get_connection_history");
		});

		it("should handle empty connection history", async () => {
			mockInvoke.mockResolvedValueOnce([]);

			const { loadConnectionHistory } = useConnectionStore.getState();
			await loadConnectionHistory();

			expect(useConnectionStore.getState().connectionHistory).toEqual([]);
		});

		it("should handle error when loading history gracefully", async () => {
			mockInvoke.mockRejectedValueOnce(new Error("Backend error"));

			const { loadConnectionHistory } = useConnectionStore.getState();
			await loadConnectionHistory();

			expect(useConnectionStore.getState().connectionHistory).toEqual([]);
		});

		it("should select config from history", () => {
			const { selectFromHistory } = useConnectionStore.getState();
			const historyItem = {
				endpoint: "history-server:2379",
				username: "history-user",
			};

			selectFromHistory(historyItem);

			expect(useConnectionStore.getState().config).toEqual(historyItem);
			expect(useConnectionStore.getState().showHistory).toBe(false);
		});
	});

	describe("Connection Operations", () => {
		it("should load saved connection on startup", async () => {
			const savedConfig = { endpoint: "saved:2379", username: "saved-user" };
			mockInvoke.mockResolvedValueOnce(savedConfig);

			const { loadSavedConnection } = useConnectionStore.getState();
			await loadSavedConnection();

			expect(useConnectionStore.getState().config).toEqual(savedConfig);
			expect(mockInvoke).toHaveBeenCalledWith("get_saved_connection");
		});

		it("should reset to defaults when no saved connection exists", async () => {
			mockInvoke.mockRejectedValueOnce(new Error("No saved connection"));

			const { loadSavedConnection } = useConnectionStore.getState();
			await loadSavedConnection();

			expect(useConnectionStore.getState().config).toEqual({
				endpoint: "",
				username: "",
				password: "",
			});
		});

		it("should connect successfully", async () => {
			mockInvoke.mockResolvedValueOnce("connection-id-123");

			const { connect } = useConnectionStore.getState();
			const result = await connect();

			expect(result).toBe(true);
			expect(useConnectionStore.getState().connectionId).toBe(
				"connection-id-123",
			);
			expect(useConnectionStore.getState().isConnecting).toBe(false);
			expect(useConnectionStore.getState().connectionError).toBe("");
		});

		it("should disconnect an existing session before reconnecting", async () => {
			useConnectionStore.setState({
				connectionId: "old-connection",
				phase: "connected",
			});
			mockInvoke.mockResolvedValueOnce(undefined);
			mockInvoke.mockResolvedValueOnce("new-connection");

			const { connect } = useConnectionStore.getState();
			const result = await connect();

			expect(result).toBe(true);
			expect(mockInvoke).toHaveBeenNthCalledWith(1, "disconnect_etcd", {
				connectionId: "old-connection",
			});
			expect(mockInvoke).toHaveBeenNthCalledWith(2, "connect_etcd", {
				endpoint: "localhost:2379",
				username: null,
				password: null,
				tlsEnabled: false,
				caCertPath: null,
				clientCertPath: null,
				clientKeyPath: null,
				skipVerify: false,
			});
			expect(useConnectionStore.getState().connectionId).toBe("new-connection");
			expect(useConnectionStore.getState().phase).toBe("connected");
		});

		it("should preserve an existing session when teardown fails before reconnecting", async () => {
			useConnectionStore.setState({
				connectionId: "old-connection",
				phase: "connected",
			});
			mockInvoke.mockRejectedValueOnce(new Error("disconnect failed"));

			const { connect } = useConnectionStore.getState();
			const result = await connect();

			expect(result).toBe(false);
			expect(mockInvoke).toHaveBeenCalledTimes(1);
			expect(mockInvoke).toHaveBeenCalledWith("disconnect_etcd", {
				connectionId: "old-connection",
			});
			expect(useConnectionStore.getState().connectionId).toBe("old-connection");
			expect(useConnectionStore.getState().phase).toBe("connected");
			expect(useConnectionStore.getState().connectionError).toBe(
				"Failed to disconnect existing session: disconnect failed",
			);
		});

		it("should reject a new connection while another connection attempt is in progress", async () => {
			useConnectionStore.setState({
				connectionId: null,
				phase: "connecting",
			});

			const { connect } = useConnectionStore.getState();
			const result = await connect();

			expect(result).toBe(false);
			expect(mockInvoke).not.toHaveBeenCalled();
			expect(useConnectionStore.getState().connectionError).toBe(
				"A connection attempt is already in progress.",
			);
		});

		it("should handle connection failure", async () => {
			mockInvoke.mockRejectedValueOnce(new Error("Connection refused"));

			const { connect } = useConnectionStore.getState();
			const result = await connect();

			expect(result).toBe(false);
			expect(useConnectionStore.getState().connectionId).toBeNull();
			expect(useConnectionStore.getState().isConnecting).toBe(false);
			expect(useConnectionStore.getState().connectionError).toBe(
				"Cannot connect to ETCD cluster. Please check if ETCD is running and the endpoint is correct.",
			);
		});

		it("should set isConnecting during connection attempt", async () => {
			mockInvoke.mockImplementation(
				() => new Promise((resolve) => setTimeout(() => resolve("id"), 10)),
			);

			const { connect } = useConnectionStore.getState();
			const promise = connect();

			expect(useConnectionStore.getState().isConnecting).toBe(true);
			await promise;
			expect(useConnectionStore.getState().isConnecting).toBe(false);
		});

		it("should disconnect successfully", async () => {
			useConnectionStore.setState({ connectionId: "conn-123" });
			mockInvoke.mockResolvedValueOnce(undefined);

			const { disconnect } = useConnectionStore.getState();
			await disconnect();

			expect(useConnectionStore.getState().connectionId).toBeNull();
			expect(useConnectionStore.getState().config).toEqual({
				endpoint: "",
				username: "",
				password: "",
				tls_enabled: false,
				ca_cert_path: "",
				client_cert_path: "",
				client_key_path: "",
				skip_verify: false,
			});
		});

		it("should do nothing when disconnecting without connection", async () => {
			useConnectionStore.setState({ connectionId: null });

			const { disconnect } = useConnectionStore.getState();
			await disconnect();

			expect(mockInvoke).not.toHaveBeenCalled();
		});

		it("should pass correct parameters to connect_etcd", async () => {
			useConnectionStore.setState({
				config: {
					endpoint: "test-server:2379",
					username: "test-user",
					password: "test-pass",
					tls_enabled: false,
					ca_cert_path: "",
					client_cert_path: "",
					client_key_path: "",
					skip_verify: false,
				},
			});
			mockInvoke.mockResolvedValueOnce("conn-id");

			const { connect } = useConnectionStore.getState();
			await connect();

			expect(mockInvoke).toHaveBeenCalledWith("connect_etcd", {
				endpoint: "test-server:2379",
				username: "test-user",
				password: "test-pass",
				tlsEnabled: false,
				caCertPath: null,
				clientCertPath: null,
				clientKeyPath: null,
				skipVerify: false,
			});
		});

		it("should reject partial credentials before connecting", async () => {
			useConnectionStore.setState({
				config: {
					endpoint: "test-server:2379",
					username: "test-user",
					password: "",
					tls_enabled: false,
					ca_cert_path: "",
					client_cert_path: "",
					client_key_path: "",
					skip_verify: false,
				},
			});

			const { connect } = useConnectionStore.getState();
			const result = await connect();

			expect(result).toBe(false);
			expect(useConnectionStore.getState().connectionError).toBe(
				"Username and password must be provided together.",
			);
			expect(mockInvoke).not.toHaveBeenCalledWith(
				"connect_etcd",
				expect.any(Object),
			);
		});

		it("should pass null for empty credentials", async () => {
			useConnectionStore.setState({
				config: {
					endpoint: "test-server:2379",
					username: "",
					password: "",
					tls_enabled: false,
					ca_cert_path: "",
					client_cert_path: "",
					client_key_path: "",
					skip_verify: false,
				},
			});
			mockInvoke.mockResolvedValueOnce("conn-id");

			const { connect } = useConnectionStore.getState();
			await connect();

			expect(mockInvoke).toHaveBeenCalledWith("connect_etcd", {
				endpoint: "test-server:2379",
				username: null,
				password: null,
				tlsEnabled: false,
				caCertPath: null,
				clientCertPath: null,
				clientKeyPath: null,
				skipVerify: false,
			});
		});
	});
});
