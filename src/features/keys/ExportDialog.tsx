import { CheckSquare, Download, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useKeysStore } from "./keys-store";

interface ExportDialogProps {
	connectionId: string;
}

export function ExportDialog({ connectionId }: ExportDialogProps) {
	const {
		showExportDialog,
		setShowExportDialog,
		keys,
		selectedKeysForExport,
		exportKeys,
		toggleKeySelection,
		selectAllKeysForExport,
		deselectAllKeysForExport,
	} = useKeysStore();

	const selectedCount = selectedKeysForExport.size;
	const totalCount = keys.length;

	const handleExportSelected = () => {
		exportKeys(connectionId, true);
	};

	const handleExportAll = () => {
		exportKeys(connectionId, false);
	};

	return (
		<Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Export Keys</DialogTitle>
					<DialogDescription>
						Choose which keys to export as JSON
					</DialogDescription>
				</DialogHeader>

				<div className="py-4">
					<div className="flex items-center justify-between mb-4">
						<span className="text-sm text-muted-foreground">
							{selectedCount} of {totalCount} selected
						</span>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={selectAllKeysForExport}
							>
								<CheckSquare className="w-4 h-4 mr-2" />
								Select All
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={deselectAllKeysForExport}
							>
								<Square className="w-4 h-4 mr-2" />
								Deselect All
							</Button>
						</div>
					</div>

					<ScrollArea className="h-[300px] border rounded-md">
						<div className="p-2 space-y-1">
							{keys.map((key) => (
								<div
									key={key.key}
									className="flex items-center gap-3 p-2 hover:bg-muted rounded-sm"
								>
									<Checkbox
										checked={selectedKeysForExport.has(key.key)}
										onCheckedChange={() => toggleKeySelection(key.key)}
									/>
									<div className="flex-1 min-w-0">
										<div className="font-mono text-sm truncate">{key.key}</div>
										<div className="text-xs text-muted-foreground truncate">
											{key.value.substring(0, 100)}
											{key.value.length > 100 ? "..." : ""}
										</div>
									</div>
								</div>
							))}
							{keys.length === 0 && (
								<div className="text-center py-8 text-muted-foreground">
									No keys loaded. Please refresh to load keys.
								</div>
							)}
						</div>
					</ScrollArea>
				</div>

				<DialogFooter className="flex justify-between sm:justify-between">
					<Button variant="outline" onClick={() => setShowExportDialog(false)}>
						Cancel
					</Button>
					<div className="flex gap-2">
						<Button
							variant="secondary"
							onClick={handleExportSelected}
							disabled={selectedCount === 0}
						>
							<Download className="w-4 h-4 mr-2" />
							Export Selected ({selectedCount})
						</Button>
						<Button onClick={handleExportAll} disabled={totalCount === 0}>
							<Download className="w-4 h-4 mr-2" />
							Export All ({totalCount})
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
