import { useCallback, useEffect, useRef } from "react";
import { useKeysStore } from "@/features/keys/keys-store";

export const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
export const modifierKey = isMac ? "Cmd" : "Ctrl";

export type Shortcut = {
	key: string;
	modifier: boolean;
	shift?: boolean;
	description: string;
	category: "navigation" | "actions" | "interface";
};

export const shortcuts: Shortcut[] = [
	{
		key: "n",
		modifier: true,
		description: "New connection",
		category: "navigation",
	},
	{
		key: "r",
		modifier: true,
		description: "Refresh keys",
		category: "actions",
	},
	{
		key: "f",
		modifier: true,
		description: "Focus search/filter",
		category: "actions",
	},
	{
		key: "k",
		modifier: true,
		description: "Open command palette",
		category: "navigation",
	},
	{ key: "t", modifier: true, description: "New tab", category: "navigation" },
	{
		key: "w",
		modifier: true,
		description: "Close current tab",
		category: "navigation",
	},
	{
		key: ",",
		modifier: true,
		description: "Open settings",
		category: "interface",
	},
	{
		key: "d",
		modifier: true,
		shift: true,
		description: "Toggle sidebar",
		category: "interface",
	},
	{
		key: "Delete",
		modifier: false,
		description: "Delete selected key",
		category: "actions",
	},
	{
		key: "]",
		modifier: true,
		shift: true,
		description: "Next tab",
		category: "navigation",
	},
	{
		key: "[",
		modifier: true,
		shift: true,
		description: "Previous tab",
		category: "navigation",
	},
	{
		key: "?",
		modifier: true,
		description: "Show shortcut help",
		category: "interface",
	},
];

export function formatShortcut(
	key: string,
	modifier = true,
	shift = false,
): string {
	const parts: string[] = [];
	if (modifier) parts.push(modifierKey);
	if (shift) parts.push("Shift");
	parts.push(key === "Delete" ? "Del" : key);
	return parts.join(" + ");
}

export type ShowHelpCallback = () => void;

export function useKeyboardShortcuts(
	connectionId: string | null,
	showHelpCallback: ShowHelpCallback,
	toggleSidebar?: () => void,
	searchInputRef?: React.RefObject<HTMLInputElement | null>,
) {
	const { refreshKeys, setShowDeleteDialog, selectedKey } = useKeysStore();

	const dialogOpenRef = useRef(false);

	const setDialogOpen = useCallback((open: boolean) => {
		dialogOpenRef.current = open;
	}, []);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			const isCmd = e.metaKey || e.ctrlKey;
			const isShift = e.shiftKey;

			const target = e.target as HTMLElement;
			const isInputElement =
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable;

			if (isCmd && e.key === "?") {
				e.preventDefault();
				showHelpCallback();
				return;
			}

			if (isCmd && e.key.toLowerCase() === "f") {
				e.preventDefault();
				if (searchInputRef?.current) {
					searchInputRef.current.focus();
					searchInputRef.current.select();
				}
				return;
			}

			if (isInputElement || dialogOpenRef.current) return;

			switch (true) {
				case isCmd && e.key.toLowerCase() === "n":
					e.preventDefault();
					window.dispatchEvent(new CustomEvent("etcd:new-connection"));
					break;

				case isCmd && e.key.toLowerCase() === "k":
					e.preventDefault();
					window.dispatchEvent(new CustomEvent("etcd:command-palette"));
					break;

				case isCmd && e.key.toLowerCase() === "r":
					e.preventDefault();
					if (connectionId) {
						refreshKeys(connectionId);
					}
					break;

				case isCmd && e.key.toLowerCase() === "t":
					e.preventDefault();
					window.dispatchEvent(new CustomEvent("etcd:new-tab"));
					break;

				case isCmd && e.key.toLowerCase() === "w":
					e.preventDefault();
					window.dispatchEvent(new CustomEvent("etcd:close-tab"));
					break;

				case isCmd && e.key === ",":
					e.preventDefault();
					window.dispatchEvent(new CustomEvent("etcd:open-settings"));
					break;

				case isCmd && isShift && e.key.toLowerCase() === "d":
					e.preventDefault();
					toggleSidebar?.();
					break;

				case e.key === "Delete":
					if (selectedKey) {
						e.preventDefault();
						setShowDeleteDialog(true);
					}
					break;

				case isCmd && isShift && e.key === "]":
					e.preventDefault();
					window.dispatchEvent(new CustomEvent("etcd:next-tab"));
					break;

				case isCmd && isShift && e.key === "[":
					e.preventDefault();
					window.dispatchEvent(new CustomEvent("etcd:prev-tab"));
					break;
			}
		},
		[
			connectionId,
			refreshKeys,
			setShowDeleteDialog,
			selectedKey,
			showHelpCallback,
			toggleSidebar,
			searchInputRef,
		],
	);

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleKeyDown]);

	return { setDialogOpen };
}

export function useTabShortcuts(
	tabs: { id: string; endpoint: string }[],
	activeTabId: string | null,
	onSelectTab: (id: string) => void,
	onCloseTab: (id: string) => void,
) {
	useEffect(() => {
		const handleNextTab = () => {
			if (!activeTabId || tabs.length <= 1) return;
			const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
			const nextIndex = (currentIndex + 1) % tabs.length;
			onSelectTab(tabs[nextIndex].id);
		};

		const handlePrevTab = () => {
			if (!activeTabId || tabs.length <= 1) return;
			const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
			const prevIndex = currentIndex <= 0 ? tabs.length - 1 : currentIndex - 1;
			onSelectTab(tabs[prevIndex].id);
		};

		const handleCloseTab = () => {
			if (activeTabId) {
				onCloseTab(activeTabId);
			}
		};

		window.addEventListener("etcd:next-tab", handleNextTab);
		window.addEventListener("etcd:prev-tab", handlePrevTab);
		window.addEventListener("etcd:close-tab", handleCloseTab);

		return () => {
			window.removeEventListener("etcd:next-tab", handleNextTab);
			window.removeEventListener("etcd:prev-tab", handlePrevTab);
			window.removeEventListener("etcd:close-tab", handleCloseTab);
		};
	}, [tabs, activeTabId, onSelectTab, onCloseTab]);
}
