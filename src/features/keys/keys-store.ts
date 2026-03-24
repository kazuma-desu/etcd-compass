import { toast } from "sonner";
import { create } from "zustand";
import { deleteKey, deleteKeys, getAllKeys, putKey } from "@/commands/keys";
import {
	openFileDialog,
	readFile,
	saveFileDialog,
	writeFile,
} from "@/commands/native";
import type { EtcdKey, TreeNode } from "@/commands/types";

function formatError(error: unknown): string {
	const errorStr = error instanceof Error ? error.message : String(error);

	if (
		errorStr.includes("transport error") ||
		errorStr.includes("Connection refused")
	) {
		return "Cannot connect to ETCD cluster. Please check if ETCD is running and the endpoint is correct.";
	}

	if (
		errorStr.includes("dns error") ||
		errorStr.includes("Name resolution failed")
	) {
		return "Cannot resolve ETCD host. Please check the endpoint address.";
	}

	if (errorStr.includes("timeout")) {
		return "Connection timed out. The ETCD cluster may be unreachable or overloaded.";
	}

	if (
		errorStr.toLowerCase().includes("tls") ||
		errorStr.toLowerCase().includes("certificate") ||
		errorStr.toLowerCase().includes("handshake")
	) {
		return "TLS/SSL error. If your cluster uses TLS, enable it and provide certificates. If not, ensure TLS is disabled in connection settings.";
	}

	if (
		errorStr.includes("authentication failed") ||
		errorStr.includes("invalid auth")
	) {
		return "Authentication failed. Please check your username and password.";
	}

	if (errorStr.includes("not found")) {
		return "The requested resource was not found.";
	}

	if (errorStr.includes("permission denied")) {
		return "Permission denied. You may not have access to this resource.";
	}

	return errorStr || "An unexpected error occurred";
}

const DEFAULT_PAGE_SIZE = 100;
export const PAGE_SIZE_OPTIONS = [25, 50, 100, 500];

export interface ExportImportKey {
	key: string;
	value: string;
	lease_id: string | null;
}

export interface Tab {
	key: string;
	scrollPosition: number;
}

export interface ExportData {
	keys: ExportImportKey[];
}

interface PaginationState {
	limit: number;
	currentPage: number;
	cursorHistory: string[];
	currentCursor: string | null;
	hasMore: boolean;
	totalLoaded: number;
}

interface ImportPreviewItem {
	key: string;
	value: string;
	lease_id: string | null;
	action: "create" | "update";
	existingValue?: string;
}

interface RecentQuery {
	id: string;
	searchQuery: string;
	rangeStart: string;
	rangeEnd: string;
	sortAscending: boolean;
	limit: number;
	timestamp: number;
}

interface KeysState {
	keys: EtcdKey[];
	selectedKey: EtcdKey | null;
	openTabs: Tab[];
	activeTab: string | null;
	searchQuery: string;
	viewMode: "flat" | "tree";
	isLoading: boolean;
	treeData: TreeNode[];
	expandedNodes: Set<string>;

	rangeStart: string;
	rangeEnd: string;
	sortAscending: boolean;
	recentQueries: RecentQuery[];

	pagination: PaginationState;

	showAddDialog: boolean;
	showEditDialog: boolean;
	showDeleteDialog: boolean;
	newKey: string;
	newValue: string;
	newKeyLeaseId: number | null;
	editValue: string;
	editKeyLeaseId: number | null;
	showExportDialog: boolean;
	showImportDialog: boolean;
	importPreviewData: ImportPreviewItem[];
	importProgress: number;
	isImporting: boolean;
	selectedKeysForExport: Set<string>;
	selectedKeys: Set<string>;
	bulkOperationProgress: number;
	isBulkOperationInProgress: boolean;
	showBulkDeleteDialog: boolean;

	setSearchQuery: (query: string) => void;
	setViewMode: (mode: "flat" | "tree") => void;
	setSelectedKey: (key: EtcdKey | null) => void;
	addTab: (key: string) => void;
	closeTab: (key: string) => void;
	setActiveTab: (key: string) => void;
	updateTabScroll: (key: string, scrollPosition: number) => void;
	setRangeStart: (start: string) => void;
	setRangeEnd: (end: string) => void;
	setSortAscending: (ascending: boolean) => void;
	addRecentQuery: () => void;
	loadRecentQuery: (query: RecentQuery) => void;
	toggleNode: (path: string) => void;
	expandAll: () => void;
	collapseAll: () => void;

