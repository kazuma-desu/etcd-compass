#!/usr/bin/env node

/**
 * Convert JUnit XML test reports to SonarQube generic test execution format.
 *
 * Usage:
 *   node convert-junit-to-sonar.cjs <input-junit.xml> <output-sonar.xml>
 */

const fs = require("node:fs");

function escapeXml(str) {
	if (!str) return "";
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function convertJUnitToSonar(inputFile, outputFile) {
	const xml = fs.readFileSync(inputFile, "utf-8");

	let output = '<?xml version="1.0" encoding="UTF-8"?>\n';
	output += '<testExecutions version="1">\n';

	// Match each <testsuite> block (use \b to avoid matching "hostname" instead of "name")
	const testsuiteRegex =
		/<testsuite\s+[^>]*\bname="([^"]*)"[^>]*>([\s\S]*?)<\/testsuite>/g;

	for (const suiteMatch of xml.matchAll(testsuiteRegex)) {
		const suiteName = suiteMatch[1];
		const suiteContent = suiteMatch[2];

		output += `  <file path="${escapeXml(suiteName)}">\n`;

		// Match each <testcase> inside this testsuite
		const testcaseRegex =
			/<testcase\s+[^>]*name="([^"]*)"[^>]*time="([^"]*)"[^>]*>([\s\S]*?)<\/testcase>/g;

		for (const tcMatch of suiteContent.matchAll(testcaseRegex)) {
			const name = tcMatch[1];
			const time = parseFloat(tcMatch[2]);
			const duration = Math.round(time * 1000);
			const innerContent = tcMatch[3].trim();

			output += `    <testCase name="${escapeXml(name)}" duration="${duration}">`;

			if (innerContent) {
				let hasInner = false;

				// Check for <failure message="...">...</failure>
				const failureMatch = innerContent.match(
					/<failure\s+(?:[^>]*\s+)?message="([^"]*)"[^>]*>([\s\S]*?)<\/failure>/,
				);
				if (failureMatch) {
					const msg = failureMatch[1];
					const body = failureMatch[2].trim();
					output += `\n      <failure message="${escapeXml(msg)}">${escapeXml(body)}</failure>`;
					hasInner = true;
				}

				// Check for <error message="...">...</error>
				const errorMatch = innerContent.match(
					/<error\s+(?:[^>]*\s+)?message="([^"]*)"[^>]*>([\s\S]*?)<\/error>/,
				);
				if (errorMatch) {
					const msg = errorMatch[1];
					const body = errorMatch[2].trim();
					output += `\n      <error message="${escapeXml(msg)}">${escapeXml(body)}</error>`;
					hasInner = true;
				}

				// Check for <skipped message="..."/> or <skipped>...</skipped>
				const skippedMatch = innerContent.match(
					/<skipped\s*(?:message="([^"]*)")?[^>]*>(?:[\s\S]*?)<\/skipped>/,
				);
				if (skippedMatch) {
					const msg = skippedMatch[1] || "skipped";
					output += `\n      <skipped message="${escapeXml(msg)}"/>`;
					hasInner = true;
				}

				if (hasInner) {
					output += "\n    ";
				}
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
