import { AlertTriangle, Trash2 } from "lucide-react";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useKeysStore } from "./keys-store";

interface BulkDeleteDialogProps {
	connectionId: string;
}

export function BulkDeleteDialog({ connectionId }: BulkDeleteDialogProps) {
	const {
		showBulkDeleteDialog,
		setShowBulkDeleteDialog,
		getSelectedKeysCount,
		deleteSelectedKeys,
		isBulkOperationInProgress,
		bulkOperationProgress,
		selectedKeys,
	} = useKeysStore();

	const selectedCount = getSelectedKeysCount();

	const handleDelete = () => {
		deleteSelectedKeys(connectionId);
	};

	const selectedKeysList = Array.from(selectedKeys).slice(0, 5);
	const hasMore = selectedKeys.size > 5;

	return (
		<AlertDialog
			open={showBulkDeleteDialog}
			onOpenChange={setShowBulkDeleteDialog}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2">
						<AlertTriangle className="w-5 h-5 text-destructive" />
						Delete {selectedCount} Key{selectedCount !== 1 ? "s" : ""}?
					</AlertDialogTitle>
					<AlertDialogDescription className="space-y-3">
						<p>
							Are you sure you want to delete{" "}
							<strong>
								{selectedCount} key{selectedCount !== 1 ? "s" : ""}
							</strong>
							? This action cannot be undone.
						</p>

						<div className="bg-muted rounded-md p-3 text-xs font-mono space-y-1">
							{selectedKeysList.map((key) => (
								<div key={key} className="truncate text-muted-foreground">
									{key}
								</div>
							))}
							{hasMore && (
								<div className="text-muted-foreground italic">
									...and {selectedKeys.size - 5} more
								</div>
							)}
						</div>

						{isBulkOperationInProgress && (
							<div className="space-y-2 pt-2">
								<div className="flex justify-between text-sm text-muted-foreground">
									<span>
										Deleting keys...
										{bulkOperationProgress > 0 && ` ${bulkOperationProgress}%`}
									</span>
								</div>
								<Progress value={bulkOperationProgress} />
							</div>
						)}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isBulkOperationInProgress}>
						Cancel
					</AlertDialogCancel>
					{!isBulkOperationInProgress ? (
						<Button variant="destructive" onClick={handleDelete}>
							<Trash2 className="w-4 h-4 mr-2" />
							Delete {selectedCount} Key{selectedCount !== 1 ? "s" : ""}
						</Button>
					) : null}
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
