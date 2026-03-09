import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QueryBar } from "./QueryBar";

describe("QueryBar", () => {
	it('should render the placeholder "Search by prefix, e.g. /config/"', () => {
		render(<QueryBar />);

		const input = screen.getByPlaceholderText(
			"Search by prefix, e.g. /config/",
		);
		expect(input).toBeInTheDocument();
	});

	it("should render action buttons", () => {
		render(<QueryBar />);

		expect(screen.getByText("ADD KEY")).toBeInTheDocument();
		expect(screen.getByText("REFRESH")).toBeInTheDocument();
		expect(screen.getByText("IMPORT")).toBeInTheDocument();
		expect(screen.getByText("EXPORT")).toBeInTheDocument();
	});

	it("should render view mode toggle tabs", () => {
		render(<QueryBar />);

		expect(screen.getByText("Flat")).toBeInTheDocument();
		expect(screen.getByText("Tree")).toBeInTheDocument();
	});

	it("should show key count badge", () => {
		render(<QueryBar />);

		expect(screen.getByText("0 keys")).toBeInTheDocument();
	});

	it("should render Apply button", () => {
		render(<QueryBar />);

		expect(screen.getByRole("button", { name: /apply/i })).toBeInTheDocument();
	});
});
