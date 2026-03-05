import { Key } from "lucide-react";
import type { EtcdKey } from "@/commands/types";
import { Checkbox } from "@/components/ui/checkbox";
import { useKeysStore } from "./keys-store";

interface FlatViewProps {
	keys: EtcdKey[];
}

export function FlatView({ keys }: FlatViewProps) {
	const {
		selectedKey,
		setSelectedKey,
		toggleKeySelectionForBulk,
		isKeySelected,
	} = useKeysStore();

	if (keys.length === 0) {
		return (
			<div className="text-center py-8 text-muted-foreground">
				No keys found
			</div>
		);
	}

	return (
		<div className="p-2">
			{keys.map((key) => (
				<div
					key={key.key}
					className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent ${
						selectedKey?.key === key.key ? "bg-accent" : ""
					}`}
					onClick={() => setSelectedKey(key)}
				>
					<div onClick={(e) => e.stopPropagation()}>
						<Checkbox
							checked={isKeySelected(key.key)}
							onCheckedChange={() => toggleKeySelectionForBulk(key.key)}
							aria-label={`Select ${key.key}`}
						/>
					</div>
					<Key className="w-4 h-4 text-primary" />
					<div className="flex-1 min-w-0">
						<div className="text-sm font-medium truncate">{key.key}</div>
						<div className="text-xs text-muted-foreground truncate">
							{key.value}
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
