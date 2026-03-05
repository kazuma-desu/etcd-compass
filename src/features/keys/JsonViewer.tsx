"use client";

import {
	Check,
	ChevronDown,
	ChevronRight,
	FileJson,
	Maximize2,
	Minimize2,
	Search,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/shared/utils";

interface JsonViewerProps {
	data: unknown;
	className?: string;
	rootName?: string;
}

type ViewMode = "tree" | "raw";
type FormatMode = "pretty" | "compact";

interface JSONNodeProps {
	name: string | number | undefined;
	value: unknown;
	depth: number;
	path: string;
	isLast: boolean;
	searchQuery: string;
	expandedPaths: Set<string>;
	onTogglePath: (path: string) => void;
	onCopyPath: (path: string) => void;
	isCompact: boolean;
	allExpanded: boolean;
	allCollapsed: boolean;
}

function getValueType(value: unknown): string {
	if (value === null) return "null";
	if (Array.isArray(value)) return "array";
	return typeof value;
}

function getValueColor(type: string): string {
	switch (type) {
		case "string":
			return "text-green-500 dark:text-green-400";
		case "number":
			return "text-orange-500 dark:text-orange-400";
		case "boolean":
			return "text-blue-500 dark:text-blue-400";
		case "null":
			return "text-blue-500 dark:text-blue-400";
		default:
			return "text-muted-foreground";
	}
}

function formatValue(value: unknown, type: string): string {
	if (type === "string") return `"${value}"`;
	if (type === "null") return "null";
	return String(value);
}

function escapeRegExp(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text: string, query: string): React.ReactNode {
	if (!query) return text;
	const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "gi"));
	return parts.map((part, i) =>
		part.toLowerCase() === query.toLowerCase() ? (
			<mark
				key={i}
				className="bg-yellow-200 dark:bg-yellow-700 text-inherit px-0.5 rounded"
			>
				{part}
			</mark>
		) : (
			part
		),
	);
}

function matchesSearch(value: unknown, query: string): boolean {
	if (!query) return true;
	const lowerQuery = query.toLowerCase();

	if (typeof value === "string") {
		return value.toLowerCase().includes(lowerQuery);
	}
	if (typeof value === "number") {
		return String(value).includes(lowerQuery);
	}
	if (typeof value === "boolean") {
		return String(value).includes(lowerQuery);
	}
	if (value === null && "null".includes(lowerQuery)) {
		return true;
	}
	return false;
}

function shouldShowNode(
	name: string | number | undefined,
	value: unknown,
	query: string,
	path: string,
): { show: boolean; hasMatchingChild: boolean } {
	if (!query) return { show: true, hasMatchingChild: false };

	const nameMatches =
		name !== undefined &&
		String(name).toLowerCase().includes(query.toLowerCase());
	const valueMatches = matchesSearch(value, query);

	if (nameMatches || valueMatches) {
		return { show: true, hasMatchingChild: false };
	}

	if (value !== null && typeof value === "object") {
		const entries = Object.entries(value as Record<string, unknown>);
		for (const [key, val] of entries) {
			const childResult = shouldShowNode(key, val, query, `${path}.${key}`);
			if (childResult.show || childResult.hasMatchingChild) {
				return { show: true, hasMatchingChild: true };
			}
		}
	}

	return { show: false, hasMatchingChild: false };
}

