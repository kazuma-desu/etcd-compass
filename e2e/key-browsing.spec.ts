import { test, expect, type Page } from "@playwright/test";

interface MockEtcdKey {
	key: string;
	value: string;
	version: number;
	create_revision: number;
	mod_revision: number;
	lease: number;
}

interface MockState {
	keys: MockEtcdKey[];
	connectionId: string | null;
	connectionCounter: number;
}

/**
 * Inject a mock Tauri backend into the page so the React frontend
 * can call invoke() without a real Rust/Etcd backend.
 */
async function injectMockBackend(page: Page, initialKeys: MockEtcdKey[] = []) {
	await page.addInitScript((keysJson: string) => {
		const initialKeys: MockEtcdKey[] = JSON.parse(keysJson);
		const state: MockState = {
			keys: [...initialKeys],
			connectionId: null,
			connectionCounter: 1,
		};

		function generateConnectionId(): string {
			return `conn-${state.connectionCounter++}`;
		}

		function sortKeys(keys: MockEtcdKey[], ascending: boolean): MockEtcdKey[] {
			return [...keys].sort((a, b) =>
				ascending
					? a.key.localeCompare(b.key)
					: b.key.localeCompare(a.key),
			);
		}

		function paginate(
			keys: MockEtcdKey[],
			limit: number,
			cursor: string | null,
		): { keys: MockEtcdKey[]; hasMore: boolean; nextCursor: string | null } {
			let startIndex = 0;
			if (cursor) {
				startIndex = keys.findIndex((k) => k.key > cursor);
				if (startIndex === -1) startIndex = keys.length;
			}
			const pageKeys = keys.slice(startIndex, startIndex + limit);
			const hasMore = startIndex + limit < keys.length;
			const nextCursor = hasMore
				? pageKeys[pageKeys.length - 1]?.key ?? null
				: null;
			return { keys: pageKeys, hasMore, nextCursor };
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(window as any).__TAURI_INTERNALS__ = {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			invoke: async (cmd: string, args?: Record<string, any>) => {
				await new Promise((r) => setTimeout(r, 50));

				switch (cmd) {
					case "connect_etcd": {
						state.connectionId = generateConnectionId();
						return state.connectionId;
					}

					case "disconnect_etcd": {
						state.connectionId = null;
						return "disconnected";
					}

					case "test_connection": {
						return "Connection successful";
					}

					case "get_all_keys": {
						const limit = args?.limit ?? 50;
						const cursor = args?.cursor ?? null;
						const sortAscending = args?.sortAscending ?? true;
						const rangeStart = args?.rangeStart || null;
						const rangeEnd = args?.rangeEnd || null;

						let result = [...state.keys];

						if (rangeStart) {
							result = result.filter((k) => k.key >= rangeStart);
						}
						if (rangeEnd) {
							result = result.filter((k) => k.key < rangeEnd);
						}

						result = sortKeys(result, sortAscending);
						return paginate(result, limit, cursor);
					}

					case "get_keys_with_prefix": {
						const prefix = args?.prefix ?? "";
						const limit = args?.limit ?? 50;
						const cursor = args?.cursor ?? null;
						const sortAscending = args?.sortAscending ?? true;

						let result = state.keys.filter((k) => k.key.startsWith(prefix));
						result = sortKeys(result, sortAscending);
						return paginate(result, limit, cursor);
					}

					case "get_key": {
						const key = args?.key;
						const found = state.keys.find((k) => k.key === key);
						return found ?? null;
					}

					case "put_key": {
						const key = args?.key;
						const value = args?.value;
						const existing = state.keys.find((k) => k.key === key);
						if (existing) {
							existing.value = value;
							existing.version += 1;
							existing.mod_revision += 1;
							return existing;
						}
						const now = Date.now();
						const newKey: MockEtcdKey = {
							key,
							value,
							version: 1,
							create_revision: now,
							mod_revision: now,
							lease: 0,
						};
						state.keys.push(newKey);
						return newKey;
					}

					case "delete_key": {
						const key = args?.key;
						state.keys = state.keys.filter((k) => k.key !== key);
						return;
					}

					case "delete_keys": {
						const keysToDelete: string[] = args?.keys ?? [];
						state.keys = state.keys.filter(
							(k) => !keysToDelete.includes(k.key),
						);
						return keysToDelete.length;
					}

					case "save_connection": {
						return;
					}

					case "list_connections": {
						return [];
					}

					case "get_cluster_status": {
						return {
							header: { cluster_id: "1", member_id: "1" },
							members: [],
						};
					}

					case "get_cluster_metrics": {
						return {
							header: { cluster_id: "1", member_id: "1" },
							db_size: 0,
							db_size_in_use: 0,
							leader: "1",
							raft_index: 1,
							raft_term: 1,
						};
					}

					case "get_alarms": {
						return { alarms: [] };
					}

					case "list_leases": {
						return { leases: [] };
					}

					case "get_watch_prefix": {
						return { events: [] };
					}

					default: {
						// eslint-disable-next-line no-console
						console.warn(`Unhandled mock command: ${cmd}`, args);
						return null;
					}
				}
			},
		};
	}, JSON.stringify(initialKeys));
}

/**
 * Open the connection dialog, fill it out, and connect.
 */
async function connectToEtcd(page: Page, endpoint = "localhost:2379") {
	await page.goto("/");

	await expect(
		page.getByRole("heading", { name: "Welcome to ETCD Compass" }),
	).toBeVisible();

	await page.getByRole("button", { name: "Add new connection" }).first().click();

	await expect(page.getByRole("dialog")).toBeVisible();
	await expect(page.getByRole("heading", { name: "New Connection" })).toBeVisible();

	const endpointInput = page.locator('input[placeholder*="localhost:2379"]').first();
	await endpointInput.fill(endpoint);

	await page.getByRole("button", { name: "Connect" }).last().click();

	await expect(page.getByRole("button", { name: /ADD KEY/i })).toBeVisible();
}

const defaultInitialKeys: MockEtcdKey[] = [
	{
		key: "/config/app/name",
		value: "my-app",
		version: 1,
		create_revision: 1,
		mod_revision: 1,
		lease: 0,
	},
	{
		key: "/config/app/port",
		value: "8080",
		version: 1,
		create_revision: 2,
		mod_revision: 2,
		lease: 0,
	},
	{
		key: "/users/admin",
		value: '{"name":"admin","role":"superuser"}',
		version: 1,
		create_revision: 3,
		mod_revision: 3,
		lease: 0,
	},
];

test.describe("Key Browsing CRUD", () => {
	test.beforeEach(async ({ page }) => {
		await injectMockBackend(page, defaultInitialKeys);
	});

	test("user can view keys", async ({ page }) => {
		await connectToEtcd(page);

		await expect(
			page.getByTestId("flatview-card-/config/app/name"),
		).toBeVisible();
		await expect(
			page.getByTestId("flatview-card-/config/app/port"),
		).toBeVisible();
		await expect(
			page.getByTestId("flatview-card-/users/admin"),
		).toBeVisible();

		await expect(page.getByText("my-app")).toBeVisible();
		await expect(page.getByText("8080")).toBeVisible();
	});

	test.skip("user can add a key", async ({ page }) => {
		await connectToEtcd(page);

		await page.getByTestId("add-key-button").click();

		await expect(page.getByTestId("add-key-dialog")).toBeVisible();

		await page.locator("#new-key").fill("/config/new/feature-flag");
		await page.locator("#new-value").fill("enabled");

		await page.getByRole("button", { name: "Add Key", exact: true }).click();

		await expect(page.getByTestId("add-key-dialog")).not.toBeVisible();

		await expect(
			page.getByTestId("flatview-card-/config/new/feature-flag"),
		).toBeVisible();
		await expect(page.getByText("enabled")).toBeVisible();
	});

	test.skip("user can edit a key", async ({ page }) => {
		await connectToEtcd(page);

		await page.getByRole("tab", { name: /Tree/i }).click();
		await page.waitForTimeout(300);

		await page.getByTestId("treeview-node-config").click();
		await page.waitForTimeout(300);

		await page.getByTestId("treeview-node-config/app").click();
		await page.waitForTimeout(300);

		await page.getByTestId("treeview-node-config/app/name").click();

		await expect(page.getByRole("heading", { name: "Key Details" })).toBeVisible();

		await page.getByTestId("edit-key-button").click();

		await expect(page.getByTestId("edit-key-dialog")).toBeVisible();

		await page.locator("#edit-value").fill("my-updated-app");

		await page.getByRole("button", { name: "Save Changes" }).click();

		await expect(page.getByTestId("edit-key-dialog")).not.toBeVisible();

		await page.getByRole("tab", { name: /Flat/i }).click();

		await expect(page.getByText("my-updated-app")).toBeVisible();
		await expect(page.getByText("my-app")).not.toBeVisible();
	});

	test("user can delete a key", async ({ page }) => {
		await connectToEtcd(page);

		await page.getByTestId("flatview-card-/config/app/port").click();

		await page.keyboard.press("Delete");

		await expect(page.getByTestId("delete-key-dialog")).toBeVisible();

		await page.getByRole("button", { name: "Delete", exact: true }).click();

		await expect(page.getByTestId("delete-key-dialog")).not.toBeVisible();

		await expect(
			page.getByTestId("flatview-card-/config/app/port"),
		).not.toBeVisible();
	});

	test("user can switch between flat and tree view", async ({ page }) => {
		await connectToEtcd(page);

		await expect(
			page.getByTestId("flatview-card-/config/app/name"),
		).toBeVisible();

		await page.getByRole("tab", { name: /Tree/i }).click();

		await expect(
			page.getByTestId("flatview-card-/config/app/name"),
		).not.toBeVisible();

		await expect(page.getByText("config")).toBeVisible();
		await expect(page.getByText("users")).toBeVisible();

		await page.getByRole("tab", { name: /Flat/i }).click();

		await expect(
			page.getByTestId("flatview-card-/config/app/name"),
		).toBeVisible();
	});
});
