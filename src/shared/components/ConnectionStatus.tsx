import { Loader2, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConnectionStatusProps {
	connectionId?: string | null;
	isConnecting: boolean;
	connectionError?: string | null;
	endpoint?: string;
	onRetry?: () => void;
}

export function ConnectionStatus({
	connectionId,
	isConnecting,
	connectionError,
	endpoint,
	onRetry,
}: ConnectionStatusProps) {
	let status: "connected" | "connecting" | "error" | "disconnected" =
		"disconnected";

	if (isConnecting) {
		status = "connecting";
	} else if (connectionError) {
		status = "error";
	} else if (connectionId) {
		status = "connected";
	}

	if (status === "disconnected") {
		return null;
	}

	const renderBadge = () => {
		if (status === "connected") {
			return (
				<Badge
					variant="outline"
					className="bg-green-500/10 text-green-500 border-green-500/20 transition-colors"
				>
					<Wifi className="size-3" />
					Connected
				</Badge>
			);
		}

		if (status === "connecting") {
			return (
				<Badge
					variant="outline"
					className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 transition-colors"
				>
					<Loader2 className="size-3 animate-spin" />
					Connecting
				</Badge>
			);
		}

		return (
			<Badge
				variant="outline"
				className="bg-red-500/10 text-red-500 border-red-500/20 transition-colors pr-1"
			>
				<WifiOff className="size-3" />
				Error
				{onRetry && (
					<button
						type="button"
						onClick={(e) => {
							e.preventDefault();
							onRetry();
						}}
						className="ml-1 rounded-full p-0.5 hover:bg-red-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40"
						title="Retry connection"
					>
						<RefreshCw className="size-3" />
					</button>
				)}
			</Badge>
		);
	};

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<div className="inline-flex items-center cursor-help">
					{renderBadge()}
				</div>
			</TooltipTrigger>
			<TooltipContent>
				<p className="font-medium">{endpoint || "Unknown endpoint"}</p>
				{status === "error" && connectionError && (
					<p className="text-red-400 mt-1 max-w-xs text-xs">
						{connectionError}
					</p>
				)}
			</TooltipContent>
		</Tooltip>
	);
}
