import type { StartedTestContainer } from "testcontainers";

export default async function globalTeardown() {
	await (
		globalThis as unknown as { __ETCD_CONTAINER__: StartedTestContainer }
	).__ETCD_CONTAINER__?.stop();
}
