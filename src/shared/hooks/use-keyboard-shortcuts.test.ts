import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useKeysStore } from "@/features/keys/keys-store";
import {
	formatShortcut,
	shortcuts,
	useKeyboardShortcuts,
	useTabShortcuts,
} from "./use-keyboard-shortcuts";

// =============================================================================
// REGRESSION TEST: Module-Level navigator.platform Crash (Bug #2)
// =============================================================================
// Bug: `navigator.platform` was accessed at module load time without safety
// checks. In test environments, SSR contexts, or some Tauri webviews where
// navigator or navigator.platform is undefined, this caused an immediate crash.
// Fix: Wrapped navigator access in a safe function with optional chaining and
// a fallback to false.
//
// The regression tests below ("safe navigator.platform access") verify that
// importing the module does not crash when navigator is missing or incomplete.
// =============================================================================

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
			expect(shortcutKeys).toContain("k");
			expect(shortcutKeys).toContain("w");
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

	describe("Regression: safe navigator.platform access", () => {
		it("should not crash when navigator.platform is undefined", async () => {
			const originalNavigator = globalThis.navigator;

			try {
				globalThis.navigator = {} as Navigator;

				vi.resetModules();

				const mod = await import("./use-keyboard-shortcuts");
				expect(mod.getIsMac()).toBe(false);
				expect(mod.modifierKey).toBe("Ctrl");
			} finally {
				globalThis.navigator = originalNavigator;
			}
		});

		it("should not crash when navigator is undefined", async () => {
			const originalNavigator = globalThis.navigator;

			try {
				// @ts-expect-error - intentionally removing navigator for test
				globalThis.navigator = undefined;

				vi.resetModules();

				const mod = await import("./use-keyboard-shortcuts");
				expect(mod.getIsMac()).toBe(false);
				expect(mod.modifierKey).toBe("Ctrl");
			} finally {
				globalThis.navigator = originalNavigator;
			}
		});
	});

	describe("useKeyboardShortcuts", () => {
		it("should fire refresh shortcut when no dialog is open", () => {
			useKeysStore.setState({
				selectedKey: null,
				refreshKeys: mockRefreshKeys,
				setShowDeleteDialog: mockSetShowDeleteDialog,
			});

			const showHelp = vi.fn();
			renderHook(() => useKeyboardShortcuts("conn1", showHelp));

			act(() => {
				window.dispatchEvent(
					new KeyboardEvent("keydown", { key: "r", ctrlKey: true }),
				);
			});

			expect(mockRefreshKeys).toHaveBeenCalledWith("conn1");
		});

		it("should NOT fire shortcuts when a dialog is open", () => {
			useKeysStore.setState({
				selectedKey: {
					key: "test",
					value: "val",
					version: 1,
					create_revision: 1,
					mod_revision: 1,
					lease: 0,
				},
				refreshKeys: mockRefreshKeys,
				setShowDeleteDialog: mockSetShowDeleteDialog,
			});

			const showHelp = vi.fn();
			const { result } = renderHook(() =>
				useKeyboardShortcuts("conn1", showHelp),
			);

			// Open a dialog
			act(() => {
				result.current.setDialogOpen(true);
			});

			// Try refresh shortcut - should not fire
			act(() => {
				window.dispatchEvent(
					new KeyboardEvent("keydown", { key: "r", ctrlKey: true }),
				);
			});
			expect(mockRefreshKeys).not.toHaveBeenCalled();

			// Try delete shortcut - should not fire
			act(() => {
				window.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete" }));
			});
			expect(mockSetShowDeleteDialog).not.toHaveBeenCalled();
		});

		it("should resume firing shortcuts after dialog closes", () => {
			useKeysStore.setState({
				selectedKey: null,
				refreshKeys: mockRefreshKeys,
				setShowDeleteDialog: mockSetShowDeleteDialog,
			});

			const showHelp = vi.fn();
			const { result } = renderHook(() =>
				useKeyboardShortcuts("conn1", showHelp),
			);

			// Open then close dialog
			act(() => {
				result.current.setDialogOpen(true);
				result.current.setDialogOpen(false);
			});

			// Refresh should work again
			act(() => {
				window.dispatchEvent(
					new KeyboardEvent("keydown", { key: "r", ctrlKey: true }),
				);
			});
			expect(mockRefreshKeys).toHaveBeenCalledWith("conn1");
		});

		it("should dispatch command palette event on Cmd+K", () => {
			const showHelp = vi.fn();
			renderHook(() => useKeyboardShortcuts("conn1", showHelp));

			const listener = vi.fn();
			window.addEventListener("etcd:command-palette", listener);

			act(() => {
				window.dispatchEvent(
					new KeyboardEvent("keydown", { key: "k", ctrlKey: true }),
				);
			});

			expect(listener).toHaveBeenCalled();
			window.removeEventListener("etcd:command-palette", listener);
		});
	});
});
