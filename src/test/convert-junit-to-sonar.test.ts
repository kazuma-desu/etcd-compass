/**
 * Tests for scripts/convert-junit-to-sonar.cjs
 *
 * The script converts JUnit XML test reports to SonarQube generic test execution format.
 * We test via actual temp files and child_process to avoid CJS/ESM module mocking issues.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_PATH = join(
	dirname(__filename),
	"../../../scripts/convert-junit-to-sonar.cjs",
);

let tmpDir: string;
let inputPath: string;
let outputPath: string;

beforeEach(() => {
	tmpDir = mkdtempSync(join(tmpdir(), "junit-to-sonar-test-"));
	inputPath = join(tmpDir, "input.xml");
	outputPath = join(tmpDir, "output.xml");
});

afterEach(() => {
	rmSync(tmpDir, { recursive: true, force: true });
});

/**
 * Helper: write input XML, run the converter script, and return the output XML.
 */
function runConverter(inputXml: string): string {
	writeFileSync(inputPath, inputXml, "utf-8");
	const result = spawnSync("node", [SCRIPT_PATH, inputPath, outputPath], {
		encoding: "utf-8",
	});
	if (result.error) {
		throw result.error;
	}
	if (result.status !== 0) {
		throw new Error(
			`Script exited with code ${result.status}: ${result.stderr}`,
		);
	}
	return readFileSync(outputPath, "utf-8");
}

