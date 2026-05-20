/**
 * Tests for scripts/convert-junit-to-sonar.cjs
 *
 * The script converts JUnit XML test reports to SonarQube generic test
 * execution format. Since the functions are not exported, we test via
 * subprocess execution with temporary files.
 */

import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCRIPT_PATH = path.resolve(
	__dirname,
	"../../scripts/convert-junit-to-sonar.cjs",
);

function runScript(args: string[]): {
	status: number | null;
	stdout: string;
	stderr: string;
} {
	const result = spawnSync("node", [SCRIPT_PATH, ...args], {
		encoding: "utf-8",
	});
	return {
		status: result.status,
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? "",
	};
}

let tmpDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "junit-sonar-test-"));
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeInput(content: string): string {
	const inputFile = path.join(tmpDir, "input.xml");
	fs.writeFileSync(inputFile, content, "utf-8");
	return inputFile;
}

function outputPath(): string {
	return path.join(tmpDir, "output.xml");
}

function readOutput(filePath: string): string {
	return fs.readFileSync(filePath, "utf-8");
}

describe("convert-junit-to-sonar CLI", () => {
	it("exits with code 1 and prints usage when no arguments are provided", () => {
		const result = runScript([]);
		expect(result.status).toBe(1);
		expect(result.stderr).toContain("Usage:");
		expect(result.stderr).toContain("convert-junit-to-sonar.cjs");
	});

	it("exits with code 1 when only one argument is provided", () => {
		const input = writeInput("<testsuites/>");
		const result = runScript([input]);
		expect(result.status).toBe(1);
		expect(result.stderr).toContain("Usage:");
	});

	it("exits with code 0 and logs success message when given valid files", () => {
		const input = writeInput(
			'<testsuite name="example" tests="0"></testsuite>',
		);
		const output = outputPath();
		const result = runScript([input, output]);
		expect(result.status).toBe(0);
		expect(result.stdout).toContain("Converted");
		expect(result.stdout).toContain(path.basename(input));
	});
});

