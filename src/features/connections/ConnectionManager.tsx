import {
	ArrowLeft,
	Database,
	Eye,
	EyeOff,
	History,
	Lock,
	Plus,
	RefreshCw,
	Server,
	User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useKeysStore } from "@/features/keys/keys-store";
import { useConnectionStore } from "./connection-store";

interface ConnectionManagerProps {
	onConnect: (connectionId: string) => void;
}

export function ConnectionManager({ onConnect }: ConnectionManagerProps) {
	const [showForm, setShowForm] = useState(false);
	const {
		config,
		isConnecting,
		connectionError,
		connectionHistory,
		showPassword,
		showHistory,
		setConfig,
		setShowPassword,
		setShowHistory,
		loadSavedConnection,
		loadConnectionHistory,
		connect,
		selectFromHistory,
	} = useConnectionStore();

	const { setSelectedKey, setSearchQuery } = useKeysStore();

	useEffect(() => {
		loadSavedConnection();
		loadConnectionHistory();
	}, [loadConnectionHistory, loadSavedConnection]);

	const handleConnect = async () => {
		const success = await connect();
		if (success) {
			const { connectionId } = useConnectionStore.getState();
			if (connectionId) {
				setSelectedKey(null);
				setSearchQuery("");
				onConnect(connectionId);
			}
		}
	};

	const handleSelectFromHistory = (hist: (typeof connectionHistory)[0]) => {
		selectFromHistory(hist);
		setShowForm(true);
	};

	if (!showForm) {
		return (
			<div className="flex-1 flex items-center justify-center p-8">
				<div className="text-center max-w-md">
					<div className="mx-auto w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center mb-6">
						<Database className="w-12 h-12 text-primary" />
					</div>
					<h1 className="text-3xl font-semibold mb-3">
						Welcome to ETCD Desktop
					</h1>
					<p className="text-muted-foreground mb-8">
						To get started, connect to an existing ETCD cluster or add a new
						connection
					</p>
					<Button
						size="lg"
						onClick={() => setShowForm(true)}
						className="w-full max-w-xs"
					>
						<Plus className="w-5 h-5 mr-2" />
						Add new connection
					</Button>

					{connectionHistory.length > 0 && (
						<div className="mt-8">
							<p className="text-sm text-muted-foreground mb-3">
								Or connect to a recent cluster:
							</p>
							<div className="flex flex-wrap justify-center gap-2">
								{connectionHistory.slice(0, 5).map((hist, idx) => (
									<Button
										key={idx}
										variant="outline"
										size="sm"
										onClick={() => handleSelectFromHistory(hist)}
									>
										<Database className="w-4 h-4 mr-2" />
										{hist.endpoint}
									</Button>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 flex items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
						<Database className="w-8 h-8 text-primary" />
					</div>
					<CardTitle className="text-2xl">Add Connection</CardTitle>
					<CardDescription>
						Connect to your ETCD server to manage keys
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="endpoint">
							<Server className="w-4 h-4 inline mr-1" />
							Server Endpoint
						</Label>
						<Input
							id="endpoint"
							placeholder="localhost:2379"
							value={config.endpoint}
							onChange={(e) =>
								setConfig({ ...config, endpoint: e.target.value })
							}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="username">
							<User className="w-4 h-4 inline mr-1" />
							Username
						</Label>
						<Input
							id="username"
							placeholder="root (optional)"
							value={config.username}
							onChange={(e) =>
								setConfig({ ...config, username: e.target.value })
							}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="password">
							<Lock className="w-4 h-4 inline mr-1" />
							Password
						</Label>
						<div className="relative">
							<Input
								id="password"
								type={showPassword ? "text" : "password"}
								placeholder="Enter password (optional)"
								value={config.password}
								onChange={(e) =>
									setConfig({ ...config, password: e.target.value })
								}
							/>
							<Button
								variant="ghost"
								size="icon"
								className="absolute right-0 top-0 h-full"
								onClick={() => setShowPassword(!showPassword)}
							>
								{showPassword ? (
									<EyeOff className="w-4 h-4" />
								) : (
									<Eye className="w-4 h-4" />
								)}
							</Button>
						</div>
					</div>

					{connectionHistory.length > 0 && (
						<div className="relative">
							<Button
								variant="outline"
								className="w-full"
								onClick={() => setShowHistory(!showHistory)}
							>
								<History className="w-4 h-4 mr-2" />
								Recent Connections
							</Button>

							{showHistory && (
								<Card className="absolute z-10 w-full mt-1">
									<CardContent className="p-2">
										{connectionHistory.map((hist, idx) => (
											<div
												key={idx}
												className="flex items-center justify-between p-2 hover:bg-accent rounded cursor-pointer"
												onClick={() => selectFromHistory(hist)}
											>
												<div>
													<div className="font-medium">{hist.endpoint}</div>
													{hist.username && (
														<div className="text-xs text-muted-foreground">
															{hist.username}
														</div>
													)}
												</div>
												<Button
													variant="ghost"
													size="sm"
													onClick={(e) => {
														e.stopPropagation();
														selectFromHistory(hist);
													}}
												>
													Connect
												</Button>
											</div>
										))}
									</CardContent>
								</Card>
							)}
						</div>
					)}

					{connectionError && (
						<div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
							{connectionError}
						</div>
					)}

					<Button
						className="w-full"
						onClick={handleConnect}
						disabled={isConnecting}
					>
						{isConnecting ? (
							<RefreshCw className="w-4 h-4 mr-2 animate-spin" />
						) : (
							<Database className="w-4 h-4 mr-2" />
						)}
						{isConnecting ? "Connecting..." : "Connect"}
					</Button>

					<Button
						variant="ghost"
						className="w-full"
						onClick={() => setShowForm(false)}
					>
						<ArrowLeft className="w-4 h-4 mr-2" />
						Back to welcome
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
