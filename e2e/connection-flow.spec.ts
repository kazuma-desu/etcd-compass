import { test, expect } from "@playwright/test";
import { clearEtcd, setupEtcdMock } from "./fixtures";

const etcdEndpoint = process.env.ETCD_ENDPOINT ?? "http://localhost:2379";

test.beforeEach(async ({ page }) => {
	await clearEtcd(etcdEndpoint);
	await setupEtcdMock(page, etcdEndpoint);
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