describe("convert-junit-to-sonar XML conversion", () => {
	it("produces valid XML declaration and testExecutions root element", () => {
		const input = writeInput(
			'<testsuite name="my.suite" tests="0"></testsuite>',
		);
		const output = outputPath();
		runScript([input, output]);
		const xml = readOutput(output);

		expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
		expect(xml).toContain('<testExecutions version="1">');
		expect(xml).toContain("</testExecutions>");
	});

	it("converts a basic passing test case with correct duration", () => {
		const input = writeInput(`
<testsuite name="my::module" tests="1">
  <testcase name="it works" time="0.123"></testcase>
</testsuite>
`);
		const output = outputPath();
		runScript([input, output]);
		const xml = readOutput(output);

		expect(xml).toContain('<file path="my::module">');
		expect(xml).toContain('<testCase name="it works" duration="123">');
		expect(xml).toContain("</testCase>");
	});

	it("rounds duration to nearest millisecond", () => {
		const input = writeInput(`
<testsuite name="suite" tests="1">
  <testcase name="slow test" time="1.5005"></testcase>
</testsuite>
`);
		const output = outputPath();
		runScript([input, output]);
		const xml = readOutput(output);

		// Math.round(1.5005 * 1000) = Math.round(1500.5) = 1501
		expect(xml).toContain('duration="1501"');
	});

	it("converts a test case with a failure element", () => {
		const input = writeInput(`
<testsuite name="my::module" tests="1">
  <testcase name="fails" time="0.05">
    <failure message="assertion failed">Expected true but got false</failure>
  </testcase>
</testsuite>
`);
		const output = outputPath();
		runScript([input, output]);
		const xml = readOutput(output);

		expect(xml).toContain('<failure message="assertion failed">');
		expect(xml).toContain("Expected true but got false");
		expect(xml).toContain("</failure>");
	});

	it("converts a test case with an error element", () => {
		const input = writeInput(`
<testsuite name="my::module" tests="1">
  <testcase name="errors" time="0.01">
    <error message="runtime error">thread panicked</error>
  </testcase>
</testsuite>
`);
		const output = outputPath();
		runScript([input, output]);
		const xml = readOutput(output);

		expect(xml).toContain('<error message="runtime error">');
		expect(xml).toContain("thread panicked");
		expect(xml).toContain("</error>");
	});

	it("converts a skipped test case with a message", () => {
		const input = writeInput(`
<testsuite name="my::module" tests="1">
  <testcase name="skipped test" time="0.00">
    <skipped message="not yet implemented"></skipped>
  </testcase>
</testsuite>
`);
		const output = outputPath();
		runScript([input, output]);
		const xml = readOutput(output);

		expect(xml).toContain('<skipped message="not yet implemented"/>');
	});

	it("uses 'skipped' as default message when skipped has no message attribute", () => {
		const input = writeInput(`
<testsuite name="my::module" tests="1">
  <testcase name="skipped test" time="0.00">
    <skipped></skipped>
  </testcase>
</testsuite>
`);
		const output = outputPath();
		runScript([input, output]);
		const xml = readOutput(output);

		expect(xml).toContain('<skipped message="skipped"/>');
	});

	it("handles multiple testsuites", () => {
		const input = writeInput(`
<testsuites>
  <testsuite name="suite::one" tests="1">
    <testcase name="test a" time="0.1"></testcase>
  </testsuite>
  <testsuite name="suite::two" tests="1">
    <testcase name="test b" time="0.2"></testcase>
  </testsuite>
</testsuites>
`);
		const output = outputPath();
		runScript([input, output]);
		const xml = readOutput(output);

		expect(xml).toContain('<file path="suite::one">');
		expect(xml).toContain('<file path="suite::two">');
		expect(xml).toContain('<testCase name="test a"');
		expect(xml).toContain('<testCase name="test b"');
	});

	it("handles multiple test cases within a single suite", () => {
		const input = writeInput(`
<testsuite name="my::suite" tests="3">
  <testcase name="alpha" time="0.1"></testcase>
  <testcase name="beta" time="0.2"></testcase>
  <testcase name="gamma" time="0.3"></testcase>
</testsuite>
`);
		const output = outputPath();
		runScript([input, output]);
		const xml = readOutput(output);

		expect(xml).toContain('<testCase name="alpha"');
		expect(xml).toContain('<testCase name="beta"');
		expect(xml).toContain('<testCase name="gamma"');
	});

	it("escapes ampersand in suite names", () => {
		const input = writeInput(
			`<testsuite name="suite with &amp; ampersand" tests="0"></testsuite>`,
		);
		const output = outputPath();
		runScript([input, output]);
		const xml = readOutput(output);

		expect(xml).toContain('<file path="suite with &amp; ampersand">');
	});

	it("escapes XML special characters in test case names", () => {
		const input = writeInput(`
<testsuite name="suite" tests="1">
  <testcase name="test &amp; verify" time="0.01"></testcase>
</testsuite>
`);
		const output = outputPath();
		runScript([input, output]);
		const xml = readOutput(output);

		expect(xml).toContain('<testCase name="test &amp; verify"');
	});

	it("escapes XML special characters in failure messages", () => {
		const input = writeInput(`
<testsuite name="suite" tests="1">
  <testcase name="fails with special chars" time="0.01">
    <failure message="expected &lt;foo&gt; but got bar">body content</failure>
  </testcase>
</testsuite>
`);
		const output = outputPath();
		runScript([input, output]);
		const xml = readOutput(output);

		expect(xml).toContain('message="expected &lt;foo&gt; but got bar"');
		expect(xml).toContain("body content");
	});

	it("escapes XML special characters in failure body", () => {
		const input = writeInput(`
<testsuite name="suite" tests="1">
  <testcase name="fails" time="0.01">
    <failure message="msg">body with &amp; ampersand and &lt;tags&gt;</failure>
  </testcase>
</testsuite>
`);
		const output = outputPath();
		runScript([input, output]);
		const xml = readOutput(output);

		expect(xml).toContain("&amp;");
		expect(xml).toContain("&lt;tags&gt;");
	});

	it("produces empty file block for testsuite with no testcases", () => {
		const input = writeInput(
			'<testsuite name="empty.suite" tests="0"></testsuite>',
		);
		const output = outputPath();
		runScript([input, output]);
		const xml = readOutput(output);

		expect(xml).toContain('<file path="empty.suite">');
		expect(xml).toContain("</file>");
		// No testCase elements
		expect(xml).not.toContain("<testCase");
	});

	it("does not include inner failure/error/skipped closing tag when test passes", () => {
		const input = writeInput(`
<testsuite name="suite" tests="1">
  <testcase name="passes" time="0.5"></testcase>
</testsuite>
`);
		const output = outputPath();
		runScript([input, output]);
		const xml = readOutput(output);

		expect(xml).not.toContain("<failure");
		expect(xml).not.toContain("<error");
		expect(xml).not.toContain("<skipped");
	});

	it("zero duration when time is 0", () => {
		const input = writeInput(`
<testsuite name="suite" tests="1">
  <testcase name="instant" time="0"></testcase>
</testsuite>
`);
		const output = outputPath();
		runScript([input, output]);
		const xml = readOutput(output);

		expect(xml).toContain('duration="0"');
	});

	it("handles large duration values correctly", () => {
		const input = writeInput(`
<testsuite name="suite" tests="1">
  <testcase name="slow" time="60.999"></testcase>
</testsuite>
`);
		const output = outputPath();
		runScript([input, output]);
		const xml = readOutput(output);

		// Math.round(60.999 * 1000) = Math.round(60999) = 60999
		expect(xml).toContain('duration="60999"');
	});

	it("writes output file to specified path", () => {
		const input = writeInput('<testsuite name="s" tests="0"></testsuite>');
		const customOutput = path.join(tmpDir, "custom-dir", "out.xml");
		fs.mkdirSync(path.dirname(customOutput), { recursive: true });

		runScript([input, customOutput]);

		expect(fs.existsSync(customOutput)).toBe(true);
	});

	it("produces well-structured testExecutions XML without extra whitespace in root", () => {
		const input = writeInput(`
<testsuite name="my.test.module" tests="2">
  <testcase name="test one" time="0.001"></testcase>
  <testcase name="test two" time="0.002">
    <failure message="failed">details</failure>
  </testcase>
</testsuite>
`);
		const output = outputPath();
		runScript([input, output]);
		const xml = readOutput(output);

		// Root structure check
		const executionsStart = xml.indexOf('<testExecutions version="1">');
		const executionsEnd = xml.indexOf("</testExecutions>");
		expect(executionsStart).toBeGreaterThan(-1);
		expect(executionsEnd).toBeGreaterThan(executionsStart);

		// File block wraps testcases
		const fileStart = xml.indexOf('<file path="my.test.module">');
		const fileEnd = xml.indexOf("</file>");
		expect(fileStart).toBeGreaterThan(executionsStart);
		expect(fileEnd).toBeGreaterThan(fileStart);

		// Both test cases present
		expect(xml).toContain('<testCase name="test one"');
		expect(xml).toContain('<testCase name="test two"');
	});
});

