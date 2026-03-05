import { toast } from "sonner";
import { create } from "zustand";
import {
	leaseGrant,
	leaseKeepalive,
	leaseList,
	leaseRevoke,
	leaseTimeToLive,
} from "@/commands/lease";

export interface Lease {
	id: number;
	ttl: number;
	grantedTtl: number;
	remaining: number;
	keys: string[];
}

interface LeaseState {
	leases: Lease[];
	isLoading: boolean;
	selectedLeaseId: number | null;
	showGrantDialog: boolean;
	showRevokeDialog: boolean;
	grantTtl: string;

	setSelectedLeaseId: (id: number | null) => void;
	setShowGrantDialog: (show: boolean) => void;
	setShowRevokeDialog: (show: boolean) => void;
	setGrantTtl: (ttl: string) => void;

	loadLeases: (connectionId: string) => Promise<void>;
	grantLease: (connectionId: string) => Promise<void>;
	revokeLease: (connectionId: string, leaseId: number) => Promise<void>;
	keepaliveLease: (connectionId: string, leaseId: number) => Promise<void>;
	getLeaseInfo: (
		connectionId: string,
		leaseId: number,
	) => Promise<Lease | null>;
}

export const useLeaseStore = create<LeaseState>((set, get) => ({
	leases: [],
	isLoading: false,
	selectedLeaseId: null,
	showGrantDialog: false,
	showRevokeDialog: false,
	grantTtl: "60",

	setSelectedLeaseId: (id) => set({ selectedLeaseId: id }),
	setShowGrantDialog: (show) => set({ showGrantDialog: show }),
	setShowRevokeDialog: (show) => set({ showRevokeDialog: show }),
	setGrantTtl: (ttl) => set({ grantTtl: ttl }),

	loadLeases: async (connectionId: string) => {
		set({ isLoading: true });
		try {
			const leaseIds = await leaseList(connectionId);

			const leases: Lease[] = [];
			for (const id of leaseIds) {
				try {
					const info = await leaseTimeToLive(connectionId, id);
					leases.push({
						id: info.id,
						ttl: info.ttl,
						grantedTtl: info.granted_ttl,
						remaining: info.ttl,
						keys: info.keys,
					});
				} catch (e: unknown) {
					toast.error(
						`Failed to get lease info for ${id}: ${e instanceof Error ? e.message : String(e)}`,
					);
				}
			}

			set({ leases, isLoading: false });
		} catch (error: unknown) {
			set({ isLoading: false });
			toast.error(
				"Failed to load leases: " +
					(error instanceof Error ? error.message : String(error)),
			);
		}
	},

	grantLease: async (connectionId: string) => {
		const { grantTtl, leases } = get();
		const ttl = parseInt(grantTtl, 10);

		if (Number.isNaN(ttl) || ttl <= 0) {
			toast.error("Invalid TTL value");
			return;
		}

		try {
			const leaseId = await leaseGrant(connectionId, ttl);

			toast.success(`Lease granted: ${leaseId}`);

			const newLease: Lease = {
				id: leaseId,
				ttl: ttl,
				grantedTtl: ttl,
				remaining: ttl,
				keys: [],
			};

			set({
				leases: [...leases, newLease],
				showGrantDialog: false,
				grantTtl: "60",
			});
		} catch (error: unknown) {
			toast.error(
				"Failed to grant lease: " +
					(error instanceof Error ? error.message : String(error)),
			);
		}
	},

	revokeLease: async (connectionId: string, leaseId: number) => {
		try {
			await leaseRevoke(connectionId, leaseId);
			toast.success(`Lease ${leaseId} revoked`);

			const { leases } = get();
			set({
				leases: leases.filter((l) => l.id !== leaseId),
				showRevokeDialog: false,
				selectedLeaseId: null,
			});
		} catch (error: unknown) {
			toast.error(
				"Failed to revoke lease: " +
					(error instanceof Error ? error.message : String(error)),
			);
		}
	},

	keepaliveLease: async (connectionId: string, leaseId: number) => {
		try {
			await leaseKeepalive(connectionId, leaseId);
			toast.success(`Lease ${leaseId} kept alive`);

			await get().getLeaseInfo(connectionId, leaseId);
		} catch (error: unknown) {
			toast.error(
				"Failed to keepalive lease: " +
					(error instanceof Error ? error.message : String(error)),
			);
		}
	},

	getLeaseInfo: async (connectionId: string, leaseId: number) => {
		try {
			const info = await leaseTimeToLive(connectionId, leaseId);

			const updatedLease: Lease = {
				id: info.id,
				ttl: info.ttl,
				grantedTtl: info.granted_ttl,
				remaining: info.ttl,
				keys: info.keys,
			};

			const { leases } = get();
			const index = leases.findIndex((l) => l.id === leaseId);
			if (index >= 0) {
				const newLeases = [...leases];
				newLeases[index] = updatedLease;
				set({ leases: newLeases });
			}

			return updatedLease;
		} catch (error: unknown) {
			toast.error(
				"Failed to get lease info: " +
					(error instanceof Error ? error.message : String(error)),
			);
			return null;
		}
	},
}));
