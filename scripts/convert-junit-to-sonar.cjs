#!/usr/bin/env node

/**
 * Convert JUnit XML test reports to SonarQube generic test execution format.
 *
 * Usage:
 *   node convert-junit-to-sonar.cjs <input-junit.xml> <output-sonar.xml>
 */

const fs = require("node:fs");
const { XMLParser } = require("fast-xml-parser");

function escapeXml(str) {
	if (!str) return "";
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function getTextContent(node) {
	if (node === undefined || node === null) return "";
	if (typeof node === "string") return node;
	if (typeof node === "object") {
		if (node["#text"]) return node["#text"];
		return "";
	}
	return String(node);
}

function convertJUnitToSonar(inputFile, outputFile) {
	const xml = fs.readFileSync(inputFile, "utf-8");

	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: "",
		parseAttributeValue: false,
		trimValues: true,
		parseTagValue: false,
	});

	const parsed = parser.parse(xml);

	let output = '<?xml version="1.0" encoding="UTF-8"?>\n';
	output += '<testExecutions version="1">\n';

	const testsuites = parsed.testsuites
		? Array.isArray(parsed.testsuites.testsuite)
			? parsed.testsuites.testsuite
			: parsed.testsuites.testsuite
				? [parsed.testsuites.testsuite]
				: []
		: parsed.testsuite
			? Array.isArray(parsed.testsuite)
				? parsed.testsuite
				: [parsed.testsuite]
			: [];

	for (const suite of testsuites) {
		const suiteName = suite.name !== undefined ? suite.name : "unknown";
		output += `  <file path="${escapeXml(suiteName)}">\n`;

		const testcases = suite.testcase
			? Array.isArray(suite.testcase)
				? suite.testcase
				: [suite.testcase]
			: [];

		for (const tc of testcases) {
			const name = tc.name !== undefined ? tc.name : "unknown";
			const timeStr = tc.time;
			const time = timeStr ? parseFloat(timeStr) : NaN;
			const duration = Number.isFinite(time) ? Math.round(time * 1000) : 0;
			if (!Number.isFinite(time)) {
				console.warn(`Warning: malformed time attribute in testcase "${name}"`);
			}

			output += `    <testCase name="${escapeXml(name)}" duration="${duration}">`;

			let hasInner = false;

			if (tc.failure) {
				const failures = Array.isArray(tc.failure) ? tc.failure : [tc.failure];
				for (const failure of failures) {
					const msg = failure.message || "";
					const body = getTextContent(failure);
					output += `\n      <failure message="${escapeXml(msg)}">${escapeXml(body)}</failure>`;
					hasInner = true;
				}
			}

			if (tc.error) {
				const errors = Array.isArray(tc.error) ? tc.error : [tc.error];
				for (const error of errors) {
					const msg = error.message || "";
					const body = getTextContent(error);
					output += `\n      <error message="${escapeXml(msg)}">${escapeXml(body)}</error>`;
					hasInner = true;
				}
			}

			if (tc.skipped !== undefined) {
				const skippeds = Array.isArray(tc.skipped) ? tc.skipped : [tc.skipped];
				for (const skipped of skippeds) {
					let msg = "skipped";
					if (typeof skipped === "object" && skipped !== null) {
						msg = skipped.message || "skipped";
					}
					output += `\n      <skipped message="${escapeXml(msg)}"/>`;
					hasInner = true;
				}
			}

			if (hasInner) {
				output += "\n    ";
			}

			output += "</testCase>\n";
		}

		output += "  </file>\n";
	}

	output += "</testExecutions>";

	fs.writeFileSync(outputFile, output);
	console.log(`Converted ${inputFile} -> ${outputFile}`);
}

const [, , inputFile, outputFile] = process.argv;
if (!inputFile || !outputFile) {
	console.error(
		"Usage: node convert-junit-to-sonar.cjs <input-junit.xml> <output-sonar.xml>",
	);
	process.exit(1);
}

convertJUnitToSonar(inputFile, outputFile);