	setShowAddDialog: (show: boolean) => void;
	setShowEditDialog: (show: boolean) => void;
	setShowDeleteDialog: (show: boolean) => void;
	setNewKey: (key: string) => void;
	setNewValue: (value: string) => void;
	setNewKeyLeaseId: (leaseId: number | null) => void;
	setEditValue: (value: string) => void;
	setEditKeyLeaseId: (leaseId: number | null) => void;

	setPageSize: (size: number) => void;
	goToNextPage: (connectionId: string) => Promise<void>;
	goToPrevPage: (connectionId: string) => Promise<void>;
	refreshKeys: (connectionId: string) => Promise<void>;
	loadPage: (
		connectionId: string,
		direction: "next" | "prev" | "refresh",
	) => Promise<void>;

	addKey: (connectionId: string, leaseId?: number) => Promise<void>;
	editKey: (connectionId: string, leaseId?: number) => Promise<void>;
	deleteKey: (connectionId: string) => Promise<void>;
	openEditDialog: () => void;
	getFilteredKeys: () => EtcdKey[];
	getPaginationInfo: () => { start: number; end: number; showingText: string };
	setShowExportDialog: (show: boolean) => void;
	setShowImportDialog: (show: boolean) => void;
	exportKeys: (connectionId: string, selectedOnly: boolean) => Promise<void>;
	importKeys: () => Promise<void>;
	executeImport: (connectionId: string) => Promise<void>;
	cancelImport: () => void;
	toggleKeySelection: (key: string) => void;
	selectAllKeysForExport: () => void;
	deselectAllKeysForExport: () => void;

	setShowBulkDeleteDialog: (show: boolean) => void;
	toggleKeySelectionForBulk: (key: string) => void;
	selectAllKeysOnPage: () => void;
	deselectAllKeys: () => void;
	deleteSelectedKeys: (connectionId: string) => Promise<void>;
	exportSelectedKeys: () => Promise<void>;
	getSelectedKeysCount: () => number;
	isKeySelected: (key: string) => boolean;
	areAllKeysOnPageSelected: () => boolean;
}

const buildTree = (
	flatKeys: EtcdKey[],
	expandedNodes: Set<string>,
): TreeNode[] => {
	const root: TreeNode[] = [];

	flatKeys.forEach((item) => {
		const parts = item.key.split("/").filter((p) => p);
		let current = root;
		let currentPath = "";

		parts.forEach((part, index) => {
			currentPath = currentPath ? `${currentPath}/${part}` : part;
			const isLast = index === parts.length - 1;

			let node = current.find((n) => n.name === part);
			if (!node) {
				node = {
					name: part,
					fullPath: currentPath,
					isLeaf: isLast,
					children: [],
					value: isLast ? item.value : undefined,
					expanded: expandedNodes.has(currentPath),
				};
				current.push(node);
			}

			if (!isLast) {
				current = node.children;
			}
		});
	});

	const sortNodes = (nodes: TreeNode[]) => {
		nodes.sort((a, b) => {
			if (a.isLeaf === b.isLeaf) {
				return a.name.localeCompare(b.name);
			}
			return a.isLeaf ? 1 : -1;
		});
		nodes.forEach((n) => {
			sortNodes(n.children);
		});
	};
	sortNodes(root);

	return root;
};

