import { test, expect, type Page } from "@playwright/test";

/**
 * Mocks Tauri `invoke` APIs so E2E tests can exercise connection flows
 * without a real etcd backend or Tauri runtime.
 */
async function setupTauriMock(page: Page) {
	await page.addInitScript(() => {
		const mockConnections = new Map<string, string>();
		const mockHistory: Array<Record<string, unknown>> = [];

		(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {
			invoke: async (cmd: string, args: Record<string, unknown>) => {
				switch (cmd) {
					case "connect_etcd": {
						const id = `conn-${Date.now()}-${Math.random().toString(36).slice(2)}`;
						mockConnections.set(id, args.endpoint as string);
						mockHistory.push({
							endpoint: args.endpoint,
							name: args.name || args.endpoint,
							username: args.username,
							password: args.password,
							tls_enabled: args.tlsEnabled,
							ca_cert_path: args.caCertPath,
							client_cert_path: args.clientCertPath,
							client_key_path: args.clientKeyPath,
							skip_verify: args.skipVerify,
							isFavorite: false,
						});
						return id;
					}
					case "disconnect_etcd": {
						for (const [id] of mockConnections) {
							if (id === args.connectionId) {
								mockConnections.delete(id);
								break;
							}
						}
						return "disconnected";
					}
					case "test_connection": {
						if (
							!args.endpoint ||
							(args.endpoint as string).includes("invalid")
						) {
							throw new Error(
								"Connection refused: unable to connect to endpoint",
							);
						}
						return "ok";
					}
					case "save_connection":
						return;
					case "get_connection_history":
						return mockHistory;
					case "list_connections":
						return Array.from(mockConnections.entries());
					case "get_saved_connection":
						return mockHistory[0] || null;
					case "remove_from_history": {
						const idx = mockHistory.findIndex(
							(h) => h.endpoint === args.endpoint,
						);
						if (idx >= 0) mockHistory.splice(idx, 1);
						return;
					}
					case "update_connection_favorite": {
						const hist = mockHistory.find(
							(h) => h.endpoint === args.endpoint,
						);
						if (hist) hist.isFavorite = args.isFavorite;
						return;
					}
					case "duplicate_connection":
						return;
					case "import_connections":
						return;
					default:
						throw new Error(`Unknown command: ${cmd}`);
				}
			},
		};
	});
}

test.beforeEach(async ({ page }) => {
	await setupTauriMock(page);
	await page.goto("/");
});

test("user can connect to etcd", async ({ page }) => {
	await expect(
		page.getByRole("heading", { name: "Welcome to ETCD Compass" }),
	).toBeVisible();

	await page
		.getByRole("button", { name: "Add new connection" })
		.first()
		.click();
	await expect(page.getByRole("dialog")).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "New Connection" }),
	).toBeVisible();

	await page.locator('input[name="endpoint"]').fill("localhost:2379");
	await page
		.getByRole("dialog")
		.getByRole("button", { name: "Connect", exact: true })
		.click();

	await expect(page.getByRole("dialog")).not.toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Welcome to ETCD Compass" }),
	).not.toBeVisible();
});

test("user can disconnect from etcd", async ({ page }) => {
	await page
		.getByRole("button", { name: "Add new connection" })
		.first()
		.click();
	await page.locator('input[name="endpoint"]').fill("localhost:2379");
	await page
		.getByRole("dialog")
		.getByRole("button", { name: "Connect", exact: true })
		.click();
	await expect(page.getByRole("dialog")).not.toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Welcome to ETCD Compass" }),
	).not.toBeVisible();

	await page
		.getByRole("button", { name: "localhost:2379" })
		.first()
		.click({ button: "right" });
	await page.getByText("Disconnect").click();

	await expect(
		page.getByRole("heading", { name: "Welcome to ETCD Compass" }),
	).toBeVisible();
});

test("user sees connection error for invalid endpoint", async ({ page }) => {
	await page
		.getByRole("button", { name: "Add new connection" })
		.first()
		.click();
	await expect(page.getByRole("dialog")).toBeVisible();

	await page.locator('input[name="endpoint"]').fill("invalid-endpoint");
	await page.getByRole("button", { name: "Test Connection" }).click();

	await expect(page.getByText("Connection refused")).toBeVisible();
});

test("user can view connection history", async ({ page }) => {
	await page
		.getByRole("button", { name: "Add new connection" })
		.first()
		.click();
	await page.locator('input[name="endpoint"]').fill("localhost:2379");
	await page
		.getByRole("dialog")
		.getByRole("button", { name: "Connect", exact: true })
		.click();
	await expect(page.getByRole("dialog")).not.toBeVisible();

	await page
		.getByRole("button", { name: "localhost:2379" })
		.first()
		.click({ button: "right" });
	await page.getByText("Disconnect").click();

	await expect(
		page.getByRole("button", { name: "localhost:2379" }).first(),
	).toBeVisible();
});
