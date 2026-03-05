import { Check } from "lucide-react";
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
	connectionId: string;
}

export function EditKeyDialog({ connectionId }: EditKeyDialogProps) {
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

	return (
		<Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
			<DialogContent>
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
					<Button variant="outline" onClick={() => setShowEditDialog(false)}>
						Cancel
					</Button>
					<Button
						onClick={() => editKey(connectionId, editKeyLeaseId || undefined)}
					>
						<Check className="w-4 h-4 mr-2" />
						Save Changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
