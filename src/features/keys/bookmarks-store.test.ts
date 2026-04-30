import { beforeEach, describe, expect, it } from "vitest";
import { useBookmarksStore } from "./bookmarks-store";

describe("Bookmarks Store", () => {
	beforeEach(() => {
		useBookmarksStore.setState({ bookmarks: {} });
	});

	describe("addBookmark", () => {
		it("should add a bookmark for a connection", () => {
			useBookmarksStore.getState().addBookmark("conn-1", "/config/db");
			const bookmarks = useBookmarksStore.getState().getBookmarks("conn-1");
			expect(bookmarks).toContain("/config/db");
		});

		it("should not add duplicate bookmarks", () => {
			useBookmarksStore.getState().addBookmark("conn-1", "/config/db");
			useBookmarksStore.getState().addBookmark("conn-1", "/config/db");
			const bookmarks = useBookmarksStore.getState().getBookmarks("conn-1");
			expect(bookmarks).toHaveLength(1);
		});

		it("should keep bookmarks separate per connection", () => {
			useBookmarksStore.getState().addBookmark("conn-1", "/config/db");
			useBookmarksStore.getState().addBookmark("conn-2", "/config/cache");
			expect(useBookmarksStore.getState().getBookmarks("conn-1")).toEqual([
				"/config/db",
			]);
			expect(useBookmarksStore.getState().getBookmarks("conn-2")).toEqual([
				"/config/cache",
			]);
		});
	});

	describe("removeBookmark", () => {
		it("should remove a bookmark", () => {
			useBookmarksStore.getState().addBookmark("conn-1", "/config/db");
			useBookmarksStore.getState().removeBookmark("conn-1", "/config/db");
			const bookmarks = useBookmarksStore.getState().getBookmarks("conn-1");
			expect(bookmarks).toHaveLength(0);
		});

		it("should handle removing non-existent bookmark gracefully", () => {
			useBookmarksStore.getState().addBookmark("conn-1", "/config/db");
			useBookmarksStore.getState().removeBookmark("conn-1", "/config/other");
			const bookmarks = useBookmarksStore.getState().getBookmarks("conn-1");
			expect(bookmarks).toHaveLength(1);
		});
	});

	describe("isBookmarked", () => {
		it("should return true for bookmarked keys", () => {
			useBookmarksStore.getState().addBookmark("conn-1", "/config/db");
			expect(
				useBookmarksStore.getState().isBookmarked("conn-1", "/config/db"),
			).toBe(true);
		});

		it("should return false for non-bookmarked keys", () => {
			expect(
				useBookmarksStore.getState().isBookmarked("conn-1", "/config/db"),
			).toBe(false);
		});
	});

	describe("getBookmarks", () => {
		it("should return empty array for unknown connection", () => {
			expect(useBookmarksStore.getState().getBookmarks("unknown")).toEqual([]);
		});

		it("should return defensive copy", () => {
			useBookmarksStore.getState().addBookmark("conn-1", "/config/db");
			const bookmarks = useBookmarksStore.getState().getBookmarks("conn-1");
			bookmarks.push("/tampered");
			expect(useBookmarksStore.getState().getBookmarks("conn-1")).toHaveLength(
				1,
			);
		});
	});
});
