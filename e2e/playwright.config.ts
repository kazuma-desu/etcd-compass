import { defineConfig, devices } from "@playwright/test";

process.env.TESTCONTAINERS_RYUK_DISABLED = "true";

export default defineConfig({
	testDir: ".",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	reporter: "list",
	globalSetup: "./global-setup.ts",
	globalTeardown: "./global-teardown.ts",
	use: {
		baseURL: "http://localhost:1420",
		trace: "on-first-retry",
		headless: true,
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "npm run tauri:dev",
		url: "http://localhost:1420",
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
