import { describe, expect, it } from "vitest";

describe("auth index exports", () => {
	it("should export AuthPage", async () => {
		const { AuthPage } = await import("./index");
		expect(AuthPage).toBeDefined();
	});

	it("should export AuthStatusCard", async () => {
		const { AuthStatusCard } = await import("./index");
		expect(AuthStatusCard).toBeDefined();
	});

	it("should export useAuthStore", async () => {
		const { useAuthStore } = await import("./index");
		expect(useAuthStore).toBeDefined();
	});

	it("should export RolesTab", async () => {
		const { RolesTab } = await import("./index");
		expect(RolesTab).toBeDefined();
	});

	it("should export UsersTab", async () => {
		const { UsersTab } = await import("./index");
		expect(UsersTab).toBeDefined();
	});
});
