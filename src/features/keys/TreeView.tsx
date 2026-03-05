import {
	ChevronDown,
	ChevronRight,
	Copy,
	Download,
	Edit,
	Eye,
	FileKey,
	Folder,
	FolderOpen,
	Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { EtcdKey, TreeNode } from "@/commands/types";
import { Checkbox } from "@/components/ui/checkbox";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useKeysStore } from "./keys-store";

interface TreeViewProps {
	nodes: TreeNode[];
	allKeys: EtcdKey[];
	level?: number;
	onWatchKey?: (key: string, isPrefix: boolean) => void;
	onExportPrefix?: (prefix: string) => void;
}

export function TreeView({
	nodes,
	allKeys,
	level = 0,
	onWatchKey,
	onExportPrefix,
}: TreeViewProps) {
	const {
		selectedKey,
		toggleNode,
		setSelectedKey,
		toggleKeySelectionForBulk,
		isKeySelected,
		expandAll,
		collapseAll,
		setShowEditDialog,
		setEditValue,
		setShowDeleteDialog,
	} = useKeysStore();
	const expandedNodes = useKeysStore((state) => state.expandedNodes);

	const handleCopyKey = (key: string) => {
		navigator.clipboard.writeText(key);
		toast.success("Key copied to clipboard");
	};

	const handleCopyValue = (value: string) => {
		navigator.clipboard.writeText(value);
		toast.success("Value copied to clipboard");
	};

	const handleEditKey = (key: EtcdKey) => {
		setSelectedKey(key);
		setEditValue(key.value);
		setShowEditDialog(true);
	};

	const handleDeleteKey = (key: EtcdKey) => {
		setSelectedKey(key);
		setShowDeleteDialog(true);
	};

	const handleWatchKey = (key: string, isPrefix: boolean) => {
		if (onWatchKey) {
			onWatchKey(key, isPrefix);
		} else {
			toast.info(`Watching ${isPrefix ? "prefix" : "key"}: ${key}`);
		}
	};

	const handleExportPrefix = (prefix: string) => {
		if (onExportPrefix) {
			onExportPrefix(prefix);
		} else {
			toast.info(`Export prefix: ${prefix}`);
		}
	};

	const handleNodeClick = (node: TreeNode) => {
		if (node.isLeaf) {
			const key = allKeys.find((k) => k.key === node.fullPath);
			if (key) setSelectedKey(key);
		} else {
			toggleNode(node.fullPath);
		}
	};

	const handleCheckboxClick = (e: React.MouseEvent, node: TreeNode) => {
		e.stopPropagation();
		if (node.isLeaf) {
			toggleKeySelectionForBulk(node.fullPath);
		}
	};

	return (
		<>
			{nodes.map((node) => {
				const isExpanded = expandedNodes.has(node.fullPath);
				const keyData = node.isLeaf
					? allKeys.find((k) => k.key === node.fullPath)
					: null;

				return (
					<div key={node.fullPath} className="select-none">
						<ContextMenu>
							<ContextMenuTrigger asChild>
								<div
									className={`flex items-center gap-1 py-1 px-2 hover:bg-accent rounded cursor-pointer ${
										selectedKey?.key === node.fullPath ? "bg-accent" : ""
									}`}
									style={{ paddingLeft: `${level * 16 + 8}px` }}
									onClick={() => handleNodeClick(node)}
								>
									{!node.isLeaf && (
										<span className="w-4 h-4 flex items-center justify-center">
											{isExpanded ? (
												<ChevronDown className="w-3 h-3" />
											) : (
												<ChevronRight className="w-3 h-3" />
											)}
										</span>
									)}
									{node.isLeaf && (
										<div onClick={(e) => handleCheckboxClick(e, node)}>
											<Checkbox
												checked={isKeySelected(node.fullPath)}
												onCheckedChange={() =>
													toggleKeySelectionForBulk(node.fullPath)
												}
												aria-label={`Select ${node.fullPath}`}
											/>
										</div>
									)}
									{node.isLeaf ? (
										<FileKey className="w-4 h-4 text-primary" />
									) : (
										<Folder className="w-4 h-4 text-yellow-500" />
									)}
									<span className="text-sm truncate">{node.name}</span>
									{node.isLeaf && node.value && (
										<span className="text-xs text-muted-foreground truncate ml-2 max-w-[200px]">
											= {node.value}
										</span>
									)}
								</div>
							</ContextMenuTrigger>

							{node.isLeaf && keyData ? (
								<ContextMenuContent className="w-48">
									<ContextMenuItem
										onClick={() => handleCopyKey(node.fullPath)}
										className="gap-2"
									>
										<Copy className="h-4 w-4" />
										Copy key
									</ContextMenuItem>
									<ContextMenuItem
										onClick={() => handleCopyValue(keyData.value)}
										className="gap-2"
									>
										<Copy className="h-4 w-4" />
										Copy value
									</ContextMenuItem>
									<ContextMenuSeparator />
									<ContextMenuItem
										onClick={() => handleEditKey(keyData)}
										className="gap-2"
									>
										<Edit className="h-4 w-4" />
										Edit
									</ContextMenuItem>
									<ContextMenuItem
										onClick={() => handleDeleteKey(keyData)}
										className="gap-2 text-destructive"
									>
										<Trash2 className="h-4 w-4" />
										Delete
									</ContextMenuItem>
									<ContextMenuSeparator />
									<ContextMenuItem
										onClick={() => handleWatchKey(node.fullPath, false)}
										className="gap-2"
									>
										<Eye className="h-4 w-4" />
										Watch
									</ContextMenuItem>
								</ContextMenuContent>
							) : (
								<ContextMenuContent className="w-48">
									<ContextMenuItem onClick={expandAll} className="gap-2">
										<FolderOpen className="h-4 w-4" />
										Expand all
									</ContextMenuItem>
									<ContextMenuItem onClick={collapseAll} className="gap-2">
										<Folder className="h-4 w-4" />
										Collapse all
									</ContextMenuItem>
									<ContextMenuSeparator />
									<ContextMenuItem
										onClick={() => handleWatchKey(`${node.fullPath}/`, true)}
										className="gap-2"
									>
										<Eye className="h-4 w-4" />
										Watch prefix
									</ContextMenuItem>
									<ContextMenuItem
										onClick={() => handleExportPrefix(`${node.fullPath}/`)}
										className="gap-2"
									>
										<Download className="h-4 w-4" />
										Export prefix
									</ContextMenuItem>
								</ContextMenuContent>
							)}
						</ContextMenu>
						{isExpanded && node.children.length > 0 && (
							<TreeView
								nodes={node.children}
								allKeys={allKeys}
								level={level + 1}
								onWatchKey={onWatchKey}
								onExportPrefix={onExportPrefix}
							/>
						)}
					</div>
				);
			})}
		</>
	);
}
