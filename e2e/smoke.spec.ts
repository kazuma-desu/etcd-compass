import { test, expect } from "@playwright/test";

test("smoke: app loads and shows welcome screen", async ({ page }) => {
	await page.goto("/");

	await expect(
		page.getByRole("heading", { name: "Welcome to ETCD Compass" }),
	).toBeVisible();

	await expect(
		page.getByRole("button", { name: "Add new connection" }).first(),
	).toBeVisible();
});
