import {
	ArrowDownAZ,
	ArrowRightLeft,
	ArrowUpZA,
	ChevronDown,
	Download,
	FolderSearch,
	FolderTree,
	History,
	List,
	Plus,
	RefreshCw,
	Upload,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatShortcut } from "@/shared/hooks/use-keyboard-shortcuts";
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
		setRangeStart(startKeyInput);
		setRangeEnd(endKeyInput);
		addRecentQuery();
		if (connectionId) {
			refreshKeys(connectionId);
		}
	}, [
		connectionId,
		startKeyInput,
		endKeyInput,
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
			<div className="border-b bg-background">
				<div className="flex flex-wrap items-center gap-2 py-2 px-4">
					<div className="flex items-center gap-2 flex-1 min-w-[200px] flex-wrap">
						<Popover>
							<PopoverTrigger asChild>
								<div className="relative flex-1 min-w-[200px] max-w-xs">
									<FolderSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
									<Input
										ref={searchInputRef}
										placeholder="Filter by prefix..."
										value={prefixInput}
										onChange={(e) => setPrefixInput(e.target.value)}
										className="pl-9 h-8"
									/>
									{prefixInput && (
										<Badge
											variant="secondary"
											className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
										>
											{filteredKeys.length}
										</Badge>
									)}
								</div>
							</PopoverTrigger>
							<PopoverContent className="w-64 p-0" align="start">
								<div className="px-3 py-2 text-xs text-muted-foreground border-b">
									Known prefixes
								</div>
								<div className="max-h-48 overflow-y-auto">
									{filteredPrefixes.length > 0 ? (
										filteredPrefixes.map((prefix) => (
											<button
												type="button"
												key={prefix}
												onClick={() => {
													setPrefixInput(prefix);
													setSearchQuery(prefix);
												}}
												className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors"
											>
												{prefix}
											</button>
										))
									) : (
										<div className="px-3 py-2 text-sm text-muted-foreground">
											No matching prefixes
										</div>
									)}
								</div>
							</PopoverContent>
						</Popover>

						<div className="flex items-center gap-2 flex-wrap">
							<div className="flex items-center gap-1 text-xs text-muted-foreground">
								<ArrowRightLeft className="h-3 w-3" />
								<span>Range:</span>
							</div>
							<Input
								placeholder="Start key"
								value={startKeyInput}
								onChange={(e) => setStartKeyInput(e.target.value)}
								className="h-8 w-28 text-xs"
							/>
							<span className="text-muted-foreground">-</span>
							<Input
								placeholder="End key"
								value={endKeyInput}
								onChange={(e) => setEndKeyInput(e.target.value)}
								className="h-8 w-28 text-xs"
							/>
						</div>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="sm"
									className="h-8 px-2"
									onClick={() => setSortAscending(!sortAscending)}
								>
									{sortAscending ? (
										<ArrowDownAZ className="h-4 w-4" />
									) : (
										<ArrowUpZA className="h-4 w-4" />
									)}
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								Sort {sortAscending ? "ascending" : "descending"}
							</TooltipContent>
						</Tooltip>

						<Tabs
							value={viewMode}
							onValueChange={(v) => setViewMode(v as "flat" | "tree")}
						>
							<TabsList className="h-8">
								<TabsTrigger value="flat" className="text-xs gap-1">
									<List className="h-3.5 w-3.5" />
									<span className="hidden sm:inline">Flat</span>
								</TabsTrigger>
								<TabsTrigger value="tree" className="text-xs gap-1">
									<FolderTree className="h-3.5 w-3.5" />
									<span className="hidden sm:inline">Tree</span>
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>

					<div className="flex items-center gap-2 flex-wrap justify-end">
						<Badge variant="outline" className="text-xs whitespace-nowrap">
							{keys.length} keys
						</Badge>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8"
									onClick={handleRefresh}
									disabled={isLoading}
								>
									<RefreshCw
										className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
									/>
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								<span>Refresh keys</span>
								<kbd className="ml-2 bg-muted px-1 rounded text-xs">
									{formatShortcut("r")}
								</kbd>
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8"
									onClick={() => setShowExportDialog(true)}
								>
									<Download className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								<span>Export keys</span>
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8"
									onClick={() => importKeys()}
								>
									<Upload className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								<span>Import keys</span>
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									size="sm"
									className="h-8 gap-1"
									onClick={() => setShowAddDialog(true)}
								>
									<Plus className="h-3.5 w-3.5" />
									Add Key
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								<span>Add new key</span>
							</TooltipContent>
						</Tooltip>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-3 pb-2 px-4">
					<div className="flex items-center gap-2 flex-1 flex-wrap">
						<div className="flex items-center gap-1">
							<span className="text-xs text-muted-foreground">Limit:</span>
							<Select
								value={pagination.limit.toString()}
								onValueChange={(v) => setPageSize(parseInt(v, 10))}
							>
								<SelectTrigger className="h-7 w-20 text-xs">
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

						{recentQueries.length > 0 && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="outline"
										size="sm"
										className="h-7 text-xs gap-1"
									>
										<History className="h-3 w-3" />
										Recent
										<ChevronDown className="h-3 w-3" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start" className="w-72">
									<DropdownMenuLabel className="text-xs">
										Recent queries (last 20)
									</DropdownMenuLabel>
									<DropdownMenuSeparator />
									{recentQueries.map((query) => (
										<DropdownMenuItem
											key={query.id}
											onClick={() => handleLoadRecentQuery(query)}
											className="text-xs cursor-pointer"
										>
											<div className="flex flex-col gap-0.5">
												<span className="font-medium truncate max-w-60">
													{formatRecentQueryLabel(query)}
												</span>
												<span className="text-muted-foreground text-[10px]">
													{new Date(query.timestamp).toLocaleString()}
												</span>
											</div>
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						)}

						<Button
							variant="outline"
							size="sm"
							className="h-7 text-xs"
							onClick={handleApplyFilters}
						>
							Apply
						</Button>

						{hasActiveFilters && (
							<Button
								variant="ghost"
								size="sm"
								className="h-7 text-xs gap-1"
								onClick={handleClearFilters}
							>
								<X className="h-3 w-3" />
								Clear
							</Button>
						)}
					</div>

					{hasActiveFilters && (
						<div className="flex items-center gap-1">
							<span className="text-xs text-muted-foreground">Active:</span>
							{prefixInput && (
								<Badge variant="secondary" className="text-xs h-5">
									prefix: {prefixInput}
								</Badge>
							)}
							{startKeyInput && (
								<Badge variant="secondary" className="text-xs h-5">
									start: {startKeyInput}
								</Badge>
							)}
							{endKeyInput && (
								<Badge variant="secondary" className="text-xs h-5">
									end: {endKeyInput}
								</Badge>
							)}
						</div>
					)}
				</div>
			</div>
		</TooltipProvider>
	);
}
