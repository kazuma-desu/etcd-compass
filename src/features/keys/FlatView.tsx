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
		<div className="p-4 space-y-3 bg-secondary/10 min-h-full">
			{keys.map((key) => (
				<div
					key={key.key}
					role="button"
					tabIndex={0}
					aria-pressed={selectedKey?.key === key.key}
					data-testid={`flatview-card-${key.key}`}
					className={`border rounded-lg p-3 bg-card hover:border-primary/40 transition-shadow shadow-sm cursor-pointer ${
						selectedKey?.key === key.key
							? "ring-1 ring-primary border-primary shadow-md"
							: "border-border/60"
					}`}
					onClick={() => setSelectedKey(key)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							setSelectedKey(key);
						}
					}}
				>
					<div className="flex items-start justify-between mb-2">
						<div className="flex items-center gap-2">
							<div onClick={(e) => e.stopPropagation()}>
								<Checkbox
									checked={isKeySelected(key.key)}
									onCheckedChange={() => toggleKeySelectionForBulk(key.key)}
									aria-label={`Select ${key.key}`}
									className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
								/>
							</div>
							<Key className="w-4 h-4 text-primary shrink-0" />
							<span className="text-sm font-mono font-semibold text-emerald-700 dark:text-emerald-500 break-all">
								{key.key}
							</span>
						</div>
					</div>
					<div className="pl-8 pr-2">
						<div className="relative">
							<pre className="text-xs font-mono text-muted-foreground bg-secondary/30 p-2.5 rounded-md max-h-40 overflow-hidden whitespace-pre-wrap break-words break-all border border-border/50">
								{key.value}
							</pre>
							<div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-secondary/30 to-transparent pointer-events-none rounded-b-md" />
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