export const useKeysStore = create<KeysState>((set, get) => ({
	keys: [],
	selectedKey: null,
	openTabs: [],
	activeTab: null,
	searchQuery: "",
	viewMode: "flat",
	isLoading: false,
	treeData: [],
	expandedNodes: new Set(),

	rangeStart: "",
	rangeEnd: "",
	sortAscending: true,
	recentQueries: [],

	pagination: {
		limit: DEFAULT_PAGE_SIZE,
		currentPage: 1,
		cursorHistory: [],
		currentCursor: null,
		hasMore: false,
		totalLoaded: 0,
	},

	showAddDialog: false,
	showEditDialog: false,
	showDeleteDialog: false,
	newKey: "",
	newValue: "",
	newKeyLeaseId: null,
	editValue: "",
	editKeyLeaseId: null,
	showExportDialog: false,
	showImportDialog: false,
	importPreviewData: [],
	importProgress: 0,
	isImporting: false,
	selectedKeysForExport: new Set(),
	selectedKeys: new Set(),
	bulkOperationProgress: 0,
	isBulkOperationInProgress: false,
	showBulkDeleteDialog: false,

	setSearchQuery: (query) => set({ searchQuery: query }),
	setViewMode: (mode) => set({ viewMode: mode }),
	setSelectedKey: (key) => set({ selectedKey: key }),
	addTab: (key: string) => {
		const { openTabs } = get();
		if (!openTabs.find((t) => t.key === key)) {
			set({
				openTabs: [...openTabs, { key, scrollPosition: 0 }],
				activeTab: key,
			});
		} else {
			set({ activeTab: key });
		}
	},
	closeTab: (key: string) => {
		const { openTabs, activeTab } = get();
		const newTabs = openTabs.filter((t) => t.key !== key);
		let newActiveTab = activeTab;
		if (activeTab === key) {
			newActiveTab =
				newTabs.length > 0 ? newTabs[newTabs.length - 1].key : null;
		}
		set({ openTabs: newTabs, activeTab: newActiveTab });
	},
	setActiveTab: (key: string) => set({ activeTab: key }),
	updateTabScroll: (key: string, scrollPosition: number) => {
		const { openTabs } = get();
		set({
			openTabs: openTabs.map((t) =>
				t.key === key ? { ...t, scrollPosition } : t,
			),
		});
	},
	setRangeStart: (start: string) => set({ rangeStart: start }),
	setRangeEnd: (end: string) => set({ rangeEnd: end }),
	setSortAscending: (ascending: boolean) => set({ sortAscending: ascending }),
	addRecentQuery: () => {
		const {
			searchQuery,
			rangeStart,
			rangeEnd,
			sortAscending,
			pagination,
			recentQueries,
		} = get();
		const newQuery: RecentQuery = {
			id: Date.now().toString(),
			searchQuery,
			rangeStart,
			rangeEnd,
			sortAscending,
			limit: pagination.limit,
			timestamp: Date.now(),
		};
		set({
			recentQueries: [
				newQuery,
				...recentQueries.filter(
					(q) =>
						q.searchQuery !== searchQuery ||
						q.rangeStart !== rangeStart ||
						q.rangeEnd !== rangeEnd,
				),
			].slice(0, 20),
		});
	},
	loadRecentQuery: (query: RecentQuery) => {
		set({
			searchQuery: query.searchQuery,
			rangeStart: query.rangeStart,
			rangeEnd: query.rangeEnd,
			sortAscending: query.sortAscending,
			pagination: { ...get().pagination, limit: query.limit },
		});
	},

	toggleNode: (path) => {
		const { expandedNodes, keys } = get();
		const newExpanded = new Set(expandedNodes);
		if (newExpanded.has(path)) {
			newExpanded.delete(path);
		} else {
			newExpanded.add(path);
		}
		set({
			expandedNodes: newExpanded,
			treeData: buildTree(keys, newExpanded),
		});
	},

	expandAll: () => {
		const { keys } = get();
		const allPaths = new Set<string>();
		keys.forEach((k) => {
			const parts = k.key.split("/").filter((p) => p);
			let currentPath = "";
			parts.forEach((part, index) => {
				currentPath = currentPath ? `${currentPath}/${part}` : part;
				if (index < parts.length - 1) {
					allPaths.add(currentPath);
				}
			});
		});
		set({
			expandedNodes: allPaths,
			treeData: buildTree(keys, allPaths),
		});
	},

	collapseAll: () => {
		const { keys } = get();
		set({
			expandedNodes: new Set(),
			treeData: buildTree(keys, new Set()),
		});
	},

	setShowAddDialog: (show) => set({ showAddDialog: show }),
	setShowEditDialog: (show) => set({ showEditDialog: show }),
	setShowDeleteDialog: (show) => set({ showDeleteDialog: show }),
	setNewKey: (key) => set({ newKey: key }),
	setNewValue: (value) => set({ newValue: value }),
	setNewKeyLeaseId: (leaseId) => set({ newKeyLeaseId: leaseId }),
	setEditValue: (value) => set({ editValue: value }),
	setEditKeyLeaseId: (leaseId) => set({ editKeyLeaseId: leaseId }),

	setPageSize: (size: number) => {
		set((state) => ({
			pagination: {
				...state.pagination,
				limit: size,
				currentPage: 1,
				cursorHistory: [],
				currentCursor: null,
			},
		}));
	},

	goToNextPage: async (connectionId: string) => {
		await get().loadPage(connectionId, "next");
	},

	goToPrevPage: async (connectionId: string) => {
		await get().loadPage(connectionId, "prev");
	},

	refreshKeys: async (connectionId: string) => {
		await get().loadPage(connectionId, "refresh");
	},

	loadPage: async (
		connectionId: string,
		direction: "next" | "prev" | "refresh",
	) => {
		set({ isLoading: true });

		try {
			const state = get();
			const { pagination, rangeStart, rangeEnd, sortAscending } = state;

			let cursor: string | null = null;
			let newPage = pagination.currentPage;
			let newHistory = [...pagination.cursorHistory];

			if (direction === "refresh") {
				newPage = 1;
				newHistory = [];
				cursor = null;
			} else if (direction === "next") {
				if (state.keys.length > 0) {
					const lastKey = state.keys[state.keys.length - 1].key;
					newHistory.push(pagination.currentCursor || "");
					cursor = lastKey;
					newPage = pagination.currentPage + 1;
				}
			} else if (direction === "prev") {
				if (newHistory.length > 0) {
					cursor = newHistory.pop() || null;
					newPage = Math.max(1, pagination.currentPage - 1);
				} else {
					cursor = null;
					newPage = 1;
				}
			}

			const result = await getAllKeys(
				connectionId,
				pagination.limit,
				cursor,
				sortAscending,
				rangeStart || null,
				rangeEnd || null,
			);

			const { expandedNodes } = get();
			set({
				keys: result.keys,
				treeData: buildTree(result.keys, expandedNodes),
				isLoading: false,
				pagination: {
					...pagination,
					currentPage: newPage,
					cursorHistory: newHistory,
					currentCursor: cursor,
					hasMore: result.has_more,
					totalLoaded: (newPage - 1) * pagination.limit + result.keys.length,
				},
			});

			if (direction === "refresh") {
				toast.success(`Loaded ${result.keys.length} keys`);
			}
		} catch (error: unknown) {
			set({ isLoading: false });
			toast.error(formatError(error));
		}
	},

	addKey: async (connectionId: string, leaseId?: number) => {
		const {
			newKey,
			newValue,
			expandedNodes,
			pagination,
			rangeStart,
			rangeEnd,
			sortAscending,
		} = get();
		if (!newKey.trim()) return;

		try {
			await putKey(connectionId, newKey, newValue, leaseId);
			toast.success("Key added successfully");

			const result = await getAllKeys(
				connectionId,
				pagination.limit,
				null,
				sortAscending,
				rangeStart || null,
				rangeEnd || null,
			);

			set({
				keys: result.keys,
				treeData: buildTree(result.keys, expandedNodes),
				newKey: "",
				newValue: "",
				newKeyLeaseId: null,
				showAddDialog: false,
				pagination: {
					...pagination,
					currentPage: 1,
					cursorHistory: [],
					currentCursor: null,
					hasMore: result.has_more,
				},
			});
		} catch (error: unknown) {
			toast.error(`Failed to add key: ${formatError(error)}`);
		}
	},

	editKey: async (connectionId: string, leaseId?: number) => {
		const {
			selectedKey,
			editValue,
			expandedNodes,
			pagination,
			rangeStart,
			rangeEnd,
			sortAscending,
		} = get();
		if (!selectedKey) return;

		try {
			await putKey(connectionId, selectedKey.key, editValue, leaseId);
			toast.success("Key updated successfully");

			const result = await getAllKeys(
				connectionId,
				pagination.limit,
				pagination.currentCursor,
				sortAscending,
				rangeStart || null,
				rangeEnd || null,
			);

			const updatedKey = result.keys.find((k) => k.key === selectedKey.key);
			set({
				keys: result.keys,
				treeData: buildTree(result.keys, expandedNodes),
				selectedKey: updatedKey || null,
				editValue: "",
				editKeyLeaseId: null,
				showEditDialog: false,
				pagination: {
					...pagination,
					hasMore: result.has_more,
				},
			});
		} catch (error: unknown) {
			toast.error(`Failed to update key: ${formatError(error)}`);
		}
	},

	deleteKey: async (connectionId: string) => {
		const {
			selectedKey,
			expandedNodes,
			pagination,
			rangeStart,
			rangeEnd,
			sortAscending,
		} = get();
		if (!selectedKey) return;

		try {
			await deleteKey(connectionId, selectedKey.key);
			toast.success("Key deleted successfully");

			const result = await getAllKeys(
				connectionId,
				pagination.limit,
				pagination.currentCursor,
				sortAscending,
				rangeStart || null,
				rangeEnd || null,
			);

			set({
				keys: result.keys,
				treeData: buildTree(result.keys, expandedNodes),
				selectedKey: null,
				showDeleteDialog: false,
				pagination: {
					...pagination,
					hasMore: result.has_more,
				},
			});
		} catch (error: unknown) {
			toast.error(`Failed to delete key: ${formatError(error)}`);
		}
	},

	openEditDialog: () => {
		const { selectedKey } = get();
		if (selectedKey) {
			set({ editValue: selectedKey.value, showEditDialog: true });
		}
	},

	getFilteredKeys: () => {
		const { keys, searchQuery } = get();
		if (searchQuery.trim() === "") {
			return keys;
		}
		const query = searchQuery.toLowerCase();
		return keys.filter(
			(k) =>
				k.key.toLowerCase().includes(query) ||
				k.value.toLowerCase().includes(query),
		);
	},

	getPaginationInfo: () => {
		const { pagination, keys } = get();
		const start = (pagination.currentPage - 1) * pagination.limit + 1;
		const end = start + keys.length - 1;
		return {
			start,
			end,
			showingText: `Showing ${start}-${end}`,
		};
	},

	setShowBulkDeleteDialog: (show) => set({ showBulkDeleteDialog: show }),

	toggleKeySelectionForBulk: (key) => {
		const { selectedKeys } = get();
		const newSelection = new Set(selectedKeys);
		if (newSelection.has(key)) {
			newSelection.delete(key);
		} else {
			newSelection.add(key);
		}
		set({ selectedKeys: newSelection });
	},

	selectAllKeysOnPage: () => {
		const { keys } = get();
		const newSelection = new Set(keys.map((k) => k.key));
		set({ selectedKeys: newSelection });
	},

	deselectAllKeys: () => {
		set({ selectedKeys: new Set() });
	},

	deleteSelectedKeys: async (connectionId: string) => {
		const {
			selectedKeys,
			expandedNodes,
			pagination,
			rangeStart,
			rangeEnd,
			sortAscending,
		} = get();
		if (selectedKeys.size === 0) return;

		set({ isBulkOperationInProgress: true, bulkOperationProgress: 0 });

		try {
			const keysArray = Array.from(selectedKeys);
			const total = keysArray.length;

			await deleteKeys(connectionId, keysArray);

			set({ bulkOperationProgress: 100 });
			toast.success(`Deleted ${total} keys successfully`);

			const result = await getAllKeys(
				connectionId,
				pagination.limit,
				pagination.currentCursor,
				sortAscending,
				rangeStart || null,
				rangeEnd || null,
			);

			set({
				keys: result.keys,
				treeData: buildTree(result.keys, expandedNodes),
				selectedKeys: new Set(),
				showBulkDeleteDialog: false,
				isBulkOperationInProgress: false,
				bulkOperationProgress: 0,
				pagination: {
					...pagination,
					hasMore: result.has_more,
				},
			});
		} catch (error: unknown) {
			set({ isBulkOperationInProgress: false, bulkOperationProgress: 0 });
			toast.error(`Failed to delete keys: ${formatError(error)}`);
		}
	},

	exportSelectedKeys: async () => {
		const { selectedKeys, keys } = get();
		if (selectedKeys.size === 0) return;

		try {
			const selectedData = keys
				.filter((k) => selectedKeys.has(k.key))
				.map((k) => ({
					key: k.key,
					value: k.value,
				}));

			const json = JSON.stringify(selectedData, null, 2);
			const blob = new Blob([json], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `etcd-keys-${Date.now()}.json`;
			a.click();
			URL.revokeObjectURL(url);

			toast.success(`Exported ${selectedData.length} keys`);
		} catch (error: unknown) {
			toast.error(`Failed to export keys: ${formatError(error)}`);
		}
	},

	getSelectedKeysCount: () => {
		return get().selectedKeys.size;
	},

	isKeySelected: (key) => {
		return get().selectedKeys.has(key);
	},

	areAllKeysOnPageSelected: () => {
		const { keys, selectedKeys } = get();
		if (keys.length === 0) return false;
		return keys.every((k) => selectedKeys.has(k.key));
	},

	setShowExportDialog: (show) => set({ showExportDialog: show }),

	setShowImportDialog: (show) => set({ showImportDialog: show }),

	exportKeys: async (_connectionId: string, selectedOnly: boolean) => {
		try {
			const { keys, selectedKeysForExport } = get();
			const keysToExport = selectedOnly
				? keys.filter((k) => selectedKeysForExport.has(k.key))
				: keys;

			if (keysToExport.length === 0) {
				toast.error("No keys to export");
				return;
			}

			const filePath = await saveFileDialog(
				[{ name: "JSON", extensions: ["json"] }],
				"etcd-export.json",
			);

			if (!filePath) return;

			const exportData: ExportData = {
				keys: keysToExport.map((k) => ({
					key: k.key,
					value: k.value,
					lease_id: null,
				})),
			};

			await writeFile(filePath, JSON.stringify(exportData, null, 2));
			toast.success(`Exported ${keysToExport.length} keys`);
			set({ showExportDialog: false, selectedKeysForExport: new Set() });
		} catch (error: unknown) {
			toast.error(`Export failed: ${formatError(error)}`);
		}
	},

	importKeys: async () => {
		try {
			const filePath = await openFileDialog(
				[{ name: "JSON", extensions: ["json"] }],
				false,
			);

			if (!filePath) return;

			const content = await readFile(filePath as string);
			const data: ExportData = JSON.parse(content);

			if (!data.keys || !Array.isArray(data.keys)) {
				toast.error('Invalid JSON format: missing "keys" array');
				return;
			}

			const { keys } = get();
			const existingKeys = new Map(keys.map((k) => [k.key, k.value]));

			const previewData: ImportPreviewItem[] = data.keys.map((item) => {
				const existingValue = existingKeys.get(item.key);
				return {
					key: item.key,
					value: item.value,
					lease_id: item.lease_id,
					action: existingValue !== undefined ? "update" : "create",
					existingValue,
				};
			});

			set({ importPreviewData: previewData, showImportDialog: true });
		} catch (error: unknown) {
			toast.error(`Import failed: ${formatError(error)}`);
		}
	},

	executeImport: async (connectionId: string) => {
		const { importPreviewData } = get();
		if (importPreviewData.length === 0) return;

		set({ isImporting: true, importProgress: 0 });

		try {
			for (let i = 0; i < importPreviewData.length; i++) {
				const item = importPreviewData[i];
				await putKey(connectionId, item.key, item.value);
				set({
					importProgress: Math.round(
						((i + 1) / importPreviewData.length) * 100,
					),
				});
			}

			toast.success(`Imported ${importPreviewData.length} keys`);
			set({
				showImportDialog: false,
				importPreviewData: [],
				importProgress: 0,
				isImporting: false,
			});
			await get().refreshKeys(connectionId);
		} catch (error: unknown) {
			set({ isImporting: false });
			toast.error(`Import execution failed: ${formatError(error)}`);
		}
	},

	cancelImport: () => {
		set({
			showImportDialog: false,
			importPreviewData: [],
			importProgress: 0,
			isImporting: false,
		});
	},

	toggleKeySelection: (key: string) => {
		const { selectedKeysForExport } = get();
		const newSelection = new Set(selectedKeysForExport);
		if (newSelection.has(key)) {
			newSelection.delete(key);
		} else {
			newSelection.add(key);
		}
		set({ selectedKeysForExport: newSelection });
	},

	selectAllKeysForExport: () => {
		const { keys } = get();
		set({ selectedKeysForExport: new Set(keys.map((k) => k.key)) });
	},

	deselectAllKeysForExport: () => {
		set({ selectedKeysForExport: new Set() });
	},
}));
