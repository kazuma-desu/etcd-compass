import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useKeysStore } from "@/features/keys/keys-store";
import {
	formatShortcut,
	shortcuts,
	useTabShortcuts,
} from "./use-keyboard-shortcuts";

describe("Keyboard Shortcuts", () => {
	const mockRefreshKeys = vi.fn();
	const mockSetShowDeleteDialog = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		useKeysStore.setState({
			selectedKey: null,
			refreshKeys: mockRefreshKeys,
			setShowDeleteDialog: mockSetShowDeleteDialog,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Constants", () => {
		it("should format shortcuts correctly", () => {
			expect(formatShortcut("r", true, false)).toContain("r");
			expect(formatShortcut("d", true, true)).toContain("Shift");
			expect(formatShortcut("Delete", false, false)).toContain("Del");
		});
	});

	describe("Shortcuts List", () => {
		it("should have all expected shortcuts", () => {
			const shortcutKeys = shortcuts.map((s) => s.key);

			expect(shortcutKeys).toContain("n");
			expect(shortcutKeys).toContain("r");
			expect(shortcutKeys).toContain("f");
			expect(shortcutKeys).toContain("t");
			expect(shortcutKeys).toContain("w");
			expect(shortcutKeys).toContain(",");
			expect(shortcutKeys).toContain("d");
			expect(shortcutKeys).toContain("Delete");
			expect(shortcutKeys).toContain("]");
			expect(shortcutKeys).toContain("[");
			expect(shortcutKeys).toContain("?");
		});

		it("should have correct descriptions", () => {
			const refreshShortcut = shortcuts.find(
				(s) => s.key === "r" && s.modifier,
			);
			expect(refreshShortcut?.description).toBe("Refresh keys");

			const searchShortcut = shortcuts.find((s) => s.key === "f");
			expect(searchShortcut?.description).toBe("Focus search/filter");
		});

		it("should identify modifier shortcuts", () => {
			const modShortcuts = shortcuts.filter((s) => s.modifier);
			expect(modShortcuts.length).toBeGreaterThan(0);
		});
	});

	describe("useTabShortcuts", () => {
		it("should select next tab", () => {
			const onSelectTab = vi.fn();
			const onCloseTab = vi.fn();

			const tabs = [
				{ id: "tab1", endpoint: "server1" },
				{ id: "tab2", endpoint: "server2" },
				{ id: "tab3", endpoint: "server3" },
			];

			renderHook(() => useTabShortcuts(tabs, "tab1", onSelectTab, onCloseTab));

			act(() => {
				window.dispatchEvent(new CustomEvent("etcd:next-tab"));
			});

			expect(onSelectTab).toHaveBeenCalledWith("tab2");
		});

		it("should wrap to first tab from last", () => {
			const onSelectTab = vi.fn();
			const onCloseTab = vi.fn();

			const tabs = [
				{ id: "tab1", endpoint: "server1" },
				{ id: "tab2", endpoint: "server2" },
			];

			renderHook(() => useTabShortcuts(tabs, "tab2", onSelectTab, onCloseTab));

			act(() => {
				window.dispatchEvent(new CustomEvent("etcd:next-tab"));
			});

			expect(onSelectTab).toHaveBeenCalledWith("tab1");
		});

		it("should select previous tab", () => {
			const onSelectTab = vi.fn();
			const onCloseTab = vi.fn();

			const tabs = [
				{ id: "tab1", endpoint: "server1" },
				{ id: "tab2", endpoint: "server2" },
			];

			renderHook(() => useTabShortcuts(tabs, "tab2", onSelectTab, onCloseTab));

			act(() => {
				window.dispatchEvent(new CustomEvent("etcd:prev-tab"));
			});

			expect(onSelectTab).toHaveBeenCalledWith("tab1");
		});

		it("should wrap to last tab from first", () => {
			const onSelectTab = vi.fn();
			const onCloseTab = vi.fn();

			const tabs = [
				{ id: "tab1", endpoint: "server1" },
				{ id: "tab2", endpoint: "server2" },
			];

			renderHook(() => useTabShortcuts(tabs, "tab1", onSelectTab, onCloseTab));

			act(() => {
				window.dispatchEvent(new CustomEvent("etcd:prev-tab"));
			});

			expect(onSelectTab).toHaveBeenCalledWith("tab2");
		});

		it("should close current tab", () => {
			const onSelectTab = vi.fn();
			const onCloseTab = vi.fn();

			const tabs = [
				{ id: "tab1", endpoint: "server1" },
				{ id: "tab2", endpoint: "server2" },
			];

			renderHook(() => useTabShortcuts(tabs, "tab1", onSelectTab, onCloseTab));

			act(() => {
				window.dispatchEvent(new CustomEvent("etcd:close-tab"));
			});

			expect(onCloseTab).toHaveBeenCalledWith("tab1");
		});

		it("should not switch tabs when only one tab exists", () => {
			const onSelectTab = vi.fn();
			const onCloseTab = vi.fn();

			const tabs = [{ id: "tab1", endpoint: "server1" }];

			renderHook(() => useTabShortcuts(tabs, "tab1", onSelectTab, onCloseTab));

			act(() => {
				window.dispatchEvent(new CustomEvent("etcd:next-tab"));
			});

			expect(onSelectTab).not.toHaveBeenCalled();
		});
	});
});