describe("escapeXml behavior (verified via output)", () => {
	it("handles empty suite name", () => {
		const input = writeInput('<testsuite name="" tests="0"></testsuite>');
		const output = outputPath();
		runScript([input, output]);
		const xml = readOutput(output);

		expect(xml).toContain('<file path="">');
	});

	it("escapes ampersand in failure message attribute", () => {
		const input = writeInput(`
<testsuite name="suite" tests="1">
  <testcase name="t" time="0.01">
    <failure message="a &amp; b">detail</failure>
  </testcase>
</testsuite>
`);
		const output = outputPath();
		runScript([input, output]);
		const xml = readOutput(output);

		expect(xml).toContain('<failure message="a &amp; b">');
	});

	it("handles single quotes in test names (escaped as &apos;)", () => {
		const input = writeInput(`
<testsuite name="suite" tests="1">
  <testcase name="it's a test" time="0.01"></testcase>
</testsuite>
`);
		const output = outputPath();
		runScript([input, output]);
		const xml = readOutput(output);

		// name captured as "it's a test", escapeXml replaces ' with &apos;
		expect(xml).toContain("it&apos;s a test");
	});

	it("handles double quotes in failure body (escaped as &quot;)", () => {
		const input = writeInput(`
<testsuite name="suite" tests="1">
  <testcase name="t" time="0.01">
    <failure message="msg">say "hello"</failure>
  </testcase>
</testsuite>
`);
		const output = outputPath();
		runScript([input, output]);
		const xml = readOutput(output);

		// body = 'say "hello"', escapeXml -> 'say &quot;hello&quot;'
		expect(xml).toContain("say &quot;hello&quot;");
	});

	it("handles greater-than in failure body (escaped as &gt;)", () => {
		const input = writeInput(`
<testsuite name="suite" tests="1">
  <testcase name="t" time="0.01">
    <failure message="msg">value > 10</failure>
  </testcase>
</testsuite>
`);
		const output = outputPath();
		runScript([input, output]);
		const xml = readOutput(output);

		expect(xml).toContain("value &gt; 10");
	});

	it("handles less-than in failure body (escaped as &lt;)", () => {
		const input = writeInput(`
<testsuite name="suite" tests="1">
  <testcase name="t" time="0.01">
    <failure message="msg">value &lt; 10</failure>
  </testcase>
</testsuite>
`);
		const output = outputPath();
		runScript([input, output]);
		const xml = readOutput(output);

		expect(xml).toContain("value &lt; 10");
	});
});
