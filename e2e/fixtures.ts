import { type Page, request } from "@playwright/test";

export interface MockEtcdKey {
	key: string;
	value: string;
	version: number;
	create_revision: number;
	mod_revision: number;
	lease: number;
}

function toB64(str: string): string {
	return Buffer.from(str, "utf8").toString("base64");
}

export async function clearEtcd(etcdEndpoint: string): Promise<void> {
	const ctx = await request.newContext();
	try {
		const resp = await ctx.post(`${etcdEndpoint}/v3/kv/deleterange`, {
			data: JSON.stringify({
				key: toB64("\0"),
				range_end: toB64("\0"),
			}),
			headers: { "Content-Type": "application/json" },
		});
		if (!resp.ok()) {
			const body = await resp.text();
			throw new Error(`clearEtcd failed with status ${resp.status()}: ${body}`);
		}
	} finally {
		await ctx.dispose();
	}
}

export async function seedEtcd(
	etcdEndpoint: string,
	keys: Array<{ key: string; value: string }>,
): Promise<void> {
	const ctx = await request.newContext();
	try {
		for (const { key, value } of keys) {
			const resp = await ctx.post(`${etcdEndpoint}/v3/kv/put`, {
				data: JSON.stringify({
					key: toB64(key),
					value: toB64(value),
				}),
				headers: { "Content-Type": "application/json" },
			});
			if (!resp.ok()) {
				const body = await resp.text();
				throw new Error(
					`seedEtcd failed for key "${key}" with status ${resp.status()}: ${body}`,
				);
			}
		}
	} finally {
		await ctx.dispose();
	}
}

