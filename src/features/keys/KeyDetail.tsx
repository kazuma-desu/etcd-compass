import { Clock, Edit, Key, Star, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useConnectionStore } from "@/features/connections/connection-store";
import { formatShortcut } from "@/shared/hooks/use-keyboard-shortcuts";
import { useBookmarksStore } from "./bookmarks-store";
import { useKeysStore } from "./keys-store";
import { ValueViewer } from "./ValueViewer";

export function KeyDetail() {
	const {
		openTabs,
		activeTab,
		setActiveTab,
		closeTab,
		keys,
		openEditDialog,
		setShowDeleteDialog,
	} = useKeysStore();
	const { connectionId } = useConnectionStore();
	const { addBookmark, removeBookmark, isBookmarked } = useBookmarksStore();

	if (openTabs.length === 0) {
		return (
			<div className="h-full flex items-center justify-center text-muted-foreground">
				<div className="text-center">
					<Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
					<p>Select a key to view details</p>
				</div>
			</div>
		);
	}

	const activeKeyData = keys.find((k) => k.key === activeTab);

	if (!activeKeyData) {
		return (
			<div className="h-full flex items-center justify-center text-muted-foreground">
				<p>Key data not found</p>
			</div>
		);
	}

	const bookmarked = connectionId
		? isBookmarked(connectionId, activeKeyData.key)
		: false;

	const toggleBookmark = () => {
		if (!connectionId) return;
		if (bookmarked) {
			removeBookmark(connectionId, activeKeyData.key);
		} else {
			addBookmark(connectionId, activeKeyData.key);
		}
	};

	return (
		<TooltipProvider delayDuration={300}>
			<Tabs
				value={activeTab || undefined}
				onValueChange={setActiveTab}
				className="h-full"
			>
				<div className="px-6 pt-6 pb-2">
					<TabsList>
						{openTabs.map((tab) => (
							<TabsTrigger
								key={tab.key}
								value={tab.key}
								className="flex items-center gap-2"
							>
								<span className="truncate max-w-[150px]">
									{tab.key.split("/").pop()}
								</span>
								<Button
									variant="ghost"
									size="icon"
									className="h-4 w-4 p-0 hover:bg-transparent"
									onClick={(e) => {
										e.stopPropagation();
										closeTab(tab.key);
									}}
								>
									<X className="w-3 h-3" />
								</Button>
							</TabsTrigger>
						))}
					</TabsList>
				</div>

				{openTabs.map((tab) => (
					<TabsContent key={tab.key} value={tab.key} className="p-6 space-y-6">
						<div className="flex items-center justify-between">
							<h2 className="text-lg font-semibold flex items-center gap-2">
								<Key className="w-5 h-5 text-primary" />
								Key Details
							</h2>
							<div className="flex gap-2">
								{connectionId && (
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="outline"
												size="icon"
												onClick={toggleBookmark}
												className="shrink-0"
											>
												<Star
													className={`w-4 h-4 ${
														bookmarked
															? "fill-amber-400 text-amber-400"
															: "text-muted-foreground"
													}`}
												/>
											</Button>
										</TooltipTrigger>
										<TooltipContent side="bottom">
											<span>
												{bookmarked ? "Remove bookmark" : "Add bookmark"}
											</span>
										</TooltipContent>
									</Tooltip>
								)}
								<Button variant="outline" size="sm" onClick={openEditDialog}>
									<Edit className="w-4 h-4 mr-2" />
									Edit
								</Button>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="destructive"
											size="sm"
											onClick={() => setShowDeleteDialog(true)}
										>
											<Trash2 className="w-4 h-4 mr-2" />
											Delete
										</Button>
									</TooltipTrigger>
									<TooltipContent side="bottom">
										<span>Delete key</span>
										<kbd className="ml-2 bg-muted px-1 rounded text-xs">
											{formatShortcut("Delete", false)}
										</kbd>
									</TooltipContent>
								</Tooltip>
							</div>
						</div>

						<Card>
							<CardContent className="p-4 space-y-4">
								<div>
									<Label className="text-muted-foreground text-xs uppercase">
										Key
									</Label>
									<div className="text-sm font-mono bg-muted p-2 rounded mt-1 break-all">
										{activeKeyData.key}
									</div>
								</div>

								<div className="h-[400px]">
									<Label className="text-muted-foreground text-xs uppercase">
										Value
									</Label>
									<div className="mt-1 h-[calc(100%-1.5rem)]">
										<ValueViewer value={activeKeyData.value} />
									</div>
								</div>

								<Separator />

								<div className="grid grid-cols-2 gap-4">
									<div>
										<Label className="text-muted-foreground text-xs uppercase">
											Version
										</Label>
										<div className="text-sm mt-1">{activeKeyData.version}</div>
									</div>
									<div>
										<Label className="text-muted-foreground text-xs uppercase">
											Create Revision
										</Label>
										<div className="text-sm mt-1">
											{activeKeyData.create_revision}
										</div>
									</div>
									<div>
										<Label className="text-muted-foreground text-xs uppercase">
											Mod Revision
										</Label>
										<div className="text-sm mt-1">
											{activeKeyData.mod_revision}
										</div>
									</div>
									<div>
										<Label className="text-muted-foreground text-xs uppercase">
											Lease
										</Label>
										<div className="text-sm mt-1">
											{activeKeyData.lease > 0 ? (
												<Badge
													variant="secondary"
													className="flex items-center gap-1 w-fit"
												>
													<Clock className="w-3 h-3" />
													<span className="font-mono">
														{activeKeyData.lease}
													</span>
												</Badge>
											) : (
												<span className="text-muted-foreground">None</span>
											)}
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				))}
			</Tabs>
		</TooltipProvider>
	);
}
