import { test, expect, type Page } from "@playwright/test";
import { clearEtcd, seedEtcd, setupEtcdMock } from "./fixtures";

interface MockEtcdKey {
	key: string;
	value: string;
	version: number;
	create_revision: number;
	mod_revision: number;
	lease: number;
}

const etcdEndpoint = process.env.ETCD_ENDPOINT ?? "http://localhost:2379";

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
		await clearEtcd(etcdEndpoint);
		await seedEtcd(
			etcdEndpoint,
			defaultInitialKeys.map((k) => ({ key: k.key, value: k.value })),
		);
		await setupEtcdMock(page, etcdEndpoint);
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

	test("user can add a key", async ({ page }) => {
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

	test("user can edit a key", async ({ page }) => {
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

		await expect(
			page.getByTestId("flatview-card-/config/app/name").getByText("my-updated-app"),
		).toBeVisible();
		await expect(
			page.getByTestId("flatview-card-/config/app/name").getByText("my-app"),
		).not.toBeVisible();
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
