import { beforeEach, describe, expect, it, vi } from "vitest";
import { PAGE_SIZE_OPTIONS, useKeysStore } from "./keys-store";

const mockDeleteKeys = vi.hoisted(() => vi.fn());
const mockGetAllKeys = vi.hoisted(() => vi.fn());

vi.mock("@/commands/keys", () => ({
	deleteKey: vi.fn(),
	deleteKeys: mockDeleteKeys,
	getAllKeys: mockGetAllKeys,
	putKey: vi.fn(),
}));

describe("Keys Store", () => {
	beforeEach(() => {
		mockDeleteKeys.mockReset();
		mockGetAllKeys.mockReset();
		useKeysStore.setState({
			keys: [],
			selectedKey: null,
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
				limit: 100,
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
			openTabs: [],
			activeTab: null,
		});
		vi.clearAllMocks();
	});

	describe("State Management", () => {
		it("should have default initial state", () => {
			const state = useKeysStore.getState();
			expect(state.keys).toEqual([]);
			expect(state.selectedKey).toBeNull();
			expect(state.searchQuery).toBe("");
			expect(state.viewMode).toBe("flat");
			expect(state.isLoading).toBe(false);
		});

		it("should update search query", () => {
			const { setSearchQuery } = useKeysStore.getState();
			setSearchQuery("test-query");
			expect(useKeysStore.getState().searchQuery).toBe("test-query");
		});

		it("should update view mode", () => {
			const { setViewMode } = useKeysStore.getState();
			setViewMode("tree");
			expect(useKeysStore.getState().viewMode).toBe("tree");

			setViewMode("flat");
			expect(useKeysStore.getState().viewMode).toBe("flat");
		});

		it("should update selected key", () => {
			const { setSelectedKey } = useKeysStore.getState();
			const key = {
				key: "test-key",
				value: "test-value",
				version: 1,
				create_revision: 1,
				mod_revision: 1,
				lease: 0,
			};
			setSelectedKey(key);
			expect(useKeysStore.getState().selectedKey).toEqual(key);

			setSelectedKey(null);
			expect(useKeysStore.getState().selectedKey).toBeNull();
		});
	});

	describe("Pagination", () => {
		it("should update page size", () => {
			const { setPageSize } = useKeysStore.getState();
			setPageSize(50);

			const state = useKeysStore.getState();
			expect(state.pagination.limit).toBe(50);
			expect(state.pagination.currentPage).toBe(1);
			expect(state.pagination.cursorHistory).toEqual([]);
		});

		it("should have valid page size options", () => {
			expect(PAGE_SIZE_OPTIONS).toEqual([25, 50, 100, 500]);
		});

		it("should get pagination info correctly", () => {
			useKeysStore.setState({
				keys: Array(10)
					.fill(null)
					.map((_, i) => ({
						key: `key-${i}`,
						value: `value-${i}`,
						version: 1,
						create_revision: 1,
						mod_revision: 1,
						lease: 0,
					})),
			});

			const { getPaginationInfo } = useKeysStore.getState();
			const info = getPaginationInfo();

			expect(info.start).toBe(1);
			expect(info.end).toBe(10);
			expect(info.showingText).toBe("Showing 1-10");
		});

		it("should calculate pagination info for second page", () => {
			useKeysStore.setState({
				keys: Array(50)
					.fill(null)
					.map((_, i) => ({
						key: `key-${i}`,
						value: `value-${i}`,
						version: 1,
						create_revision: 1,
						mod_revision: 1,
						lease: 0,
					})),
				pagination: {
					limit: 50,
					currentPage: 2,
					cursorHistory: [""],
					currentCursor: "cursor",
					hasMore: false,
					totalLoaded: 100,
				},
			});

			const { getPaginationInfo } = useKeysStore.getState();
			const info = getPaginationInfo();

			expect(info.start).toBe(51);
			expect(info.end).toBe(100);
		});
	});

	describe("Key Filtering", () => {
		it("should filter keys by search query", () => {
			useKeysStore.setState({
				keys: [
					{
						key: "app/config",
						value: "configuration",
						version: 1,
						create_revision: 1,
						mod_revision: 1,
						lease: 0,
					},
					{
						key: "app/users",
						value: "user-data",
						version: 1,
						create_revision: 1,
						mod_revision: 1,
						lease: 0,
					},
					{
						key: "db/host",
						value: "localhost",
						version: 1,
						create_revision: 1,
						mod_revision: 1,
						lease: 0,
					},
				],
				searchQuery: "app",
			});

			const { getFilteredKeys } = useKeysStore.getState();
			const filtered = getFilteredKeys();

			expect(filtered).toHaveLength(2);
			expect(filtered[0].key).toBe("app/config");
			expect(filtered[1].key).toBe("app/users");
		});

		it("should filter keys by value", () => {
			useKeysStore.setState({
				keys: [
					{
						key: "key1",
						value: "hello world",
						version: 1,
						create_revision: 1,
						mod_revision: 1,
						lease: 0,
					},
					{
						key: "key2",
						value: "goodbye",
						version: 1,
						create_revision: 1,
						mod_revision: 1,
						lease: 0,
					},
				],
				searchQuery: "hello",
			});

			const { getFilteredKeys } = useKeysStore.getState();
			const filtered = getFilteredKeys();

			expect(filtered).toHaveLength(1);
			expect(filtered[0].key).toBe("key1");
		});

		it("should return all keys when search query is empty", () => {
			const keys = [
				{
					key: "key1",
					value: "value1",
					version: 1,
					create_revision: 1,
					mod_revision: 1,
					lease: 0,
				},
				{
					key: "key2",
					value: "value2",
					version: 1,
					create_revision: 1,
					mod_revision: 1,
					lease: 0,
				},
			];
			useKeysStore.setState({ keys, searchQuery: "" });

			const { getFilteredKeys } = useKeysStore.getState();
			expect(getFilteredKeys()).toEqual(keys);
		});

		it("should filter case-insensitively", () => {
			useKeysStore.setState({
				keys: [
					{
						key: "MY_KEY",
						value: "VALUE",
						version: 1,
						create_revision: 1,
						mod_revision: 1,
						lease: 0,
					},
				],
				searchQuery: "my_key",
			});

			const { getFilteredKeys } = useKeysStore.getState();
			expect(getFilteredKeys()).toHaveLength(1);
		});
	});

	describe("Dialog Management", () => {
		it("should toggle add dialog", () => {
			const { setShowAddDialog } = useKeysStore.getState();

			setShowAddDialog(true);
			expect(useKeysStore.getState().showAddDialog).toBe(true);

			setShowAddDialog(false);
			expect(useKeysStore.getState().showAddDialog).toBe(false);
		});

		it("should toggle edit dialog", () => {
			const { setShowEditDialog } = useKeysStore.getState();

			setShowEditDialog(true);
			expect(useKeysStore.getState().showEditDialog).toBe(true);
		});

		it("should toggle delete dialog", () => {
			const { setShowDeleteDialog } = useKeysStore.getState();

			setShowDeleteDialog(true);
			expect(useKeysStore.getState().showDeleteDialog).toBe(true);
		});

		it("should open edit dialog with selected key value", () => {
			useKeysStore.setState({
				selectedKey: {
					key: "test",
					value: "test-value",
					version: 1,
					create_revision: 1,
					mod_revision: 1,
					lease: 0,
				},
			});

			const { openEditDialog } = useKeysStore.getState();
			openEditDialog();

			expect(useKeysStore.getState().editValue).toBe("test-value");
			expect(useKeysStore.getState().showEditDialog).toBe(true);
		});

		it("should not open edit dialog when no key selected", () => {
			const { openEditDialog } = useKeysStore.getState();
			openEditDialog();

			expect(useKeysStore.getState().showEditDialog).toBe(false);
		});
	});

	describe("New Key State", () => {
		it("should update new key fields", () => {
			const { setNewKey, setNewValue, setNewKeyLeaseId } =
				useKeysStore.getState();

			setNewKey("my-key");
			expect(useKeysStore.getState().newKey).toBe("my-key");

			setNewValue("my-value");
			expect(useKeysStore.getState().newValue).toBe("my-value");

			setNewKeyLeaseId(12345);
			expect(useKeysStore.getState().newKeyLeaseId).toBe(12345);
		});
	});

	describe("Range and Sort", () => {
		it("should update range start", () => {
			const { setRangeStart } = useKeysStore.getState();
			setRangeStart("prefix/");
			expect(useKeysStore.getState().rangeStart).toBe("prefix/");
		});

		it("should update range end", () => {
			const { setRangeEnd } = useKeysStore.getState();
			setRangeEnd("prefix/~");
			expect(useKeysStore.getState().rangeEnd).toBe("prefix/~");
		});

		it("should update sort direction", () => {
			const { setSortAscending } = useKeysStore.getState();

			setSortAscending(false);
			expect(useKeysStore.getState().sortAscending).toBe(false);

			setSortAscending(true);
			expect(useKeysStore.getState().sortAscending).toBe(true);
		});
	});

	describe("Bulk Operations", () => {
		it("should toggle key selection", () => {
			const { toggleKeySelectionForBulk } = useKeysStore.getState();

			toggleKeySelectionForBulk("key1");
			expect(useKeysStore.getState().selectedKeys.has("key1")).toBe(true);

			toggleKeySelectionForBulk("key1");
			expect(useKeysStore.getState().selectedKeys.has("key1")).toBe(false);
		});

		it("should select all keys on page", () => {
			useKeysStore.setState({
				keys: [
					{
						key: "key1",
						value: "v1",
						version: 1,
						create_revision: 1,
						mod_revision: 1,
						lease: 0,
					},
					{
						key: "key2",
						value: "v2",
						version: 1,
						create_revision: 1,
						mod_revision: 1,
						lease: 0,
					},
				],
			});

			const { selectAllKeysOnPage } = useKeysStore.getState();
			selectAllKeysOnPage();

			expect(useKeysStore.getState().selectedKeys.size).toBe(2);
			expect(useKeysStore.getState().selectedKeys.has("key1")).toBe(true);
			expect(useKeysStore.getState().selectedKeys.has("key2")).toBe(true);
		});

		it("should deselect all keys", () => {
			useKeysStore.setState({
				selectedKeys: new Set(["key1", "key2"]),
			});

			const { deselectAllKeys } = useKeysStore.getState();
			deselectAllKeys();

			expect(useKeysStore.getState().selectedKeys.size).toBe(0);
		});

		it("should get selected keys count", () => {
			useKeysStore.setState({
				selectedKeys: new Set(["key1", "key2", "key3"]),
			});

			const { getSelectedKeysCount } = useKeysStore.getState();
			expect(getSelectedKeysCount()).toBe(3);
		});

		it("should check if key is selected", () => {
			useKeysStore.setState({
				selectedKeys: new Set(["key1"]),
			});

			const { isKeySelected } = useKeysStore.getState();
			expect(isKeySelected("key1")).toBe(true);
			expect(isKeySelected("key2")).toBe(false);
		});

		it("should check if all keys on page are selected", () => {
			useKeysStore.setState({
				keys: [
					{
						key: "key1",
						value: "v1",
						version: 1,
						create_revision: 1,
						mod_revision: 1,
						lease: 0,
					},
					{
						key: "key2",
						value: "v2",
						version: 1,
						create_revision: 1,
						mod_revision: 1,
						lease: 0,
					},
				],
				selectedKeys: new Set(["key1", "key2"]),
			});

			const { areAllKeysOnPageSelected } = useKeysStore.getState();
			expect(areAllKeysOnPageSelected()).toBe(true);
		});
	});

	describe("Recent Queries", () => {
		it("should add recent query", () => {
			useKeysStore.setState({
				searchQuery: "test-search",
				rangeStart: "start/",
				rangeEnd: "end/",
				sortAscending: true,
				pagination: {
					limit: 50,
					currentPage: 1,
					cursorHistory: [],
					currentCursor: null,
					hasMore: false,
					totalLoaded: 0,
				},
			});

			const { addRecentQuery } = useKeysStore.getState();
			addRecentQuery();

			const queries = useKeysStore.getState().recentQueries;
			expect(queries).toHaveLength(1);
			expect(queries[0].searchQuery).toBe("test-search");
			expect(queries[0].rangeStart).toBe("start/");
			expect(queries[0].limit).toBe(50);
		});

		it("should load recent query", () => {
			const query = {
				id: "123",
				searchQuery: "saved",
				rangeStart: "rs/",
				rangeEnd: "re/",
				sortAscending: false,
				limit: 25,
				timestamp: Date.now(),
			};

			const { loadRecentQuery } = useKeysStore.getState();
			loadRecentQuery(query);

			const state = useKeysStore.getState();
			expect(state.searchQuery).toBe("saved");
			expect(state.rangeStart).toBe("rs/");
			expect(state.rangeEnd).toBe("re/");
			expect(state.sortAscending).toBe(false);
		});
	});

	describe("Tab Management", () => {
		it("should add a new tab", () => {
			const { addTab } = useKeysStore.getState();
			addTab("/config/db");
			const state = useKeysStore.getState();
			expect(state.openTabs).toHaveLength(1);
			expect(state.openTabs[0].key).toBe("/config/db");
			expect(state.activeTab).toBe("/config/db");
		});

		it("should not duplicate existing tabs", () => {
			const { addTab } = useKeysStore.getState();
			addTab("/config/db");
			addTab("/config/db");
			const state = useKeysStore.getState();
			expect(state.openTabs).toHaveLength(1);
			expect(state.activeTab).toBe("/config/db");
		});

		it("should switch to existing tab instead of duplicating", () => {
			const { addTab } = useKeysStore.getState();
			addTab("/config/db");
			addTab("/config/cache");
			addTab("/config/db");
			const state = useKeysStore.getState();
			expect(state.openTabs).toHaveLength(2);
			expect(state.activeTab).toBe("/config/db");
		});

		it("should close a tab and activate the previous one", () => {
			const { addTab, closeTab } = useKeysStore.getState();
			addTab("/config/db");
			addTab("/config/cache");
			closeTab("/config/cache");
			const state = useKeysStore.getState();
			expect(state.openTabs).toHaveLength(1);
			expect(state.activeTab).toBe("/config/db");
		});

		it("should close a non-active tab without changing active tab", () => {
			const { addTab, closeTab } = useKeysStore.getState();
			addTab("/config/db");
			addTab("/config/cache");
			closeTab("/config/db");
			const state = useKeysStore.getState();
			expect(state.openTabs).toHaveLength(1);
			expect(state.activeTab).toBe("/config/cache");
		});

		it("should set active tab", () => {
			const { addTab, setActiveTab } = useKeysStore.getState();
			addTab("/config/db");
			addTab("/config/cache");
			setActiveTab("/config/db");
			expect(useKeysStore.getState().activeTab).toBe("/config/db");
		});

		it("should update tab scroll position", () => {
			const { addTab, updateTabScroll } = useKeysStore.getState();
			addTab("/config/db");
			updateTabScroll("/config/db", 150);
			const tab = useKeysStore
				.getState()
				.openTabs.find((t) => t.key === "/config/db");
			expect(tab?.scrollPosition).toBe(150);
		});
	});

	describe("upsertKey", () => {
		it("should not append a missing key to the current paginated page", () => {
			const { upsertKey } = useKeysStore.getState();
			useKeysStore.setState({
				keys: [
					{
						key: "/config/cache",
						value: "redis",
						version: 1,
						create_revision: 1,
						mod_revision: 1,
						lease: 0,
					},
				],
			});

			upsertKey({
				key: "/config/db",
				value: "postgres",
				version: 1,
				create_revision: 1,
				mod_revision: 1,
				lease: 0,
			});
			const { keys } = useKeysStore.getState();
			expect(keys).toHaveLength(1);
			expect(keys[0].key).toBe("/config/cache");
		});

		it("should update existing key instead of duplicating", () => {
			const { upsertKey } = useKeysStore.getState();
			useKeysStore.setState({
				keys: [
					{
						key: "/config/db",
						value: "postgres",
						version: 1,
						create_revision: 1,
						mod_revision: 1,
						lease: 0,
					},
				],
			});
			upsertKey({
				key: "/config/db",
				value: "mysql",
				version: 2,
				create_revision: 1,
				mod_revision: 2,
				lease: 0,
			});
			const keys = useKeysStore.getState().keys;
			expect(keys).toHaveLength(1);
			expect(keys[0].value).toBe("mysql");
		});

		it("should sync tab snapshot when upserting an existing key", () => {
			const { addTab, upsertKey } = useKeysStore.getState();
			addTab("/config/db", {
				key: "/config/db",
				value: "postgres",
				version: 1,
				create_revision: 1,
				mod_revision: 1,
				lease: 0,
			});

			upsertKey({
				key: "/config/db",
				value: "mysql",
				version: 2,
				create_revision: 1,
				mod_revision: 2,
				lease: 0,
			});

			const tab = useKeysStore
				.getState()
				.openTabs.find((t) => t.key === "/config/db");
			expect(tab?.snapshot?.value).toBe("mysql");
			expect(tab?.snapshot?.version).toBe(2);
		});

		it("should not affect other tabs when upserting a key", () => {
			const { addTab, upsertKey } = useKeysStore.getState();
			addTab("/config/db", {
				key: "/config/db",
				value: "postgres",
				version: 1,
				create_revision: 1,
				mod_revision: 1,
				lease: 0,
			});
			addTab("/config/cache", {
				key: "/config/cache",
				value: "redis",
				version: 1,
				create_revision: 1,
				mod_revision: 1,
				lease: 0,
			});

			upsertKey({
				key: "/config/db",
				value: "mysql",
				version: 2,
				create_revision: 1,
				mod_revision: 2,
				lease: 0,
			});

			const tabs = useKeysStore.getState().openTabs;
			expect(tabs.find((t) => t.key === "/config/db")?.snapshot?.value).toBe(
				"mysql",
			);
			expect(tabs.find((t) => t.key === "/config/cache")?.snapshot?.value).toBe(
				"redis",
			);
		});

		it("should clear snapshots for tabs removed by bulk delete", async () => {
			mockDeleteKeys.mockResolvedValue(2);
			mockGetAllKeys.mockResolvedValue({ keys: [], has_more: false });
			useKeysStore.setState({
				keys: [
					{
						key: "/config/db",
						value: "postgres",
						version: 1,
						create_revision: 1,
						mod_revision: 1,
						lease: 0,
					},
					{
						key: "/config/cache",
						value: "redis",
						version: 1,
						create_revision: 1,
						mod_revision: 1,
						lease: 0,
					},
				],
				selectedKeys: new Set(["/config/db"]),
				openTabs: [
					{
						key: "/config/db",
						scrollPosition: 0,
						snapshot: {
							key: "/config/db",
							value: "postgres",
							version: 1,
							create_revision: 1,
							mod_revision: 1,
							lease: 0,
						},
					},
					{
						key: "/config/cache",
						scrollPosition: 0,
						snapshot: {
							key: "/config/cache",
							value: "redis",
							version: 1,
							create_revision: 1,
							mod_revision: 1,
							lease: 0,
						},
					},
				],
			});

			await useKeysStore.getState().deleteSelectedKeys("connection-1");

			const tabs = useKeysStore.getState().openTabs;
			expect(
				tabs.find((t) => t.key === "/config/db")?.snapshot,
			).toBeUndefined();
			expect(tabs.find((t) => t.key === "/config/cache")?.snapshot?.value).toBe(
				"redis",
			);
		});
	});
});