export async function setupEtcdMock(
	page: Page,
	etcdEndpoint: string,
): Promise<void> {
	await page.addInitScript((endpoint: string) => {
		const mockConnections = new Map<string, string>();
		const mockHistory: Array<Record<string, unknown>> = [];
		let connectionCounter = 1;

		function toB64Browser(str: string): string {
			const bytes = new TextEncoder().encode(str);
			const bin = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
			return btoa(bin);
		}

		function fromB64Browser(b64: string): string {
			const bin = atob(b64);
			const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
			return new TextDecoder().decode(bytes);
		}

		async function etcdPost(
			path: string,
			body: unknown,
		): Promise<Record<string, unknown>> {
			const res = await fetch(`${endpoint}${path}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				const text = await res.text();
				throw new Error(`etcd HTTP error ${res.status}: ${text}`);
			}
			return res.json() as Promise<Record<string, unknown>>;
		}

		async function etcdPostTo(
			baseUrl: string,
			path: string,
			body: unknown,
		): Promise<Record<string, unknown>> {
			const res = await fetch(`${baseUrl}${path}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				const text = await res.text();
				throw new Error(`etcd HTTP error ${res.status}: ${text}`);
			}
			return res.json() as Promise<Record<string, unknown>>;
		}

		async function getAllEtcdKeys(): Promise<
			Array<{
				key: string;
				value: string;
				version: number;
				create_revision: number;
				mod_revision: number;
				lease: number;
			}>
		> {
			const data = (await etcdPost("/v3/kv/range", {
				key: toB64Browser("\0"),
				range_end: toB64Browser("\0"),
			})) as {
				kvs?: Array<{
					key: string;
					value: string;
					version: string;
					create_revision: string;
					mod_revision: string;
					lease: string;
				}>;
			};
			return (data.kvs || []).map((kv) => ({
				key: fromB64Browser(kv.key),
				value: fromB64Browser(kv.value),
				version: Number(kv.version),
				create_revision: Number(kv.create_revision),
				mod_revision: Number(kv.mod_revision),
				lease: Number(kv.lease),
			}));
		}

		function sortKeys(
			keys: Array<{
				key: string;
				value: string;
				version: number;
				create_revision: number;
				mod_revision: number;
				lease: number;
			}>,
			ascending: boolean,
		) {
			return [...keys].sort((a, b) =>
				ascending ? a.key.localeCompare(b.key) : b.key.localeCompare(a.key),
			);
		}

		function paginate(
			keys: Array<{
				key: string;
				value: string;
				version: number;
				create_revision: number;
				mod_revision: number;
				lease: number;
			}>,
			limit: number,
			cursor: string | null,
			sortAscending: boolean,
		): {
			keys: Array<{
				key: string;
				value: string;
				version: number;
				create_revision: number;
				mod_revision: number;
				lease: number;
			}>;
			has_more: boolean;
		} {
			let startIndex = 0;
			if (cursor) {
				startIndex = keys.findIndex((k) =>
					sortAscending ? k.key > cursor : k.key < cursor,
				);
				if (startIndex === -1) startIndex = keys.length;
			}
			const pageKeys = keys.slice(startIndex, startIndex + limit);
			const has_more = startIndex + limit < keys.length;
			return { keys: pageKeys, has_more };
		}

		(
			window as unknown as {
				__TAURI_INTERNALS__: {
					invoke: (
						cmd: string,
						args?: Record<string, unknown>,
					) => Promise<unknown>;
				};
			}
		).__TAURI_INTERNALS__ = {
			invoke: async (cmd: string, args?: Record<string, unknown>) => {
				await new Promise((r) => setTimeout(r, 50));

				switch (cmd) {
					case "connect_etcd": {
						const endpointArg = args?.endpoint as string | undefined;
						if (!endpointArg || endpointArg.includes("invalid")) {
							throw new Error(
								"Connection refused: unable to connect to endpoint",
							);
						}
						try {
							await etcdPostTo(endpointArg, "/v3/kv/put", {
								key: toB64Browser("__health_check__"),
								value: toB64Browser("ok"),
							});
							await etcdPostTo(endpointArg, "/v3/kv/deleterange", {
								key: toB64Browser("__health_check__"),
							});
						} catch {
							throw new Error(
								"Connection refused: unable to connect to endpoint",
							);
						}
						const id = `conn-${connectionCounter++}`;
						mockConnections.set(id, endpointArg);
						mockHistory.push({
							endpoint: args?.endpoint,
							name: args?.name || args?.endpoint,
							username: args?.username,
							password: args?.password,
							tls_enabled: args?.tlsEnabled,
							ca_cert_path: args?.caCertPath,
							client_cert_path: args?.clientCertPath,
							client_key_path: args?.clientKeyPath,
							skip_verify: args?.skipVerify,
							isFavorite: false,
						});
						return id;
					}

					case "disconnect_etcd": {
						const connId = args?.connectionId as string;
						for (const [id] of mockConnections) {
							if (id === connId) {
								mockConnections.delete(id);
								break;
							}
						}
						return "disconnected";
					}

					case "test_connection": {
						const endpointArg = args?.endpoint as string | undefined;
						if (!endpointArg || endpointArg.includes("invalid")) {
							throw new Error(
								"Connection refused: unable to connect to endpoint",
							);
						}
						try {
							await etcdPostTo(endpointArg, "/v3/kv/put", {
								key: toB64Browser("__health_check__"),
								value: toB64Browser("ok"),
							});
							await etcdPostTo(endpointArg, "/v3/kv/deleterange", {
								key: toB64Browser("__health_check__"),
							});
						} catch {
							throw new Error(
								"Connection refused: unable to connect to endpoint",
							);
						}
						return "ok";
					}

					case "get_all_keys": {
						const limit = (args?.limit ?? 50) as number;
						const cursor = args?.cursor as string | null;
						const sortAscending = (args?.sortAscending ?? true) as boolean;
						const rangeStart = args?.rangeStart as string | null;
						const rangeEnd = args?.rangeEnd as string | null;

						let keys = await getAllEtcdKeys();

						if (rangeStart) {
							keys = keys.filter((k) => k.key >= rangeStart);
						}
						if (rangeEnd) {
							keys = keys.filter((k) => k.key < rangeEnd);
						}

						keys = sortKeys(keys, sortAscending);
						return paginate(keys, limit, cursor, sortAscending);
					}

					case "get_keys_with_prefix": {
						const prefix = (args?.prefix ?? "") as string;
						const limit = (args?.limit ?? 50) as number;
						const cursor = args?.cursor as string | null;
						const sortAscending = (args?.sortAscending ?? true) as boolean;

						let keys = await getAllEtcdKeys();
						keys = keys.filter((k) => k.key.startsWith(prefix));
						keys = sortKeys(keys, sortAscending);
						return paginate(keys, limit, cursor, sortAscending);
					}

					case "get_key": {
						const key = args?.key as string;
						const data = (await etcdPost("/v3/kv/range", {
							key: toB64Browser(key),
						})) as {
							kvs?: Array<{
								key: string;
								value: string;
								version: string;
								create_revision: string;
								mod_revision: string;
								lease: string;
							}>;
						};
						const kv = data.kvs?.[0];
						if (!kv) return null;
						return {
							key: fromB64Browser(kv.key),
							value: fromB64Browser(kv.value),
							version: Number(kv.version),
							create_revision: Number(kv.create_revision),
							mod_revision: Number(kv.mod_revision),
							lease: Number(kv.lease),
						};
					}

					case "put_key": {
						const key = args?.key as string;
						const value = args?.value as string;
						await etcdPost("/v3/kv/put", {
							key: toB64Browser(key),
							value: toB64Browser(value),
						});
						const data = (await etcdPost("/v3/kv/range", {
							key: toB64Browser(key),
						})) as {
							kvs?: Array<{
								key: string;
								value: string;
								version: string;
								create_revision: string;
								mod_revision: string;
								lease: string;
							}>;
						};
						const kv = data.kvs?.[0];
						if (!kv) throw new Error("Key not found after put");
						return {
							key: fromB64Browser(kv.key),
							value: fromB64Browser(kv.value),
							version: Number(kv.version),
							create_revision: Number(kv.create_revision),
							mod_revision: Number(kv.mod_revision),
							lease: Number(kv.lease),
						};
					}

					case "delete_key": {
						const key = args?.key as string;
						await etcdPost("/v3/kv/deleterange", {
							key: toB64Browser(key),
						});
						return;
					}

					case "delete_keys": {
						const keysToDelete = (args?.keys ?? []) as string[];
						for (const key of keysToDelete) {
							await etcdPost("/v3/kv/deleterange", {
								key: toB64Browser(key),
							});
						}
						return keysToDelete.length;
					}

					case "save_connection":
						return;

					case "get_connection_history":
						return mockHistory;

					case "list_connections":
						return Array.from(mockConnections.entries());

					case "get_saved_connection":
						return mockHistory[0] || null;

					case "remove_from_history": {
						const idx = mockHistory.findIndex(
							(h) => h.endpoint === args?.endpoint,
						);
						if (idx >= 0) mockHistory.splice(idx, 1);
						return;
					}

					case "update_connection_favorite": {
						const hist = mockHistory.find((h) => h.endpoint === args?.endpoint);
						if (hist) hist.isFavorite = args?.isFavorite;
						return;
					}

					case "duplicate_connection":
						return;

					case "import_connections":
						return;

					case "get_cluster_status":
						return {
							header: { cluster_id: "1", member_id: "1" },
							members: [],
						};

					case "get_cluster_metrics":
						return {
							header: { cluster_id: "1", member_id: "1" },
							db_size: 0,
							db_size_in_use: 0,
							leader: "1",
							raft_index: 1,
							raft_term: 1,
						};

					case "get_alarms":
						return { alarms: [] };

					case "list_leases":
						return { leases: [] };

					case "get_watch_prefix":
						return { events: [] };

					default: {
						// eslint-disable-next-line no-console
						console.warn(`Unhandled mock command: ${cmd}`, args);
						return null;
					}
				}
			},
		};
	}, etcdEndpoint);
}
