import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LeaseSelector } from "@/features/leases/LeaseSelector";
import { useKeysStore } from "./keys-store";

interface EditKeyDialogProps {
	readonly connectionId: string;
	readonly setDialogOpen?: (open: boolean) => void;
}

export function EditKeyDialog({
	connectionId,
	setDialogOpen,
}: EditKeyDialogProps) {
	const {
		showEditDialog,
		selectedKey,
		editValue,
		editKeyLeaseId,
		setShowEditDialog,
		setEditValue,
		setEditKeyLeaseId,
		editKey,
	} = useKeysStore();

	const handleOpenChange = (open: boolean) => {
		setShowEditDialog(open);
		setDialogOpen?.(open);
	};

	return (
		<Dialog open={showEditDialog} onOpenChange={handleOpenChange}>
			<DialogContent data-testid="edit-key-dialog">
				<DialogHeader>
					<DialogTitle>Edit Key</DialogTitle>
					<DialogDescription>
						Update the value for{" "}
						<code className="text-primary">{selectedKey?.key}</code>
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="edit-value">New Value</Label>
						<Input
							id="edit-value"
							value={editValue}
							onChange={(e) => setEditValue(e.target.value)}
						/>
					</div>
					<LeaseSelector
						connectionId={connectionId}
						selectedLeaseId={editKeyLeaseId}
						onSelect={setEditKeyLeaseId}
					/>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => handleOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={async () => {
							try {
								await editKey(connectionId, editKeyLeaseId || undefined);
								handleOpenChange(false);
							} catch (error) {
								toast.error(
									error instanceof Error
										? error.message
										: "Failed to update key",
								);
								console.error(error);
							}
						}}
					>
						<Check className="w-4 h-4 mr-2" />
						Save Changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
