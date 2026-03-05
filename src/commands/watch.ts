/**
 * Watch commands — key watching and event streaming
 *
 * Maps to: watch_key, unwatch_key, list_active_watches
 * Also wraps the Tauri event listener for watch-event.
 */

import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";
import type { WatchEvent, WatchResponse } from "./types";

export async function watchKey(
	connectionId: string,
	key: string,
	isPrefix: boolean,
): Promise<WatchResponse> {
	return invoke<WatchResponse>("watch_key", { connectionId, key, isPrefix });
}

export async function unwatchKey(watchId: string): Promise<void> {
	return invoke<void>("unwatch_key", { watchId });
}

export async function listActiveWatches(): Promise<[string, string][]> {
	return invoke<[string, string][]>("list_active_watches");
}

export async function onWatchEvent(
	callback: (event: WatchEvent) => void,
): Promise<UnlistenFn> {
	return listen<WatchEvent>("watch-event", (event) => {
		callback(event.payload);
	});
}
