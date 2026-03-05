import { Plus } from "lucide-react";
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
	connectionId: string;
}

export function AddKeyDialog({ connectionId }: AddKeyDialogProps) {
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

	return (
		<Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
			<DialogContent>
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
					<Button variant="outline" onClick={() => setShowAddDialog(false)}>
						Cancel
					</Button>
					<Button
						onClick={() => addKey(connectionId, newKeyLeaseId || undefined)}
						disabled={!newKey.trim()}
					>
						<Plus className="w-4 h-4 mr-2" />
						Add Key
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
