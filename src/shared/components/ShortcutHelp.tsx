import { Keyboard } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	formatShortcut,
	modifierKey,
	shortcuts,
} from "@/shared/hooks/use-keyboard-shortcuts";

interface ShortcutHelpProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ShortcutHelp({ open, onOpenChange }: ShortcutHelpProps) {
	const navigationShortcuts = shortcuts.filter((s) =>
		["n", "t", "w", "]", "["].includes(s.key),
	);

	const actionShortcuts = shortcuts.filter((s) =>
		["r", "f", "Delete"].includes(s.key),
	);

	const uiShortcuts = shortcuts.filter((s) => [",", "d", "?"].includes(s.key));

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px] max-h-[80vh] p-0">
				<DialogHeader className="px-6 pt-6 pb-2">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Keyboard className="h-5 w-5 text-primary" />
							<DialogTitle>Keyboard Shortcuts</DialogTitle>
						</div>
					</div>
				</DialogHeader>

				<ScrollArea className="max-h-[60vh]">
					<div className="px-6 pb-6 space-y-6">
						<div className="text-sm text-muted-foreground">
							Use <Kbd>{modifierKey}</Kbd> as the modifier key on your system.
						</div>

						<section>
							<h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
								Navigation
							</h3>
							<div className="space-y-2">
								{navigationShortcuts.map((shortcut) => (
									<div
										key={shortcut.key}
										className="flex items-center justify-between py-1.5"
									>
										<span className="text-sm">{shortcut.description}</span>
										<Kbd>
											{formatShortcut(
												shortcut.key,
												shortcut.modifier,
												"shift" in shortcut ? shortcut.shift : false,
											)}
										</Kbd>
									</div>
								))}
							</div>
						</section>

						<section>
							<h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
								Actions
							</h3>
							<div className="space-y-2">
								{actionShortcuts.map((shortcut) => (
									<div
										key={shortcut.key}
										className="flex items-center justify-between py-1.5"
									>
										<span className="text-sm">{shortcut.description}</span>
										<Kbd>
											{formatShortcut(
												shortcut.key,
												shortcut.modifier,
												"shift" in shortcut ? shortcut.shift : false,
											)}
										</Kbd>
									</div>
								))}
							</div>
						</section>

						<section>
							<h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
								Interface
							</h3>
							<div className="space-y-2">
								{uiShortcuts.map((shortcut) => (
									<div
										key={shortcut.key}
										className="flex items-center justify-between py-1.5"
									>
										<span className="text-sm">{shortcut.description}</span>
										<Kbd>
											{formatShortcut(
												shortcut.key,
												shortcut.modifier,
												"shift" in shortcut ? shortcut.shift : false,
											)}
										</Kbd>
									</div>
								))}
							</div>
						</section>

						<div className="pt-4 border-t text-xs text-muted-foreground">
							Tip: Press <Kbd>{formatShortcut("?", true)}</Kbd> anytime to show
							this dialog.
						</div>
					</div>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}
