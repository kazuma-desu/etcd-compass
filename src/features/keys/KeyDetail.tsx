import { Clock, Edit, Key, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatShortcut } from "@/shared/hooks/use-keyboard-shortcuts";
import { useKeysStore } from "./keys-store";
import { ValueViewer } from "./ValueViewer";

export function KeyDetail() {
	const { selectedKey, openEditDialog, setShowDeleteDialog } = useKeysStore();

	if (!selectedKey) {
		return (
			<div className="h-full flex items-center justify-center text-muted-foreground">
				<div className="text-center">
					<Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
					<p>Select a key to view details</p>
				</div>
			</div>
		);
	}

	return (
		<TooltipProvider delayDuration={300}>
			<div className="p-6 space-y-6">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold flex items-center gap-2">
						<Key className="w-5 h-5 text-primary" />
						Key Details
					</h2>
					<div className="flex gap-2">
						<Button variant="outline" size="sm" onClick={openEditDialog}>
							<Edit className="w-4 h-4 mr-2" />
							Edit
						</Button>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="destructive"
									size="sm"
									onClick={() => setShowDeleteDialog(true)}
								>
									<Trash2 className="w-4 h-4 mr-2" />
									Delete
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								<span>Delete key</span>
								<kbd className="ml-2 bg-muted px-1 rounded text-xs">
									{formatShortcut("Delete", false)}
								</kbd>
							</TooltipContent>
						</Tooltip>
					</div>
				</div>

				<Card>
					<CardContent className="p-4 space-y-4">
						<div>
							<Label className="text-muted-foreground text-xs uppercase">
								Key
							</Label>
							<div className="text-sm font-mono bg-muted p-2 rounded mt-1 break-all">
								{selectedKey.key}
							</div>
						</div>

						<div className="h-[400px]">
							<Label className="text-muted-foreground text-xs uppercase">
								Value
							</Label>
							<div className="mt-1 h-[calc(100%-1.5rem)]">
								<ValueViewer value={selectedKey.value} />
							</div>
						</div>

						<Separator />

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label className="text-muted-foreground text-xs uppercase">
									Version
								</Label>
								<div className="text-sm mt-1">{selectedKey.version}</div>
							</div>
							<div>
								<Label className="text-muted-foreground text-xs uppercase">
									Create Revision
								</Label>
								<div className="text-sm mt-1">
									{selectedKey.create_revision}
								</div>
							</div>
							<div>
								<Label className="text-muted-foreground text-xs uppercase">
									Mod Revision
								</Label>
								<div className="text-sm mt-1">{selectedKey.mod_revision}</div>
							</div>
							<div>
								<Label className="text-muted-foreground text-xs uppercase">
									Lease
								</Label>
								<div className="text-sm mt-1">
									{selectedKey.lease > 0 ? (
										<Badge
											variant="secondary"
											className="flex items-center gap-1 w-fit"
										>
											<Clock className="w-3 h-3" />
											<span className="font-mono">{selectedKey.lease}</span>
										</Badge>
									) : (
										<span className="text-muted-foreground">None</span>
									)}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</TooltipProvider>
	);
}
