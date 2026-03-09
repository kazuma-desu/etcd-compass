import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EtcdKey } from "@/commands/types";
import { FlatView } from "./FlatView";
import { useKeysStore } from "./keys-store";

describe("FlatView", () => {
	beforeEach(() => {
		useKeysStore.setState({
			selectedKey: null,
			selectedKeys: new Set(),
		});
		vi.clearAllMocks();
	});

	const makeKey = (key: string, value: string): EtcdKey => ({
		key,
		value,
		version: 1,
		create_revision: 1,
		mod_revision: 1,
		lease: 0,
	});

	it("should render empty state when no keys provided", () => {
		render(<FlatView keys={[]} />);
		expect(screen.getByText("No keys found")).toBeInTheDocument();
	});

	it("should render key names and values", () => {
		const keys = [
			makeKey("/config/db", "localhost:5432"),
			makeKey("/config/cache", "redis://localhost"),
		];
		render(<FlatView keys={keys} />);

		expect(screen.getByText("/config/db")).toBeInTheDocument();
		expect(screen.getByText("localhost:5432")).toBeInTheDocument();
		expect(screen.getByText("/config/cache")).toBeInTheDocument();
		expect(screen.getByText("redis://localhost")).toBeInTheDocument();
	});

	it("should render gradient overlay for value preview", () => {
		const keys = [makeKey("/key", "some value")];
		const { container } = render(<FlatView keys={keys} />);

		const gradient = container.querySelector(".bg-gradient-to-t");
		expect(gradient).toBeInTheDocument();
		expect(gradient).toHaveClass("pointer-events-none");
	});

	it("should render value in a pre element with whitespace-pre-wrap", () => {
		const keys = [makeKey("/key", "line1\nline2")];
		const { container } = render(<FlatView keys={keys} />);

		const pre = container.querySelector("pre");
		expect(pre).toBeInTheDocument();
		expect(pre).toHaveClass("whitespace-pre-wrap");
		expect(pre).not.toHaveClass("text-ellipsis");
	});

	it("should select a key when clicked", () => {
		const keys = [makeKey("/config/db", "localhost:5432")];
		render(<FlatView keys={keys} />);

		const card = screen
			.getByText("/config/db")
			.closest("[class*='border rounded-lg']");
		expect(card).toBeTruthy();
		if (card) fireEvent.click(card);

		const state = useKeysStore.getState();
		expect(state.selectedKey).toEqual(keys[0]);
	});

	it("should highlight the selected key", () => {
		const keys = [makeKey("/key1", "val1"), makeKey("/key2", "val2")];
		useKeysStore.setState({ selectedKey: keys[0] });

		const { container } = render(<FlatView keys={keys} />);

		const cards = container.querySelectorAll("[class*='border rounded-lg']");
		expect(cards[0]).toHaveClass("ring-1");
		expect(cards[1]).not.toHaveClass("ring-1");
	});

	it("should render checkboxes for bulk selection", () => {
		const keys = [makeKey("/key1", "val1")];
		render(<FlatView keys={keys} />);

		const checkbox = screen.getByRole("checkbox", { name: /select \/key1/i });
		expect(checkbox).toBeInTheDocument();
	});

	it("should toggle bulk selection on checkbox click", () => {
		const keys = [makeKey("/key1", "val1")];
		render(<FlatView keys={keys} />);

		const checkbox = screen.getByRole("checkbox", { name: /select \/key1/i });
		fireEvent.click(checkbox);

		const state = useKeysStore.getState();
		expect(state.selectedKeys.has("/key1")).toBe(true);
	});

	it("should select a key when Enter is pressed", () => {
		const keys = [makeKey("/config/db", "localhost:5432")];
		render(<FlatView keys={keys} />);

		const card = screen
			.getByText("/config/db")
			.closest("[class*='border rounded-lg']");
		expect(card).toBeTruthy();
		if (card) fireEvent.keyDown(card, { key: "Enter" });

		const state = useKeysStore.getState();
		expect(state.selectedKey).toEqual(keys[0]);
	});

	it("should select a key when Space is pressed", () => {
		const keys = [makeKey("/config/db", "localhost:5432")];
		render(<FlatView keys={keys} />);

		const card = screen
			.getByText("/config/db")
			.closest("[class*='border rounded-lg']");
		expect(card).toBeTruthy();
		if (card) fireEvent.keyDown(card, { key: " " });

		const state = useKeysStore.getState();
		expect(state.selectedKey).toEqual(keys[0]);
	});

	it("should have role button and aria-pressed on key cards", () => {
		const keys = [makeKey("/key1", "val1")];
		useKeysStore.setState({ selectedKey: null });
		render(<FlatView keys={keys} />);

		const card = screen.getByText("/key1").closest("[role='button']");
		expect(card).toBeTruthy();
		if (card) {
			expect(card).toHaveAttribute("aria-pressed", "false");
		}
	});
});
