




































































































































































































































































































































































































































































































			expect(result.stdout).toContain(inputPath);
			expect(result.stdout).toContain(outputPath);
		});

		it("overwrites existing output file on repeated conversion", () => {
			// First run
			const input1 = `
        <testsuite name="suite_one" tests="1" time="0.1">
          <testcase name="first_run" time="0.1"></testcase>
        </testsuite>
      `;
			writeFileSync(inputPath, input1, "utf-8");
			spawnSync("node", [SCRIPT_PATH, inputPath, outputPath], {
				encoding: "utf-8",
			});
			const firstOutput = readFileSync(outputPath, "utf-8");
			expect(firstOutput).toContain("first_run");

			// Second run with different content
			const input2 = `
        <testsuite name="suite_two" tests="1" time="0.2">
          <testcase name="second_run" time="0.2"></testcase>
        </testsuite>
      `;
			writeFileSync(inputPath, input2, "utf-8");
			spawnSync("node", [SCRIPT_PATH, inputPath, outputPath], {
				encoding: "utf-8",
			});
			const secondOutput = readFileSync(outputPath, "utf-8");
			expect(secondOutput).toContain("second_run");
			expect(secondOutput).not.toContain("first_run");
		});

		it("handles testsuite with both passing and failing tests", () => {
			const input = `
        <testsuite name="mixed_suite" tests="3" failures="1" errors="1" time="0.6">
          <testcase name="passes" time="0.1"></testcase>
          <testcase name="fails" time="0.2">
            <failure message="assertion failed">details</failure>
          </testcase>
          <testcase name="errors" time="0.3">
            <error message="panicked">stack trace</error>
          </testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			expect(output).toContain('<testCase name="passes"');
			expect(output).toContain('<testCase name="fails"');
			expect(output).toContain('<failure message="assertion failed">');
			expect(output).toContain('<testCase name="errors"');
			expect(output).toContain('<error message="panicked">');
		});

		it("does not capture failure element without message attribute (known limitation)", () => {
			// The failure regex requires message="..." attribute.
			// A <failure> without message is not matched and the test appears to pass.
			const input = `
        <testsuite name="suite" tests="1" failures="1" time="0.1">
          <testcase name="no_msg_failure" time="0.1">
            <failure>some failure body without message attr</failure>
          </testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			// The failure regex requires message attribute, so this testCase
			// will be emitted as if it passed (no <failure> child in output)
			expect(output).toContain('<testCase name="no_msg_failure"');
			expect(output).not.toContain("<failure");
		});

		it("does not capture self-closing skipped tag (known limitation)", () => {
			// The skipped regex requires a closing </skipped> tag.
			// <skipped/> self-closing form is not matched.
			const input = `
        <testsuite name="suite" tests="1" skipped="1" time="0.0">
          <testcase name="self_closing_skip" time="0.0">
            <skipped/>
          </testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			// Self-closing <skipped/> is not matched by the regex, so the
			// test appears as passing in output (no <skipped> child)
			expect(output).toContain('<testCase name="self_closing_skip"');
			expect(output).not.toContain("<skipped");
		});

		it("captures both failure and error when both appear in same testcase", () => {
			// Both failure and error regexes are checked independently
			const input = `
        <testsuite name="suite" tests="1" time="0.5">
          <testcase name="double_trouble" time="0.5">
            <failure message="failed assertion">assertion body</failure>
            <error message="runtime error">error body</error>
          </testcase>
        </testsuite>
      `;
			const output = runConverter(input);

			expect(output).toContain('<failure message="failed assertion">');
			expect(output).toContain("assertion body");
			expect(output).toContain('<error message="runtime error">');
			expect(output).toContain("error body");
		});
	});
});
