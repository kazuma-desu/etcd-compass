import { Key } from "lucide-react";
import type { EtcdKey } from "@/commands/types";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
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
		<div className="p-3 space-y-2 bg-secondary/10 min-h-full">
			{keys.map((key) => (
				<div
					key={key.key}
					role="button"
					tabIndex={0}
					aria-pressed={selectedKey?.key === key.key}
					data-testid={`flatview-card-${key.key}`}
					className={cn(
						"border rounded-lg p-3 bg-card/90 hover:border-primary/45 transition-[border-color,box-shadow,transform,background-color] duration-200 cursor-pointer active:translate-y-px",
						selectedKey?.key === key.key
							? "ring-1 ring-primary/70 border-primary shadow-panel bg-primary/5"
							: "border-border/60 shadow-xs hover:shadow-panel",
					)}
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
							<span className="text-sm font-mono font-semibold text-primary break-all">
								{key.key}
							</span>
						</div>
					</div>
					<div className="pl-8 pr-2">
						<div className="relative">
							<pre className="text-xs font-mono text-muted-foreground bg-background/75 p-2.5 rounded-md max-h-40 overflow-hidden whitespace-pre-wrap break-words break-all border border-border/50">
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
