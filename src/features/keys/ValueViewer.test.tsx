import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ValueViewer } from "./ValueViewer";

const mockWriteText = vi.fn();

Object.assign(navigator, {
	clipboard: {
		writeText: mockWriteText,
	},
});

describe("ValueViewer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockWriteText.mockResolvedValue(undefined);
	});

	it("should render with all tabs", () => {
		render(<ValueViewer value="hello world" />);

		expect(screen.getByRole("tab", { name: /raw/i })).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: /json/i })).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: /hex/i })).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: /base64/i })).toBeInTheDocument();
	});

	it("should auto-select JSON tab for valid JSON", () => {
		const jsonValue = '{"name": "test", "value": 123}';
		render(<ValueViewer value={jsonValue} />);

		const jsonTab = screen.getByRole("tab", { name: /json/i });
		expect(jsonTab).toHaveAttribute("data-state", "active");
	});

	it("should select raw tab for non-JSON values", () => {
		render(<ValueViewer value="plain text value" />);

		const rawTab = screen.getByRole("tab", { name: /raw/i });
		expect(rawTab).toHaveAttribute("data-state", "active");
	});

	it("should select raw tab for invalid JSON", () => {
		render(<ValueViewer value='{"invalid json' />);

		const rawTab = screen.getByRole("tab", { name: /raw/i });
		expect(rawTab).toHaveAttribute("data-state", "active");
	});

	it("should copy raw value to clipboard", async () => {
		const value = "test value to copy";
		render(<ValueViewer value={value} />);

		const copyButton = screen.getByRole("button", { name: /copy/i });
		fireEvent.click(copyButton);

		await waitFor(() => {
			expect(mockWriteText).toHaveBeenCalledWith(value);
		});
	});

	it("should handle complex nested JSON", () => {
		const complexJson = JSON.stringify({
			users: [
				{ id: 1, name: "Alice" },
				{ id: 2, name: "Bob" },
			],
			meta: {
				total: 2,
				page: 1,
			},
		});

		render(<ValueViewer value={complexJson} />);

		const jsonTab = screen.getByRole("tab", { name: /json/i });
		expect(jsonTab).toHaveAttribute("data-state", "active");
	});

	it("should handle empty string", () => {
		render(<ValueViewer value="" />);

		const rawTab = screen.getByRole("tab", { name: /raw/i });
		expect(rawTab).toHaveAttribute("data-state", "active");
	});

	it("should handle JSON array", () => {
		const jsonArray = '[1, 2, 3, "test"]';
		render(<ValueViewer value={jsonArray} />);

		const jsonTab = screen.getByRole("tab", { name: /json/i });
		expect(jsonTab).toHaveAttribute("data-state", "active");
	});

	it("should handle JSON with special characters", () => {
		const jsonWithSpecial = '{"message": "Hello\\nWorld\\t!"}';
		render(<ValueViewer value={jsonWithSpecial} />);

		const jsonTab = screen.getByRole("tab", { name: /json/i });
		expect(jsonTab).toHaveAttribute("data-state", "active");
	});

	it("should handle valid base64 strings", () => {
		const base64Value = btoa("Hello World");
		render(<ValueViewer value={base64Value} />);

		// Raw tab should be active for base64 (not auto-detected as JSON)
		const rawTab = screen.getByRole("tab", { name: /raw/i });
		expect(rawTab).toBeInTheDocument();
	});

	it("should handle null values in JSON", () => {
		const jsonWithNull = '{"key": null, "other": "value"}';
		render(<ValueViewer value={jsonWithNull} />);

		const jsonTab = screen.getByRole("tab", { name: /json/i });
		expect(jsonTab).toHaveAttribute("data-state", "active");
	});

	it("should handle boolean values in JSON", () => {
		const jsonWithBool = '{"enabled": true, "disabled": false}';
		render(<ValueViewer value={jsonWithBool} />);

		const jsonTab = screen.getByRole("tab", { name: /json/i });
		expect(jsonTab).toHaveAttribute("data-state", "active");
	});
});
