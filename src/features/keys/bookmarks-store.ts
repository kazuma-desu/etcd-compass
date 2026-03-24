import { create } from "zustand";
import { persist } from "zustand/middleware";

interface BookmarksState {
	bookmarks: Record<string, string[]>;
	addBookmark: (connectionId: string, keyPath: string) => void;
	removeBookmark: (connectionId: string, keyPath: string) => void;
	isBookmarked: (connectionId: string, keyPath: string) => boolean;
	getBookmarks: (connectionId: string) => string[];
}

export const useBookmarksStore = create<BookmarksState>()(
	persist(
		(set, get) => ({
			bookmarks: {},

			addBookmark: (connectionId: string, keyPath: string) => {
				set((state) => {
					const connectionBookmarks = state.bookmarks[connectionId] || [];
					if (connectionBookmarks.includes(keyPath)) {
						return state;
					}
					return {
						bookmarks: {
							...state.bookmarks,
							[connectionId]: [...connectionBookmarks, keyPath],
						},
					};
				});
			},

			removeBookmark: (connectionId: string, keyPath: string) => {
				set((state) => {
					const connectionBookmarks = state.bookmarks[connectionId] || [];
					return {
						bookmarks: {
							...state.bookmarks,
							[connectionId]: connectionBookmarks.filter(
								(path) => path !== keyPath,
							),
						},
					};
				});
			},

			isBookmarked: (connectionId: string, keyPath: string) => {
				const connectionBookmarks = get().bookmarks[connectionId] || [];
				return connectionBookmarks.includes(keyPath);
			},

			getBookmarks: (connectionId: string) => {
				return get().bookmarks[connectionId] || [];
			},
		}),
		{
			name: "etcd-compass-bookmarks",
		},
	),
);
