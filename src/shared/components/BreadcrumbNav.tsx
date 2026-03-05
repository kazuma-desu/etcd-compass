import { Database, Folder, Key } from "lucide-react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useConnectionStore } from "@/features/connections/connection-store";
import { useKeysStore } from "@/features/keys/keys-store";

export function BreadcrumbNav() {
	const { config } = useConnectionStore();
	const { selectedKey } = useKeysStore();

	const clusterName = config.endpoint || "Cluster";

	return (
		<Breadcrumb className="py-2">
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink className="flex items-center gap-1">
						<Database className="h-3.5 w-3.5" />
						{clusterName}
					</BreadcrumbLink>
				</BreadcrumbItem>

				{selectedKey && (
					<>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbLink className="flex items-center gap-1">
								<Folder className="h-3.5 w-3.5" />
								Keys
							</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage className="flex items-center gap-1">
								<Key className="h-3.5 w-3.5" />
								<span className="max-w-[300px] truncate">
									{selectedKey.key}
								</span>
							</BreadcrumbPage>
						</BreadcrumbItem>
					</>
				)}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
