import { AlertTriangle, Check, RefreshCw, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useKeysStore } from "./keys-store";

interface ImportPreviewDialogProps {
	connectionId: string;
}

export function ImportPreviewDialog({
	connectionId,
}: ImportPreviewDialogProps) {
	const {
		showImportDialog,
		importPreviewData,
		importProgress,
		isImporting,
		executeImport,
		cancelImport,
	} = useKeysStore();

	const createCount = importPreviewData.filter(
		(d) => d.action === "create",
	).length;
	const updateCount = importPreviewData.filter(
		(d) => d.action === "update",
	).length;

	const handleConfirm = () => {
		executeImport(connectionId);
	};

	const handleCancel = () => {
		if (!isImporting) {
			cancelImport();
		}
	};

	const truncateValue = (value: string, maxLength: number = 50) => {
		if (value.length <= maxLength) return value;
		return `${value.substring(0, maxLength)}...`;
	};

	return (
		<Dialog open={showImportDialog} onOpenChange={handleCancel}>
			<DialogContent className="max-w-4xl">
				<DialogHeader>
					<DialogTitle>Import Preview</DialogTitle>
					<DialogDescription>
						Review the keys to be imported.
						<Badge variant="default" className="ml-2">
							{createCount} new
						</Badge>
						<Badge variant="secondary" className="ml-1">
							{updateCount} updates
						</Badge>
					</DialogDescription>
				</DialogHeader>

				{isImporting && (
					<div className="py-4">
						<div className="flex items-center justify-between mb-2">
							<span className="text-sm font-medium">
								Importing keys... {importProgress}%
							</span>
							<RefreshCw className="w-4 h-4 animate-spin" />
						</div>
						<Progress value={importProgress} />
					</div>
				)}

				<ScrollArea className="h-[400px] border rounded-md">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[50px]">Action</TableHead>
								<TableHead>Key</TableHead>
								<TableHead>New Value</TableHead>
								<TableHead>Current Value</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{importPreviewData.map((item, index) => (
								<TableRow
									key={item.key}
									className={index % 2 === 0 ? "bg-muted/30" : ""}
								>
									<TableCell>
										{item.action === "create" ? (
											<Badge className="bg-green-500 hover:bg-green-600">
												<Check className="w-3 h-3 mr-1" />
												Create
											</Badge>
										) : (
											<Badge variant="secondary">
												<RefreshCw className="w-3 h-3 mr-1" />
												Update
											</Badge>
										)}
									</TableCell>
									<TableCell className="font-mono text-xs max-w-[200px] truncate">
										{item.key}
									</TableCell>
									<TableCell className="max-w-[200px] truncate text-xs">
										{truncateValue(item.value)}
									</TableCell>
									<TableCell className="max-w-[200px] truncate text-xs">
										{item.existingValue ? (
											truncateValue(item.existingValue)
										) : (
											<span className="text-muted-foreground italic">—</span>
										)}
									</TableCell>
								</TableRow>
							))}
							{importPreviewData.length === 0 && (
								<TableRow>
									<TableCell colSpan={4} className="text-center py-8">
										No keys to import
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</ScrollArea>

				{importPreviewData.length > 0 && !isImporting && (
					<div className="flex items-center gap-2 mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
						<AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
						<p className="text-sm text-yellow-600 dark:text-yellow-400">
							This operation will{" "}
							{createCount > 0 &&
								`create ${createCount} new key${createCount !== 1 ? "s" : ""}`}
							{createCount > 0 && updateCount > 0 && " and "}
							{updateCount > 0 &&
								`update ${updateCount} existing key${updateCount !== 1 ? "s" : ""}`}
							. This action cannot be undone.
						</p>
					</div>
				)}

				<DialogFooter className="flex justify-between sm:justify-between mt-4">
					<Button
						variant="outline"
						onClick={handleCancel}
						disabled={isImporting}
					>
						Cancel
					</Button>
					<Button
						onClick={handleConfirm}
						disabled={isImporting || importPreviewData.length === 0}
					>
						<Upload className="w-4 h-4 mr-2" />
						{isImporting
							? "Importing..."
							: `Import ${importPreviewData.length} Keys`}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
