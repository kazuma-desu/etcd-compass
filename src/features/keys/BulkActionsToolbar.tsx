import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useKeysStore } from "./keys-store";

export function BulkActionsToolbar() {
	const {
		selectAllKeysOnPage,
		deselectAllKeys,
		setShowBulkDeleteDialog,
		exportSelectedKeys,
		getSelectedKeysCount,
		areAllKeysOnPageSelected,
		keys,
	} = useKeysStore();

	const selectedCount = getSelectedKeysCount();
	const allSelected = areAllKeysOnPageSelected();
	const hasKeys = keys.length > 0;

	if (!hasKeys) return null;

	return (
		<div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
			<div className="flex items-center gap-3">
				<div className="flex items-center gap-2">
					<Checkbox
						checked={allSelected}
						onCheckedChange={(checked) => {
							if (checked) {
								selectAllKeysOnPage();
							} else {
								deselectAllKeys();
							}
						}}
						aria-label="Select all keys on page"
					/>
					<span className="text-sm text-muted-foreground">
						{allSelected ? "Deselect All" : "Select All"}
					</span>
				</div>
				{selectedCount > 0 && (
					<span className="text-sm font-medium text-primary">
						{selectedCount} key{selectedCount !== 1 ? "s" : ""} selected
					</span>
				)}
			</div>

			{selectedCount > 0 && (
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={exportSelectedKeys}
						className="h-8"
					>
						<Download className="w-4 h-4 mr-2" />
						Export
					</Button>
					<Button
						variant="destructive"
						size="sm"
						onClick={() => setShowBulkDeleteDialog(true)}
						className="h-8"
					>
						<Trash2 className="w-4 h-4 mr-2" />
						Delete
					</Button>
				</div>
			)}
		</div>
	);
}