describe("convert-junit-to-sonar.cjs", () => {
	describe("XML output structure", () => {
		it("produces valid SonarQube testExecutions XML wrapper", () => {
			const input = `
        <testsuite name="my::module" tests="1" time="0.5">
          <testcase name="my test" time="0.5"></testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			expect(output).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
			expect(output).toContain('<testExecutions version="1">');
			expect(output).toContain("</testExecutions>");
		});

		it("maps testsuite name to file path attribute", () => {
			const input = `
        <testsuite name="src/foo/bar.rs" tests="1" time="0.1">
          <testcase name="passes" time="0.1"></testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			expect(output).toContain('<file path="src/foo/bar.rs">');
			expect(output).toContain("</file>");
		});

		it("emits testCase elements inside the file block", () => {
			const input = `
        <testsuite name="my_suite" tests="1" time="0.05">
          <testcase name="does_something" time="0.05"></testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			expect(output).toContain('<testCase name="does_something"');
			expect(output).toContain("</testCase>");
		});
	});

	describe("duration conversion", () => {
		it("converts seconds to milliseconds (integer seconds)", () => {
			const input = `
        <testsuite name="suite" tests="1" time="2">
          <testcase name="test" time="2"></testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			expect(output).toContain('duration="2000"');
		});

		it("converts fractional seconds to milliseconds", () => {
			const input = `
        <testsuite name="suite" tests="1" time="0.5">
          <testcase name="test" time="0.5"></testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			expect(output).toContain('duration="500"');
		});

		it("rounds fractional millisecond values", () => {
			const input = `
        <testsuite name="suite" tests="1" time="0.1234">
          <testcase name="test" time="0.1234"></testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			// Math.round(0.1234 * 1000) = Math.round(123.4) = 123
			expect(output).toContain('duration="123"');
		});

		it("handles zero duration", () => {
			const input = `
        <testsuite name="suite" tests="1" time="0">
          <testcase name="test" time="0"></testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			expect(output).toContain('duration="0"');
		});
	});

	describe("passing test cases", () => {
		it("emits a testCase without inner elements for a passing test", () => {
			const input = `
        <testsuite name="suite" tests="1" time="0.1">
          <testcase name="passes" time="0.1"></testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			expect(output).not.toContain("<failure");
			expect(output).not.toContain("<error");
			expect(output).not.toContain("<skipped");
			expect(output).toContain('<testCase name="passes"');
		});
	});

	describe("failure test cases", () => {
		it("includes failure element with message and body", () => {
			const input = `
        <testsuite name="suite" tests="1" failures="1" time="0.2">
          <testcase name="failing_test" time="0.2">
            <failure message="assertion failed">expected 1 got 2</failure>
          </testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			expect(output).toContain('<failure message="assertion failed">');
			expect(output).toContain("expected 1 got 2");
			expect(output).toContain("</failure>");
		});

		it("handles failure with type attribute before message", () => {
			const input = `
        <testsuite name="suite" tests="1" failures="1" time="0.2">
          <testcase name="failing_test" time="0.2">
            <failure type="AssertionError" message="wrong value">stack trace here</failure>
          </testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			expect(output).toContain('<failure message="wrong value">');
			expect(output).toContain("stack trace here");
		});
	});

	describe("error test cases", () => {
		it("includes error element with message and body", () => {
			const input = `
        <testsuite name="suite" tests="1" errors="1" time="0.3">
          <testcase name="error_test" time="0.3">
            <error message="unexpected panic">thread panicked at main.rs:10</error>
          </testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			expect(output).toContain('<error message="unexpected panic">');
			expect(output).toContain("thread panicked at main.rs:10");
			expect(output).toContain("</error>");
		});
	});

	describe("skipped test cases", () => {
		it("includes skipped element with message attribute", () => {
			const input = `
        <testsuite name="suite" tests="1" skipped="1" time="0.0">
          <testcase name="skipped_test" time="0.0">
            <skipped message="not implemented yet"></skipped>
          </testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			expect(output).toContain('<skipped message="not implemented yet"/>');
		});

		it("uses 'skipped' as default message when no message attribute present", () => {
			const input = `
        <testsuite name="suite" tests="1" skipped="1" time="0.0">
          <testcase name="skipped_test" time="0.0">
            <skipped></skipped>
          </testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			expect(output).toContain('<skipped message="skipped"/>');
		});
	});

	describe("XML escaping", () => {
		it("escapes ampersand in test case name", () => {
			const input = `
        <testsuite name="suite" tests="1" time="0.1">
          <testcase name="foo &amp; bar" time="0.1"></testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			expect(output).toContain('name="foo &amp; bar"');
		});

		it("escapes less-than in test case name", () => {
			const input = `
        <testsuite name="suite" tests="1" time="0.1">
          <testcase name="value &lt; 10" time="0.1"></testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			expect(output).toContain('name="value &lt; 10"');
		});

		it("escapes greater-than in test case name", () => {
			const input = `
        <testsuite name="suite" tests="1" time="0.1">
          <testcase name="value &gt; 0" time="0.1"></testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			expect(output).toContain('name="value &gt; 0"');
		});

		it("escapes apostrophes in testsuite name", () => {
			const input = `
        <testsuite name="it&apos;s a suite" tests="1" time="0.1">
          <testcase name="test" time="0.1"></testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			expect(output).toContain('path="it&apos;s a suite"');
		});

		it("escapes less-than in failure body content", () => {
			const input = `
        <testsuite name="suite" tests="1" failures="1" time="0.1">
          <testcase name="test" time="0.1">
            <failure message="fail">x &lt; y</failure>
          </testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			expect(output).toContain("x &lt; y");
		});
	});

	describe("multiple test suites and test cases", () => {
		it("produces a file block for each testsuite", () => {
			const input = `
        <testsuite name="module::a" tests="1" time="0.1">
          <testcase name="test_a" time="0.1"></testcase>
        </testsuite>
        <testsuite name="module::b" tests="1" time="0.2">
          <testcase name="test_b" time="0.2"></testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			expect(output).toContain('<file path="module::a">');
			expect(output).toContain('<file path="module::b">');
		});

		it("includes all test cases from a suite", () => {
			const input = `
        <testsuite name="suite" tests="3" time="0.6">
          <testcase name="first" time="0.1"></testcase>
          <testcase name="second" time="0.2"></testcase>
          <testcase name="third" time="0.3"></testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			expect(output).toContain('<testCase name="first"');
			expect(output).toContain('<testCase name="second"');
			expect(output).toContain('<testCase name="third"');
		});

		it("handles a testsuite with no test cases", () => {
			const input = `
        <testsuite name="empty_suite" tests="0" time="0.0">
        </testsuite>
      `;
			const output = runConverter(input);

			expect(output).toContain('<file path="empty_suite">');
			expect(output).toContain("</file>");
			expect(output).not.toContain("<testCase");
		});
	});

	describe("empty input", () => {
		it("produces valid empty wrapper when input has no testsuites", () => {
			const input = `<?xml version="1.0" encoding="UTF-8"?>`;
			const output = runConverter(input);

			expect(output).toContain('<testExecutions version="1">');
			expect(output).toContain("</testExecutions>");
			expect(output).not.toContain("<file");
		});
	});

	describe("real-world JUnit XML (cargo-nextest format)", () => {
		it("converts a typical nextest JUnit report correctly", () => {
			const input = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="etcd-compass" tests="3" failures="0" errors="0" time="1.234">
  <testsuite name="etcd_compass::etcd" tests="2" failures="0" errors="0" time="0.8">
    <testcase name="test_key_not_found" time="0.3"></testcase>
    <testcase name="test_map_code_5_error" time="0.5"></testcase>
  </testsuite>
  <testsuite name="etcd_compass::integration_tests" tests="1" failures="1" errors="0" time="0.434">
    <testcase name="test_cloned_client_reconnect_fails" time="0.434">
      <failure message="assertion failed: result.is_err()">thread panicked at main.rs:10</failure>
    </testcase>
  </testsuite>
</testsuites>`;

			const output = runConverter(input);

			expect(output).toContain('<file path="etcd_compass::etcd">');
			expect(output).toContain(
				'<testCase name="test_key_not_found" duration="300">',
			);
			expect(output).toContain(
				'<testCase name="test_map_code_5_error" duration="500">',
			);
			expect(output).toContain('<file path="etcd_compass::integration_tests">');
			expect(output).toContain(
				'<testCase name="test_cloned_client_reconnect_fails" duration="434">',
			);
			expect(output).toContain(
				'<failure message="assertion failed: result.is_err()">',
			);
		});
	});

	describe("CLI argument validation", () => {
		it("exits with code 1 when no arguments are provided", () => {
			const result = spawnSync("node", [SCRIPT_PATH], { encoding: "utf-8" });
			expect(result.status).toBe(1);
		});

		it("prints usage error message when arguments are missing", () => {
			const result = spawnSync("node", [SCRIPT_PATH], { encoding: "utf-8" });
			expect(result.stderr).toContain("Usage:");
		});

		it("exits with code 1 when only input argument is provided", () => {
			writeFileSync(inputPath, "<x/>", "utf-8");
			const result = spawnSync("node", [SCRIPT_PATH, inputPath], {
				encoding: "utf-8",
			});
			expect(result.status).toBe(1);
		});
	});

	describe("boundary and regression cases", () => {
		it("handles testsuite attributes in any order (hostname before name)", () => {
			// The regex uses \\bname= to avoid matching hostname= as name=
			const input = `
        <testsuite hostname="myhost" name="correct_name" tests="1" time="0.1">
          <testcase name="test" time="0.1"></testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			expect(output).toContain('<file path="correct_name">');
			expect(output).not.toContain('path="myhost"');
		});

		it("handles testcase with classname attribute before name", () => {
			const input = `
        <testsuite name="suite" tests="1" time="0.1">
          <testcase classname="my.Class" name="my_test" time="0.1"></testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			expect(output).toContain('<testCase name="my_test"');
		});

		it("preserves multiline failure body content", () => {
			const input = `
        <testsuite name="suite" tests="1" failures="1" time="0.2">
          <testcase name="multiline_fail" time="0.2">
            <failure message="fail">line1
line2
line3</failure>
          </testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			expect(output).toContain("line1");
			expect(output).toContain("line2");
			expect(output).toContain("line3");
		});

		it("produces exactly one file block per testsuite", () => {
			const input = `
        <testsuite name="only_suite" tests="2" time="0.3">
          <testcase name="t1" time="0.1"></testcase>
          <testcase name="t2" time="0.2"></testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			const fileMatches = output.match(/<file /g);
			expect(fileMatches).toHaveLength(1);
		});

		it("produces correct count of testCase elements", () => {
			const input = `
        <testsuite name="suite" tests="4" time="1.0">
          <testcase name="a" time="0.25"></testcase>
          <testcase name="b" time="0.25"></testcase>
          <testcase name="c" time="0.25"></testcase>
          <testcase name="d" time="0.25"></testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			const testCaseMatches = output.match(/<testCase /g);
			expect(testCaseMatches).toHaveLength(4);
		});

		it("prints a confirmation message to stdout after conversion", () => {
			const input = `
        <testsuite name="suite" tests="1" time="0.1">
          <testcase name="test" time="0.1"></testcase>
        </testsuite>
      `;
			writeFileSync(inputPath, input, "utf-8");
			const result = spawnSync("node", [SCRIPT_PATH, inputPath, outputPath], {
				encoding: "utf-8",
			});
			expect(result.stdout).toContain("Converted");
			expect(result.stdout).toContain(inputPath);
			expect(result.stdout).toContain(outputPath);
		});
	});
});
