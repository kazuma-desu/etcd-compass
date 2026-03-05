import { useEffect } from "react";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { AddKeyDialog } from "./AddKeyDialog";
import { BulkActionsToolbar } from "./BulkActionsToolbar";
import { BulkDeleteDialog } from "./BulkDeleteDialog";
import { DeleteKeyDialog } from "./DeleteKeyDialog";
import { EditKeyDialog } from "./EditKeyDialog";
import { ExportDialog } from "./ExportDialog";
import { FlatView } from "./FlatView";
import { ImportPreviewDialog } from "./ImportPreviewDialog";
import { PAGE_SIZE_OPTIONS, useKeysStore } from "./keys-store";
import { TreeView } from "./TreeView";

interface KeyBrowserProps {
	connectionId: string;
}

export function KeyBrowser({ connectionId }: KeyBrowserProps) {
	const {
		viewMode,
		treeData,
		refreshKeys,
		getFilteredKeys,
		pagination,
		setPageSize,
		goToNextPage,
		goToPrevPage,
		isLoading,
		getPaginationInfo,
	} = useKeysStore();

	useEffect(() => {
		refreshKeys(connectionId);
	}, [connectionId, refreshKeys]);

	const filteredKeys = getFilteredKeys();
	const { showingText } = getPaginationInfo();

	return (
		<div className="h-full flex flex-col">
			<BulkActionsToolbar />
			<ScrollArea className="flex-1">
				{viewMode === "flat" ? (
					<FlatView keys={filteredKeys} />
				) : (
					<div className="p-2">
						{treeData.length > 0 ? (
							<TreeView nodes={treeData} allKeys={filteredKeys} />
						) : (
							<div className="text-center py-8 text-muted-foreground">
								No keys found
							</div>
						)}
					</div>
				)}
			</ScrollArea>

			<div className="border-t p-4 flex items-center justify-between bg-background">
				<div className="flex items-center gap-4">
					<span className="text-sm text-muted-foreground">{showingText}</span>
					<div className="flex items-center gap-2">
						<span className="text-sm text-muted-foreground">Page size:</span>
						<Select
							value={pagination.limit.toString()}
							onValueChange={(value) => setPageSize(Number(value))}
						>
							<SelectTrigger className="w-[80px] h-8">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{PAGE_SIZE_OPTIONS.map((size) => (
									<SelectItem key={size} value={size.toString()}>
										{size}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				<Pagination className="mx-0 w-auto">
					<PaginationContent>
						<PaginationItem>
							<PaginationPrevious
								onClick={() => goToPrevPage(connectionId)}
								className={
									pagination.currentPage <= 1 || isLoading
										? "pointer-events-none opacity-50"
										: "cursor-pointer"
								}
							/>
						</PaginationItem>
						<PaginationItem>
							<span className="px-4 py-2 text-sm">
								Page {pagination.currentPage}
							</span>
						</PaginationItem>
						<PaginationItem>
							<PaginationNext
								onClick={() => goToNextPage(connectionId)}
								className={
									!pagination.hasMore || isLoading
										? "pointer-events-none opacity-50"
										: "cursor-pointer"
								}
							/>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			</div>

			<AddKeyDialog connectionId={connectionId} />
			<EditKeyDialog connectionId={connectionId} />
			<DeleteKeyDialog connectionId={connectionId} />
			<BulkDeleteDialog connectionId={connectionId} />
			<ExportDialog connectionId={connectionId} />
			<ImportPreviewDialog connectionId={connectionId} />
		</div>
	);
}
