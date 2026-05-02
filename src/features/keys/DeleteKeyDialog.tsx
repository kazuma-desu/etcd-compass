import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useKeysStore } from "./keys-store";

interface DeleteKeyDialogProps {
	connectionId: string;
	setDialogOpen?: (open: boolean) => void;
}

export function DeleteKeyDialog({ connectionId, setDialogOpen }: DeleteKeyDialogProps) {
	const { showDeleteDialog, selectedKey, setShowDeleteDialog, deleteKey } =
		useKeysStore();

	const handleOpenChange = (open: boolean) => {
		setShowDeleteDialog(open);
		setDialogOpen?.(open);
	};

	return (
		<Dialog open={showDeleteDialog} onOpenChange={handleOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete Key</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete{" "}
						<code className="text-primary">{selectedKey?.key}</code>? This
						action cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => handleOpenChange(false)}>
						Cancel
					</Button>
					<Button variant="destructive" onClick={() => deleteKey(connectionId)}>
						<Trash2 className="w-4 h-4 mr-2" />
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
