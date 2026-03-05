import { zodResolver } from "@hookform/resolvers/zod";
import {
	AlertCircle,
	Check,
	FileText,
	FolderOpen,
	Heart,
	Link,
	Lock,
	Save,
	Server,
	Settings,
	Shield,
	TestTube,
	User,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { saveConnection } from "@/commands/config";
import { connectEtcd, testConnection } from "@/commands/connection";
import { openFileDialog } from "@/commands/native";
import type { EtcdConfig } from "@/commands/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/shared/utils";
import {
	type ConnectionFormValues,
	connectionSchema,
	defaultConnectionValues,
	extractNameFromEndpoint,
	favoriteColors,
} from "./connection-schema";
import { useConnectionStore } from "./connection-store";

interface ConnectionFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConnect: (connectionId: string) => void;
}

export function ConnectionForm({
	open,
	onOpenChange,
	onConnect,
}: ConnectionFormProps) {
	const { setActiveConnectionId, loadConnectionHistory } = useConnectionStore();
	const [activeTab, setActiveTab] = useState("general");
	const [isTesting, setIsTesting] = useState(false);
	const [isConnecting, setIsConnecting] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [testResult, setTestResult] = useState<{
		success: boolean;
		message: string;
	} | null>(null);
	const [showSaveFavorite, setShowSaveFavorite] = useState(false);

	const form = useForm<ConnectionFormValues>({
		resolver: zodResolver(connectionSchema),
		defaultValues: defaultConnectionValues,
		mode: "onChange",
	});

	// Auto-generate name from endpoint when name is empty
	const endpoint = form.watch("endpoint");
	const name = form.watch("name");

	useEffect(() => {
		if (!name && endpoint) {
			const generatedName = extractNameFromEndpoint(endpoint);
			if (generatedName) {
				form.setValue("name", generatedName, { shouldValidate: false });
			}
		}
	}, [endpoint, name, form]);

	const handleTestConnection = async () => {
		const values = form.getValues();

		if (!values.endpoint) {
			form.setError("endpoint", { message: "Endpoint is required" });
			setActiveTab("general");
			return;
		}

		setIsTesting(true);
		setTestResult(null);

		try {
			await testConnection({
				endpoint: values.endpoint,
				username: values.username || undefined,
				password: values.password || undefined,
				tls_enabled: values.tlsEnabled,
				ca_cert_path: values.caCertPath || undefined,
				client_cert_path: values.clientCertPath || undefined,
				client_key_path: values.clientKeyPath || undefined,
				skip_verify: values.skipVerify,
			});
			setTestResult({
				success: true,
				message: "Connection successful",
			});
		} catch (error: unknown) {
			setTestResult({
				success: false,
				message: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setIsTesting(false);
		}
	};

	const handleConnect = async (values: ConnectionFormValues) => {
		setIsConnecting(true);

		try {
			const config: EtcdConfig = {
				endpoint: values.endpoint,
				username: values.username || undefined,
				password: values.password || undefined,
				name: values.name || undefined,
				color: values.favoriteColor || undefined,
				isFavorite: values.isFavorite,
				group: values.group || undefined,
				tls_enabled: values.tlsEnabled,
				ca_cert_path: values.caCertPath || undefined,
				client_cert_path: values.clientCertPath || undefined,
				client_key_path: values.clientKeyPath || undefined,
				skip_verify: values.skipVerify,
			};

			const connectionId = await connectEtcd(config);
			setActiveConnectionId(connectionId);

			// Save to history
			await saveConnection(config);

			toast.success("Connected to ETCD successfully");
			form.reset(defaultConnectionValues);
			setTestResult(null);
			onOpenChange(false);
			onConnect(connectionId);
			loadConnectionHistory();
		} catch (error: unknown) {
			toast.error(
				"Failed to connect: " +
					(error instanceof Error ? error.message : String(error)),
			);
		} finally {
			setIsConnecting(false);
		}
	};

	const handleSaveFavorite = async () => {
		const values = form.getValues();

		if (!values.endpoint) {
			form.setError("endpoint", { message: "Endpoint is required" });
			setActiveTab("general");
			return;
		}

		setIsSaving(true);

		try {
			await saveConnection({
				endpoint: values.endpoint,
				username: values.username || undefined,
				password: values.password || undefined,
				name: values.name || undefined,
				color: values.favoriteColor || undefined,
				isFavorite: true,
				group: values.group || undefined,
				tls_enabled: values.tlsEnabled,
				ca_cert_path: values.caCertPath || undefined,
				client_cert_path: values.clientCertPath || undefined,
				client_key_path: values.clientKeyPath || undefined,
				skip_verify: values.skipVerify,
			});
			toast.success("Connection saved to favorites");
			setShowSaveFavorite(false);
			loadConnectionHistory();
		} catch (error: unknown) {
			toast.error(
				"Failed to save: " +
					(error instanceof Error ? error.message : String(error)),
			);
		} finally {
			setIsSaving(false);
		}
	};

	const pickFile = async (
		field: "caCertPath" | "clientCertPath" | "clientKeyPath",
	) => {
		try {
			const selected = await openFileDialog(
				[
					{
						name: "Certificate Files",
						extensions: ["pem", "crt", "key", "cer"],
					},
					{ name: "All Files", extensions: ["*"] },
				],
				false,
			);

			if (selected && typeof selected === "string") {
				form.setValue(field, selected, { shouldValidate: true });
			}
		} catch (_error) {
			toast.error("Failed to pick file");
		}
	};

	const onSubmit = (values: ConnectionFormValues) => {
		handleConnect(values);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
				<DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
							<Server className="h-5 w-5 text-primary" />
						</div>
						<div>
							<DialogTitle className="text-xl">New Connection</DialogTitle>
							<DialogDescription className="text-sm text-muted-foreground">
								Configure your ETCD cluster connection
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="flex flex-col h-full"
					>
						<Tabs
							value={activeTab}
							onValueChange={setActiveTab}
							className="flex-1"
						>
							<div className="px-6 pt-4 overflow-x-auto">
								<TabsList className="w-full flex min-w-max h-10">
									<TabsTrigger value="general" className="flex-1 gap-2">
										<Server className="h-4 w-4" />
										<span className="hidden sm:inline">General</span>
									</TabsTrigger>
									<TabsTrigger value="auth" className="gap-2">
										<User className="h-4 w-4" />
										<span className="hidden sm:inline">Auth</span>
									</TabsTrigger>
									<TabsTrigger value="tls" className="gap-2">
										<Shield className="h-4 w-4" />
										<span className="hidden sm:inline">TLS</span>
									</TabsTrigger>
									<TabsTrigger value="advanced" className="gap-2">
										<Settings className="h-4 w-4" />
										<span className="hidden sm:inline">Advanced</span>
									</TabsTrigger>
								</TabsList>
							</div>

							<div className="px-6 py-4 min-h-[320px] max-h-[60vh] overflow-y-auto">
								<TabsContent value="general" className="mt-0 space-y-4">
									<FormField
										control={form.control}
										name="name"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Connection Name</FormLabel>
												<FormControl>
													<Input
														placeholder="My Cluster (auto-generated from endpoint)"
														{...field}
													/>
												</FormControl>
												<FormDescription>
													A friendly name to identify this connection
												</FormDescription>
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="endpoint"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Endpoint *</FormLabel>
												<FormControl>
													<Input placeholder="localhost:2379" {...field} />
												</FormControl>
												<FormDescription>
													ETCD server endpoint (host:port)
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="group"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Group / Folder</FormLabel>
												<FormControl>
													<Input
														placeholder="Production, Staging, etc. (optional)"
														{...field}
													/>
												</FormControl>
												<FormDescription>
													Organize connections into groups
												</FormDescription>
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="isFavorite"
										render={({ field }) => (
											<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
												<div className="space-y-0.5">
													<FormLabel className="text-base flex items-center gap-2">
														<Heart className="h-4 w-4" />
														Add to Favorites
													</FormLabel>
													<FormDescription>
														Pin this connection to the top of the sidebar
													</FormDescription>
												</div>
												<FormControl>
													<Switch
														checked={field.value}
														onCheckedChange={field.onChange}
													/>
												</FormControl>
											</FormItem>
										)}
									/>

									{testResult && (
										<Alert
											variant={testResult.success ? "default" : "destructive"}
											className="mt-4"
										>
											{testResult.success ? (
												<Check className="h-4 w-4" />
											) : (
												<AlertCircle className="h-4 w-4" />
											)}
											<AlertDescription>{testResult.message}</AlertDescription>
										</Alert>
									)}
								</TabsContent>

								<TabsContent value="auth" className="mt-0 space-y-4">
									<FormField
										control={form.control}
										name="username"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="flex items-center gap-2">
													<User className="h-4 w-4" />
													Username
												</FormLabel>
												<FormControl>
													<Input placeholder="root (optional)" {...field} />
												</FormControl>
												<FormDescription>
													Authentication username (optional)
												</FormDescription>
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="password"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="flex items-center gap-2">
													<Lock className="h-4 w-4" />
													Password
												</FormLabel>
												<FormControl>
													<Input
														type="password"
														placeholder="Enter password (optional)"
														{...field}
													/>
												</FormControl>
												<FormDescription>
													Authentication password (optional)
												</FormDescription>
											</FormItem>
										)}
									/>
								</TabsContent>

								<TabsContent value="tls" className="mt-0 space-y-4">
									<FormField
										control={form.control}
										name="tlsEnabled"
										render={({ field }) => (
											<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
												<div className="space-y-0.5">
													<FormLabel className="text-base flex items-center gap-2">
														<Shield className="h-4 w-4" />
														Enable TLS
													</FormLabel>
													<FormDescription>
														Use TLS encryption for the connection
													</FormDescription>
												</div>
												<FormControl>
													<Switch
														checked={field.value}
														onCheckedChange={field.onChange}
													/>
												</FormControl>
											</FormItem>
										)}
									/>

									{form.watch("tlsEnabled") && (
										<div className="space-y-4 pt-2">
											<FormField
												control={form.control}
												name="skipVerify"
												render={({ field }) => (
													<FormItem className="flex flex-row items-start space-x-3 space-y-0">
														<FormControl>
															<Switch
																checked={field.value}
																onCheckedChange={field.onChange}
															/>
														</FormControl>
														<div className="space-y-1 leading-none">
															<FormLabel>
																Skip certificate verification
															</FormLabel>
															<FormDescription>
																Allow insecure TLS connections (not recommended
																for production)
															</FormDescription>
														</div>
													</FormItem>
												)}
											/>

											<Separator />

											<FormField
												control={form.control}
												name="caCertPath"
												render={({ field }) => (
													<FormItem>
														<FormLabel className="flex items-center gap-2">
															<FileText className="h-4 w-4" />
															CA Certificate
														</FormLabel>
														<div className="flex gap-2">
															<FormControl>
																<Input
																	placeholder="Path to CA certificate (.pem, .crt)"
																	{...field}
																	readOnly
																/>
															</FormControl>
															<Button
																type="button"
																variant="outline"
																size="icon"
																onClick={() => pickFile("caCertPath")}
															>
																<FolderOpen className="h-4 w-4" />
															</Button>
														</div>
														<FormDescription>
															Root CA certificate for server verification
														</FormDescription>
													</FormItem>
												)}
											/>

											<FormField
												control={form.control}
												name="clientCertPath"
												render={({ field }) => (
													<FormItem>
														<FormLabel className="flex items-center gap-2">
															<FileText className="h-4 w-4" />
															Client Certificate
														</FormLabel>
														<div className="flex gap-2">
															<FormControl>
																<Input
																	placeholder="Path to client certificate (.pem, .crt)"
																	{...field}
																	readOnly
																/>
															</FormControl>
															<Button
																type="button"
																variant="outline"
																size="icon"
																onClick={() => pickFile("clientCertPath")}
															>
																<FolderOpen className="h-4 w-4" />
															</Button>
														</div>
														<FormDescription>
															Client certificate for mutual TLS authentication
														</FormDescription>
													</FormItem>
												)}
											/>

											<FormField
												control={form.control}
												name="clientKeyPath"
												render={({ field }) => (
													<FormItem>
														<FormLabel className="flex items-center gap-2">
															<FileText className="h-4 w-4" />
															Client Key
														</FormLabel>
														<div className="flex gap-2">
															<FormControl>
																<Input
																	placeholder="Path to client key (.pem, .key)"
																	{...field}
																	readOnly
																/>
															</FormControl>
															<Button
																type="button"
																variant="outline"
																size="icon"
																onClick={() => pickFile("clientKeyPath")}
															>
																<FolderOpen className="h-4 w-4" />
															</Button>
														</div>
														<FormDescription>
															Private key corresponding to the client
															certificate
														</FormDescription>
													</FormItem>
												)}
											/>
										</div>
									)}
								</TabsContent>

								<TabsContent value="advanced" className="mt-0 space-y-6">
									<FormField
										control={form.control}
										name="timeout"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="flex items-center justify-between">
													<span>Connection Timeout</span>
													<span className="text-muted-foreground text-sm">
														{field.value}s
													</span>
												</FormLabel>
												<FormControl>
													<Slider
														min={5}
														max={120}
														step={5}
														value={[field.value]}
														onValueChange={(value) => field.onChange(value[0])}
													/>
												</FormControl>
												<FormDescription>
													Maximum time to wait for connection establishment
												</FormDescription>
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="keepAlive"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="flex items-center justify-between">
													<span>Keep-Alive Interval</span>
													<span className="text-muted-foreground text-sm">
														{field.value}s
													</span>
												</FormLabel>
												<FormControl>
													<Slider
														min={10}
														max={300}
														step={10}
														value={[field.value]}
														onValueChange={(value) => field.onChange(value[0])}
													/>
												</FormControl>
												<FormDescription>
													Interval between keep-alive pings to maintain
													connection
												</FormDescription>
											</FormItem>
										)}
									/>

									<Separator />

									<div className="space-y-3">
										<Label className="flex items-center gap-2">
											<Heart className="h-4 w-4" />
											Favorite Color
										</Label>
										<FormField
											control={form.control}
											name="favoriteColor"
											render={({ field }) => (
												<FormItem>
													<div className="grid grid-cols-8 gap-2">
														{favoriteColors.map((color) => (
															<button
																key={color.value}
																type="button"
																onClick={() => field.onChange(color.value)}
																className={cn(
																	"h-8 w-full rounded-md transition-all",
																	color.class,
																	field.value === color.value
																		? "ring-2 ring-offset-2 ring-primary scale-110"
																		: "hover:scale-105 opacity-80 hover:opacity-100",
																)}
																title={color.label}
															/>
														))}
													</div>
													<FormDescription className="mt-2">
														Choose a color to identify this connection in the
														sidebar
													</FormDescription>
												</FormItem>
											)}
										/>
									</div>
								</TabsContent>
							</div>
						</Tabs>

						<div className="px-6 py-4 border-t bg-muted/30 flex flex-wrap justify-between gap-3">
							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={handleTestConnection}
									disabled={isTesting}
									className="gap-2"
								>
									{isTesting ? (
										<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
									) : (
										<TestTube className="h-4 w-4" />
									)}
									Test Connection
								</Button>

								<Button
									type="button"
									variant="outline"
									onClick={() => setShowSaveFavorite(!showSaveFavorite)}
									className="gap-2"
								>
									<Heart className="h-4 w-4" />
									Save as Favorite
								</Button>
							</div>

							<div className="flex gap-2">
								<Button
									type="button"
									variant="ghost"
									onClick={() => onOpenChange(false)}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={isConnecting} className="gap-2">
									{isConnecting ? (
										<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
									) : (
										<Link className="h-4 w-4" />
									)}
									Connect
								</Button>
							</div>
						</div>

						{showSaveFavorite && (
							<div className="px-6 py-3 border-t bg-amber-50 dark:bg-amber-950/20">
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">
										Save this connection configuration to favorites?
									</span>
									<div className="flex gap-2">
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => setShowSaveFavorite(false)}
										>
											<X className="h-4 w-4 mr-1" />
											Cancel
										</Button>
										<Button
											type="button"
											size="sm"
											onClick={handleSaveFavorite}
											disabled={isSaving}
											className="gap-1"
										>
											{isSaving ? (
												<div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
											) : (
												<Save className="h-3 w-3" />
											)}
											Save
										</Button>
									</div>
								</div>
							</div>
						)}
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
