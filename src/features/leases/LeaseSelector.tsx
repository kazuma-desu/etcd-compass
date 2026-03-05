import { Clock, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useLeaseStore } from "./lease-store";

interface LeaseSelectorProps {
	connectionId: string;
	selectedLeaseId: number | null;
	onSelect: (leaseId: number | null) => void;
}

function formatDuration(seconds: number): string {
	if (seconds < 0) return "Expired";
	if (seconds < 60) return `${seconds}s`;
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	return `${hours}h ${minutes}m`;
}

export function LeaseSelector({
	connectionId,
	selectedLeaseId,
	onSelect,
}: LeaseSelectorProps) {
	const { leases, loadLeases } = useLeaseStore();

	const handleOpenChange = (open: boolean) => {
		if (open && leases.length === 0) {
			loadLeases(connectionId);
		}
	};

	const selectedLease = leases.find((l) => l.id === selectedLeaseId);

	return (
		<div className="space-y-2">
			<label className="text-sm font-medium">Lease (Optional)</label>

			{selectedLeaseId ? (
				<div className="flex items-center gap-2">
					<Badge variant="secondary" className="flex items-center gap-2">
						<Clock className="w-3 h-3" />
						<span>Lease {selectedLeaseId}</span>
						{selectedLease && (
							<span className="text-xs text-muted-foreground">
								({formatDuration(selectedLease.remaining)} remaining)
							</span>
						)}
					</Badge>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onSelect(null)}
						className="h-6 w-6 p-0"
					>
						<X className="w-3 h-3" />
					</Button>
				</div>
			) : (
				<Select
					onValueChange={(value) =>
						onSelect(value ? parseInt(value, 10) : null)
					}
					onOpenChange={handleOpenChange}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select a lease (optional)" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="">No lease</SelectItem>
						{leases.length === 0 ? (
							<SelectItem value="_loading" disabled>
								No active leases available
							</SelectItem>
						) : (
							leases.map((lease) => (
								<SelectItem key={lease.id} value={lease.id.toString()}>
									<div className="flex items-center gap-2">
										<span>Lease {lease.id}</span>
										<span className="text-xs text-muted-foreground">
											({formatDuration(lease.remaining)} /{" "}
											{formatDuration(lease.grantedTtl)})
										</span>
									</div>
								</SelectItem>
							))
						)}
					</SelectContent>
				</Select>
			)}

			<p className="text-xs text-muted-foreground">
				Attach a lease to make this key expire when the lease expires
			</p>
		</div>
	);
}
