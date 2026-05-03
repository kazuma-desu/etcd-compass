import { GenericContainer, type StartedTestContainer } from "testcontainers";

export default async function globalSetup() {
	const container = await new GenericContainer(
		"gcr.io/etcd-development/etcd:v3.5.21",
	)
		.withExposedPorts(2379)
		.withCommand([
			"etcd",
			"--listen-client-urls",
			"http://0.0.0.0:2379",
			"--advertise-client-urls",
			"http://0.0.0.0:2379",
			"--listen-peer-urls",
			"http://0.0.0.0:2380",
			"--initial-advertise-peer-urls",
			"http://0.0.0.0:2380",
			"--initial-cluster",
			"default=http://0.0.0.0:2380",
		])
		.withWaitStrategy(
			(await import("testcontainers")).Wait.forLogMessage(
				/serving client traffic insecurely/,
			),
		)
		.start();

	const etcdPort = container.getMappedPort(2379);
	process.env.ETCD_ENDPOINT = `http://${container.getHost()}:${etcdPort}`;
	(
		globalThis as unknown as { __ETCD_CONTAINER__: StartedTestContainer }
	).__ETCD_CONTAINER__ = container;
}