function JSONNode({
	name,
	value,
	depth,
	path,
	isLast,
	searchQuery,
	expandedPaths,
	onTogglePath,
	onCopyPath,
	isCompact,
	allExpanded,
	allCollapsed,
}: JSONNodeProps) {
	const type = getValueType(value);
	const isCollapsible = type === "object" || type === "array";
	const isExpanded = allExpanded || (expandedPaths.has(path) && !allCollapsed);

	const shouldShow = useMemo(
		() => shouldShowNode(name, value, searchQuery, path).show,
		[name, value, searchQuery, path],
	);

	if (!shouldShow) return null;

	const entries = isCollapsible
		? Object.entries(value as Record<string, unknown>)
		: [];
	const isEmpty = entries.length === 0;

	const openBracket = type === "array" ? "[" : "{";
	const closeBracket = type === "array" ? "]" : "}";

	const indent = isCompact ? "" : "  ".repeat(depth);

	if (!isCollapsible) {
		return (
			<div
				className={cn(
					"font-mono text-sm whitespace-pre",
					isCompact && "inline",
				)}
			>
				<span className="text-muted-foreground">{indent}</span>
				{name !== undefined && (
					<>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<span
										className="text-purple-500 dark:text-purple-400 cursor-pointer hover:underline hover:bg-purple-500/10 rounded px-0.5 transition-colors"
										onClick={(e) => {
											e.stopPropagation();
											onCopyPath(path);
										}}
									>
										{highlightText(`"${name}"`, searchQuery)}
									</span>
								</TooltipTrigger>
								<TooltipContent side="top" className="text-xs">
									<p>
										Click to copy path:{" "}
										<code className="font-mono bg-muted px-1 rounded">
											{path}
										</code>
									</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
						<span className="text-muted-foreground">: </span>
					</>
				)}
				<span className={getValueColor(type)}>
					{highlightText(formatValue(value, type), searchQuery)}
				</span>
				{!isLast && <span className="text-muted-foreground">,</span>}
				{!isCompact && "\n"}
			</div>
		);
	}

	return (
		<div className={cn(!isCompact && "whitespace-pre")}>
			<div
				className={cn("font-mono text-sm", !isCompact && "flex items-center")}
			>
				<span className="text-muted-foreground">{indent}</span>

				{isCollapsible && !isEmpty && (
					<button
						type="button"
						onClick={() => onTogglePath(path)}
						className="inline-flex items-center justify-center w-4 h-4 mr-1 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-accent"
					>
						{isExpanded ? (
							<ChevronDown className="w-3.5 h-3.5" />
						) : (
							<ChevronRight className="w-3.5 h-3.5" />
						)}
					</button>
				)}

				{isEmpty && <span className="w-4 mr-1" />}

				{name !== undefined && (
					<>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<span
										className="text-purple-500 dark:text-purple-400 cursor-pointer hover:underline hover:bg-purple-500/10 rounded px-0.5 transition-colors"
										onClick={(e) => {
											e.stopPropagation();
											onCopyPath(path);
										}}
									>
										{highlightText(`"${name}"`, searchQuery)}
									</span>
								</TooltipTrigger>
								<TooltipContent side="top" className="text-xs">
									<p>
										Click to copy path:{" "}
										<code className="font-mono bg-muted px-1 rounded">
											{path}
										</code>
									</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
						<span className="text-muted-foreground">: </span>
					</>
				)}

				<span className="text-muted-foreground">{openBracket}</span>

				{!isExpanded && !isEmpty && (
					<span className="text-muted-foreground ml-1">
						{entries.length} {entries.length === 1 ? "item" : "items"}
						<span className="ml-1">{closeBracket}</span>
						{!isLast && <span>,</span>}
					</span>
				)}
			</div>

			{isExpanded && !isEmpty && (
				<>
					{!isCompact && "\n"}
					{entries.map(([key, val], index) => (
						<JSONNode
							key={type === "array" ? index : key}
							name={type === "array" ? index : key}
							value={val}
							depth={depth + 1}
							path={`${path}.${key}`}
							isLast={index === entries.length - 1}
							searchQuery={searchQuery}
							expandedPaths={expandedPaths}
							onTogglePath={onTogglePath}
							onCopyPath={onCopyPath}
							isCompact={isCompact}
							allExpanded={allExpanded}
							allCollapsed={allCollapsed}
						/>
					))}
					<div className={cn("font-mono text-sm", isCompact && "inline")}>
						<span className="text-muted-foreground">{indent}</span>
						<span className="text-muted-foreground">{closeBracket}</span>
						{!isLast && <span className="text-muted-foreground">,</span>}
						{!isCompact && "\n"}
					</div>
				</>
			)}
		</div>
	);
}

