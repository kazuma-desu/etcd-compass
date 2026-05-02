import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("hardcoded localhost:2379 regression", () => {
	it("should only define localhost:2379 in the shared constants file", () => {
		const result = execSync(
			'grep -r "localhost:2379" src/ --include="*.ts" --include="*.tsx" -l',
			{ encoding: "utf-8", cwd: process.cwd() },
		);

		const files = result.trim().split("\n").filter(Boolean);
		const nonTestFiles = files.filter(
			(f) => !f.includes(".test.") && !f.includes(".regression.test."),
		);

		expect(nonTestFiles).toEqual(["src/shared/constants.ts"]);
	});
});
