import {
	ArrowDownAZ,
	ArrowUpZA,
	ChevronDown,
	Download,
	FolderSearch,
	FolderTree,
	List,
	Plus,
	RefreshCw,
	Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useKeysStore } from "./keys-store";

interface QueryBarProps {
	connectionId?: string;
	searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function QueryBar({ connectionId, searchInputRef }: QueryBarProps) {
	const {
		searchQuery,
		viewMode,
		isLoading,
		keys,
		pagination,
		rangeStart,
		rangeEnd,
		sortAscending,
		recentQueries,
		setSearchQuery,
		setViewMode,
		setShowAddDialog,
		setShowExportDialog,
		importKeys,
		refreshKeys,
		getFilteredKeys,
		setPageSize,
		setRangeStart,
		setRangeEnd,
		setSortAscending,
		addRecentQuery,
		loadRecentQuery,
	} = useKeysStore();

	const [prefixInput, setPrefixInput] = useState(searchQuery);
	const [startKeyInput, setStartKeyInput] = useState(rangeStart);
	const [endKeyInput, setEndKeyInput] = useState(rangeEnd);

	useEffect(() => {
		const timer = setTimeout(() => {
			setSearchQuery(prefixInput);
		}, 300);
		return () => clearTimeout(timer);
	}, [prefixInput, setSearchQuery]);

	useEffect(() => {
		setPrefixInput(searchQuery);
	}, [searchQuery]);

	useEffect(() => {
		setStartKeyInput(rangeStart);
	}, [rangeStart]);

	useEffect(() => {
		setEndKeyInput(rangeEnd);
	}, [rangeEnd]);

	const filteredKeys = getFilteredKeys();

	const knownPrefixes = useMemo(() => {
		const prefixes = new Set<string>();
		keys.forEach((key) => {
			const parts = key.key.split("/").filter((p) => p);
			let current = "";
			parts.forEach((part, index) => {
				current = index === 0 ? part : `${current}/${part}`;
				prefixes.add(current);
			});
		});
		return Array.from(prefixes).sort();
	}, [keys]);

	const filteredPrefixes = useMemo(() => {
		if (!prefixInput) return knownPrefixes.slice(0, 10);
		return knownPrefixes
			.filter((p) => p.toLowerCase().includes(prefixInput.toLowerCase()))
			.slice(0, 10);
	}, [knownPrefixes, prefixInput]);

	const handleRefresh = useCallback(() => {
		if (connectionId) {
			refreshKeys(connectionId);
		}
	}, [connectionId, refreshKeys]);

	const handleApplyFilters = useCallback(() => {
		setSearchQuery(prefixInput);
		setRangeStart(startKeyInput);
		setRangeEnd(endKeyInput);
		addRecentQuery();
		if (connectionId) {
			refreshKeys(connectionId);
		}
	}, [
		connectionId,
		prefixInput,
		startKeyInput,
		endKeyInput,
		setSearchQuery,
		setRangeStart,
		setRangeEnd,
		addRecentQuery,
		refreshKeys,
	]);

	const handleClearFilters = useCallback(() => {
		setPrefixInput("");
		setStartKeyInput("");
		setEndKeyInput("");
		setSearchQuery("");
		setRangeStart("");
		setRangeEnd("");
		if (connectionId) {
			refreshKeys(connectionId);
		}
	}, [setSearchQuery, setRangeStart, setRangeEnd, connectionId, refreshKeys]);

	const handleLoadRecentQuery = useCallback(
		(query: (typeof recentQueries)[0]) => {
			loadRecentQuery(query);
			if (connectionId) {
				refreshKeys(connectionId);
			}
		},
		[loadRecentQuery, connectionId, refreshKeys],
	);

	const hasActiveFilters = prefixInput || startKeyInput || endKeyInput;

	const formatRecentQueryLabel = (query: (typeof recentQueries)[0]) => {
		const parts: string[] = [];
		if (query.searchQuery) parts.push(`prefix: "${query.searchQuery}"`);
		if (query.rangeStart) parts.push(`start: "${query.rangeStart}"`);
		if (query.rangeEnd) parts.push(`end: "${query.rangeEnd}"`);
		if (parts.length === 0) parts.push("All keys");
		return parts.join(", ");
	};

	return (
		<TooltipProvider delayDuration={300}>
			<div className="flex flex-col gap-3 pb-3 bg-background sticky top-0 z-10 w-full pt-1">
				{/* Query Row */}
				<div className="flex items-center gap-2 px-1">
					<Popover>
						<PopoverTrigger asChild>
							<div className="relative flex-1">
								<FolderSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
								<Input
									ref={searchInputRef}
									placeholder="Search by prefix, e.g. /config/"
									value={prefixInput}
									onChange={(e) => setPrefixInput(e.target.value)}
									className="pl-9 h-9 font-mono text-xs border border-border/80 rounded-md bg-secondary/30 focus-visible:ring-1 focus-visible:ring-primary/50"
								/>
								{prefixInput && (
									<Badge
										variant="secondary"
										className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] h-5 px-1.5"
									>
										{filteredKeys.length}
									</Badge>
								)}
							</div>
						</PopoverTrigger>
						<PopoverContent className="w-96 p-0" align="start">
							<div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b bg-muted/30">
								Recent Queries & Prefixes
							</div>
							<div className="max-h-64 overflow-y-auto">
								{recentQueries.length > 0 && (
									<div className="py-1 border-b">
										{recentQueries.slice(0, 5).map((query) => (
											<button
												type="button"
												key={query.id}
												onClick={() => handleLoadRecentQuery(query)}
												className="w-full px-3 py-1.5 text-xs text-left flex flex-col gap-0.5 hover:bg-accent/50 transition-colors"
											>
												<span className="font-mono truncate">
													{formatRecentQueryLabel(query)}
												</span>
												<span className="text-[10px] text-muted-foreground">
													{new Date(query.timestamp).toLocaleString()}
												</span>
											</button>
										))}
									</div>
								)}
								<div className="py-1">
									{filteredPrefixes.length > 0 ? (
										filteredPrefixes.map((prefix) => (
											<button
												type="button"
												key={prefix}
												onClick={() => {
													setPrefixInput(prefix);
													setSearchQuery(prefix);
												}}
												className="w-full px-3 py-1.5 text-xs font-mono text-left hover:bg-accent/50 transition-colors"
											>
												{prefix}
											</button>
										))
									) : (
										<div className="px-3 py-3 text-xs text-muted-foreground text-center">
											No matching prefixes
										</div>
									)}
								</div>
							</div>
						</PopoverContent>
					</Popover>

					<div className="flex items-center gap-1.5 shrink-0">
						{hasActiveFilters && (
							<Button
								variant="outline"
								size="sm"
								className="h-9 px-3 text-xs font-medium border-border/80"
								onClick={handleClearFilters}
							>
								Reset
							</Button>
						)}
						<Button
							variant="default"
							size="sm"
							className="h-9 px-4 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white"
							onClick={handleApplyFilters}
						>
							Apply
						</Button>

						{/* Options Popover */}
						<Popover>
							<PopoverTrigger asChild>
								<Button
									variant="ghost"
									size="sm"
									className="h-9 px-3 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10 gap-1.5"
								>
									Options <ChevronDown className="h-3 w-3" />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-80 p-4 space-y-4" align="end">
								<div className="space-y-2">
									<h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
										Range Filter
									</h4>
									<div className="flex items-center gap-2">
										<div className="flex-1 space-y-1.5">
											<Input
												placeholder="Start key"
												value={startKeyInput}
												onChange={(e) => setStartKeyInput(e.target.value)}
												className="h-8 text-xs font-mono"
											/>
										</div>
										<span className="text-muted-foreground text-xs">-</span>
										<div className="flex-1 space-y-1.5">
											<Input
												placeholder="End key"
												value={endKeyInput}
												onChange={(e) => setEndKeyInput(e.target.value)}
												className="h-8 text-xs font-mono"
											/>
										</div>
									</div>
								</div>
								<div className="flex items-center gap-4">
									<div className="space-y-1.5 flex-1">
										<h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
											Limit
										</h4>
										<Select
											value={pagination.limit.toString()}
											onValueChange={(v) => setPageSize(parseInt(v, 10))}
										>
											<SelectTrigger className="h-8 text-xs w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="25">25</SelectItem>
												<SelectItem value="50">50</SelectItem>
												<SelectItem value="100">100</SelectItem>
												<SelectItem value="500">500</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-1.5 flex-1">
										<h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
											Sort
										</h4>
										<Button
											variant="outline"
											size="sm"
											className="h-8 w-full text-xs justify-start gap-2"
											onClick={() => setSortAscending(!sortAscending)}
										>
											{sortAscending ? (
												<ArrowDownAZ className="h-4 w-4" />
											) : (
												<ArrowUpZA className="h-4 w-4" />
											)}
											{sortAscending ? "Ascending" : "Descending"}
										</Button>
									</div>
								</div>
							</PopoverContent>
						</Popover>
					</div>
				</div>

				{/* Action Buttons Row */}
				<div className="flex flex-wrap items-center justify-between px-1 gap-4">
					<div className="flex items-center gap-2 flex-wrap">
						<Button
							size="sm"
							className="h-7 text-[11px] font-bold px-3 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded uppercase tracking-wide border border-transparent shadow-sm"
							onClick={() => setShowAddDialog(true)}
						>
							<Plus className="h-3.5 w-3.5 stroke-[3]" />
							ADD KEY
						</Button>

						<div className="h-4 w-px bg-border mx-1" />

						<Button
							variant="outline"
							size="sm"
							className="h-7 text-[11px] font-bold px-3 gap-1.5 text-foreground hover:bg-secondary rounded uppercase tracking-wide border-border/60 hover:border-border shadow-sm bg-background"
							onClick={handleRefresh}
							disabled={isLoading}
						>
							<RefreshCw
								className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`}
							/>
							REFRESH
						</Button>

						<Button
							variant="outline"
							size="sm"
							className="h-7 text-[11px] font-bold px-3 gap-1.5 text-foreground hover:bg-secondary rounded uppercase tracking-wide border-border/60 hover:border-border shadow-sm bg-background"
							onClick={() => importKeys()}
						>
							<Upload className="h-3 w-3" />
							IMPORT
						</Button>

						<Button
							variant="outline"
							size="sm"
							className="h-7 text-[11px] font-bold px-3 gap-1.5 text-foreground hover:bg-secondary rounded uppercase tracking-wide border-border/60 hover:border-border shadow-sm bg-background"
							onClick={() => setShowExportDialog(true)}
						>
							<Download className="h-3 w-3" />
							EXPORT
						</Button>
					</div>

					<div className="flex items-center gap-3">
						<Badge
							variant="secondary"
							className="text-[10px] font-medium uppercase tracking-wider h-5 flex items-center bg-muted/50 text-muted-foreground border-border/40"
						>
							{keys.length} keys
						</Badge>
						<Tabs
							value={viewMode}
							onValueChange={(v) => setViewMode(v as "flat" | "tree")}
							className="h-7"
						>
							<TabsList className="h-7 p-0.5 bg-muted/50 border border-border/40 object-contain rounded-md">
								<TabsTrigger
									value="flat"
									className="text-[10px] uppercase tracking-wide px-2 h-5 rounded-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
								>
									<List className="h-3 w-3 mr-1.5" />
									Flat
								</TabsTrigger>
								<TabsTrigger
									value="tree"
									className="text-[10px] uppercase tracking-wide px-2 h-5 rounded-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
								>
									<FolderTree className="h-3 w-3 mr-1.5" />
									Tree
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>
				</div>
			</div>
		</TooltipProvider>
	);
}
