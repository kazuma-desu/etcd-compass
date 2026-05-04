import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
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

interface AddKeyDialogProps {
	readonly connectionId: string;
	readonly setDialogOpen?: (open: boolean) => void;
}

export function AddKeyDialog({
	connectionId,
	setDialogOpen,
}: AddKeyDialogProps) {
	const {
		showAddDialog,
		newKey,
		newValue,
		newKeyLeaseId,
		setShowAddDialog,
		setNewKey,
		setNewValue,
		setNewKeyLeaseId,
		addKey,
	} = useKeysStore();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleOpenChange = (open: boolean) => {
		if (isSubmitting) return;
		setShowAddDialog(open);
		setDialogOpen?.(open);
	};

	return (
		<Dialog open={showAddDialog} onOpenChange={handleOpenChange}>
			<DialogContent data-testid="add-key-dialog">
				<DialogHeader>
					<DialogTitle>Add New Key</DialogTitle>
					<DialogDescription>
						Create a new key-value pair in ETCD
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="new-key">Key Path</Label>
						<Input
							id="new-key"
							placeholder="e.g., config/app/name"
							value={newKey}
							onChange={(e) => setNewKey(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="new-value">Value</Label>
						<Input
							id="new-value"
							placeholder="Enter value..."
							value={newValue}
							onChange={(e) => setNewValue(e.target.value)}
						/>
					</div>
					<LeaseSelector
						connectionId={connectionId}
						selectedLeaseId={newKeyLeaseId}
						onSelect={setNewKeyLeaseId}
					/>
				</div>
				<DialogFooter>
					<Button
						variant="outline"
						disabled={isSubmitting}
						onClick={() => handleOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						onClick={async () => {
							if (isSubmitting) return;
							setIsSubmitting(true);
							try {
								await addKey(connectionId, newKeyLeaseId || undefined);
								handleOpenChange(false);
							} catch (error) {
								toast.error(
									error instanceof Error ? error.message : "Failed to add key",
								);
								console.error(error);
							} finally {
								setIsSubmitting(false);
							}
						}}
						disabled={!newKey.trim() || isSubmitting}
					>
						{isSubmitting ? (
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
						) : (
							<Plus className="w-4 h-4 mr-2" />
						)}
						Add Key
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
