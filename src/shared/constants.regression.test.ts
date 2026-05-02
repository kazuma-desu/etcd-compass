import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// =============================================================================
// REGRESSION TEST: Hardcoded localhost:2379 Defaults (Bug #7)
// =============================================================================
// Bug: The string "localhost:2379" was hardcoded in multiple files
// (connection-store.ts, ConnectionForm.tsx, ConnectionManager.tsx) as both
// default values and UI placeholders. This made it impossible to change the
// default or require explicit user input.
// Fix: Extracted DEFAULT_ENDPOINT constant to src/shared/constants.ts and
// changed default endpoint state to empty string.
// =============================================================================

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
