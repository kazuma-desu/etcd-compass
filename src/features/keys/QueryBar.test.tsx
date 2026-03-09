import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useKeysStore } from "./keys-store";
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

	it("should sync prefixInput to searchQuery when Apply is clicked", async () => {
		render(<QueryBar />);

		fireEvent.change(
			screen.getByPlaceholderText("Search by prefix, e.g. /config/"),
			{ target: { value: "/myprefix/" } },
		);
		fireEvent.click(screen.getByRole("button", { name: /apply/i }));

		await waitFor(() =>
			expect(useKeysStore.getState().searchQuery).toBe("/myprefix/"),
		);
	});
	describe("with connectionId", () => {
		beforeEach(() => {
			useKeysStore.setState({
				searchQuery: "",
				rangeStart: "",
				rangeEnd: "",
				recentQueries: [],
			});
		});

		it("should call refreshKeys when Apply is clicked with connectionId", async () => {
			const refreshKeysSpy = vi.spyOn(useKeysStore.getState(), "refreshKeys");
			render(<QueryBar connectionId="test-uuid" />);

			fireEvent.change(
				screen.getByPlaceholderText("Search by prefix, e.g. /config/"),
				{ target: { value: "/prefix/" } },
			);
			fireEvent.click(screen.getByRole("button", { name: /apply/i }));

			await waitFor(() => {
				expect(refreshKeysSpy).toHaveBeenCalledWith("test-uuid");
			});
			refreshKeysSpy.mockRestore();
		});

		it("should call refreshKeys on Refresh button click with connectionId", () => {
			const refreshKeysSpy = vi.spyOn(useKeysStore.getState(), "refreshKeys");
			render(<QueryBar connectionId="test-uuid" />);

			fireEvent.click(screen.getByText("REFRESH"));

			expect(refreshKeysSpy).toHaveBeenCalledWith("test-uuid");
			refreshKeysSpy.mockRestore();
		});

		it("should show and handle Reset button when filters are active", async () => {
			const refreshKeysSpy = vi.spyOn(useKeysStore.getState(), "refreshKeys");
			render(<QueryBar connectionId="test-uuid" />);

			// Type in the search input to activate filters
			fireEvent.change(
				screen.getByPlaceholderText("Search by prefix, e.g. /config/"),
				{ target: { value: "/active/" } },
			);

			// Reset button should appear
			await waitFor(() => {
				expect(screen.getByText("Reset")).toBeInTheDocument();
			});

			// Click Reset
			fireEvent.click(screen.getByText("Reset"));

			await waitFor(() => {
				expect(useKeysStore.getState().searchQuery).toBe("");
			});
			expect(refreshKeysSpy).toHaveBeenCalledWith("test-uuid");
			refreshKeysSpy.mockRestore();
		});
	});
});