function RawJsonView({
	jsonString,
	searchQuery,
}: {
	jsonString: string;
	searchQuery: string;
}) {
	const lines = useMemo(() => jsonString.split("\n"), [jsonString]);

	const lineNumberWidth = useMemo(() => {
		return String(lines.length).length * 0.6 + 1;
	}, [lines.length]);

	return (
		<div className="flex">
			<div
				className="bg-muted/50 border-r border-border select-none py-4 text-right shrink-0"
				style={{
					minWidth: `${lineNumberWidth}rem`,
					paddingLeft: "0.75rem",
					paddingRight: "0.75rem",
				}}
			>
				{lines.map((_, i) => (
					<div
						key={i}
						className="text-xs text-muted-foreground font-mono leading-5"
					>
						{i + 1}
					</div>
				))}
			</div>
			<ScrollArea className="flex-1">
				<div className="py-4 px-4">
					<pre className="text-sm font-mono leading-5 whitespace-pre-wrap break-all">
						{searchQuery
							? lines.map((line, i) => (
									<div key={i}>{highlightText(line, searchQuery)}</div>
								))
							: jsonString}
					</pre>
				</div>
			</ScrollArea>
		</div>
	);
}

export function JsonViewer({
	data,
	className,
	rootName = "root",
}: JsonViewerProps) {
	const [viewMode, setViewMode] = useState<ViewMode>("tree");
	const [formatMode, setFormatMode] = useState<FormatMode>("pretty");
	const [searchQuery, setSearchQuery] = useState("");
	const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
	const [copiedPath, setCopiedPath] = useState<string | null>(null);
	const [allExpanded, setAllExpanded] = useState(false);
	const [allCollapsed, setAllCollapsed] = useState(false);

	const jsonString = useMemo(() => {
		try {
			return JSON.stringify(
				data,
				null,
				formatMode === "pretty" ? 2 : undefined,
			);
		} catch {
			return "";
		}
	}, [data, formatMode]);

	const compactJsonString = useMemo(() => {
		try {
			return JSON.stringify(data);
		} catch {
			return "";
		}
	}, [data]);

	const isValid = useMemo(() => {
		try {
			JSON.stringify(data);
			return true;
		} catch {
			return false;
		}
	}, [data]);

	const handleTogglePath = useCallback((path: string) => {
		setExpandedPaths((prev) => {
			const next = new Set(prev);
			if (next.has(path)) {
				next.delete(path);
			} else {
				next.add(path);
			}
			return next;
		});
	}, []);

	const handleCopyPath = useCallback(async (path: string) => {
		try {
			await navigator.clipboard.writeText(path);
			setCopiedPath(path);
			setTimeout(() => setCopiedPath(null), 2000);
		} catch (err) {
			console.error("Failed to copy path:", err);
		}
	}, []);

	const handleExpandAll = useCallback(() => {
		setAllExpanded(true);
		setAllCollapsed(false);
	}, []);

	const handleCollapseAll = useCallback(() => {
		setAllExpanded(false);
		setAllCollapsed(true);
		setExpandedPaths(new Set());
	}, []);

	const handleClearSearch = useCallback(() => {
		setSearchQuery("");
	}, []);

	useEffect(() => {
		if (allExpanded) {
			const timer = setTimeout(() => setAllExpanded(false), 100);
			return () => clearTimeout(timer);
		}
	}, [allExpanded]);

	useEffect(() => {
		if (allCollapsed) {
			const timer = setTimeout(() => setAllCollapsed(false), 100);
			return () => clearTimeout(timer);
		}
	}, [allCollapsed]);

	const searchResults = useMemo(() => {
		if (!searchQuery) return 0;
		let count = 0;
		const str = jsonString.toLowerCase();
		const query = searchQuery.toLowerCase();
		let pos = str.indexOf(query, 0);
		while (pos !== -1) {
			count++;
			pos = str.indexOf(query, pos + 1);
		}
		return count;
	}, [jsonString, searchQuery]);

	if (!isValid) {
		return (
			<div className="flex items-center justify-center h-full text-muted-foreground">
				<div className="text-center">
					<FileJson className="w-12 h-12 mx-auto mb-2 opacity-50" />
					<p>Invalid JSON data</p>
				</div>
			</div>
		);
	}

	return (
		<TooltipProvider delayDuration={100}>
			<div className={cn("flex flex-col h-full bg-background", className)}>
				<div className="flex items-center gap-2 p-2 border-b border-border bg-muted/30">
					<div className="flex items-center bg-background rounded-md border border-border p-0.5">
						<Button
							variant={viewMode === "tree" ? "secondary" : "ghost"}
							size="sm"
							className="h-7 px-2 text-xs"
							onClick={() => setViewMode("tree")}
						>
							Tree
						</Button>
						<Button
							variant={viewMode === "raw" ? "secondary" : "ghost"}
							size="sm"
							className="h-7 px-2 text-xs"
							onClick={() => setViewMode("raw")}
						>
							Raw
						</Button>
					</div>

					{viewMode === "raw" && (
						<Button
							variant="ghost"
							size="sm"
							className="h-7 px-2 text-xs gap-1.5"
							onClick={() =>
								setFormatMode((prev) =>
									prev === "pretty" ? "compact" : "pretty",
								)
							}
							title={
								formatMode === "pretty"
									? "Switch to compact"
									: "Switch to pretty"
							}
						>
							{formatMode === "pretty" ? (
								<>
									<Minimize2 className="w-3.5 h-3.5" />
									<span>Pretty</span>
								</>
							) : (
								<>
									<Maximize2 className="w-3.5 h-3.5" />
									<span>Compact</span>
								</>
							)}
						</Button>
					)}

					<div className="w-px h-5 bg-border mx-1" />

					{viewMode === "tree" && (
						<>
							<Button
								variant="ghost"
								size="sm"
								className="h-7 px-2 text-xs"
								onClick={handleExpandAll}
							>
								Expand All
							</Button>
							<Button
								variant="ghost"
								size="sm"
								className="h-7 px-2 text-xs"
								onClick={handleCollapseAll}
							>
								Collapse All
							</Button>
						</>
					)}

					<div className="flex-1" />

					<div className="flex items-center gap-2">
						<div className="relative">
							<Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
							<Input
								type="text"
								placeholder="Search JSON..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-48 h-7 pl-8 pr-7 text-xs"
							/>
							{searchQuery && (
								<button
									type="button"
									onClick={handleClearSearch}
									className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
								>
									<X className="w-3.5 h-3.5" />
								</button>
							)}
						</div>
						{searchQuery && (
							<span className="text-xs text-muted-foreground">
								{searchResults} match{searchResults !== 1 ? "es" : ""}
							</span>
						)}
					</div>
				</div>

				<ScrollArea className="flex-1">
					<div className="p-4">
						{viewMode === "tree" ? (
							<div
								className={
									formatMode === "compact" ? "whitespace-pre-wrap" : ""
								}
							>
								<JSONNode
									name={undefined}
									value={data}
									depth={0}
									path={rootName}
									isLast={true}
									searchQuery={searchQuery}
									expandedPaths={expandedPaths}
									onTogglePath={handleTogglePath}
									onCopyPath={handleCopyPath}
									isCompact={formatMode === "compact"}
									allExpanded={allExpanded}
									allCollapsed={allCollapsed}
								/>
							</div>
						) : (
							<RawJsonView
								jsonString={
									formatMode === "pretty" ? jsonString : compactJsonString
								}
								searchQuery={searchQuery}
							/>
						)}
					</div>
				</ScrollArea>

				{copiedPath && (
					<div className="absolute bottom-4 right-4 bg-foreground text-background px-3 py-2 rounded-md shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
						<Check className="w-4 h-4" />
						<span className="text-sm">
							Path copied:{" "}
							<code className="font-mono text-xs bg-background/20 px-1 rounded">
								{copiedPath}
							</code>
						</span>
					</div>
				)}
			</div>
		</TooltipProvider>
	);
}

export default JsonViewer;
