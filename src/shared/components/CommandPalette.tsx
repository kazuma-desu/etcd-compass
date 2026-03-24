import {
	CirclePlus,
	HelpCircle,
	PanelLeft,
	RefreshCw,
	Server,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandShortcut,
} from "@/components/ui/command";

export function CommandPalette() {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((open) => !open);
			}
		};

		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, []);

	const runCommand = useCallback((command: () => void) => {
		setOpen(false);
		command();
	}, []);

	return (
		<CommandDialog open={open} onOpenChange={setOpen}>
			<CommandInput placeholder="Type a command or search..." />
			<CommandList>
				<CommandEmpty>No results found.</CommandEmpty>
				<CommandGroup heading="General">
					<CommandItem
						onSelect={() =>
							runCommand(() =>
								window.dispatchEvent(new CustomEvent("etcd:new-connection")),
							)
						}
					>
						<Server className="mr-2 size-4" />
						Connect to cluster
						<CommandShortcut>⌘N</CommandShortcut>
					</CommandItem>
					<CommandItem
						onSelect={() =>
							runCommand(() =>
								window.dispatchEvent(new CustomEvent("etcd:refresh-keys")),
							)
						}
					>
						<RefreshCw className="mr-2 size-4" />
						Refresh keys
						<CommandShortcut>⌘R</CommandShortcut>
					</CommandItem>
					<CommandItem
						onSelect={() =>
							runCommand(() =>
								window.dispatchEvent(new CustomEvent("etcd:add-key")),
							)
						}
					>
						<CirclePlus className="mr-2 size-4" />
						Add new key
						<CommandShortcut>⌘N</CommandShortcut>
					</CommandItem>
					<CommandItem
						onSelect={() =>
							runCommand(() =>
								window.dispatchEvent(new CustomEvent("etcd:toggle-sidebar")),
							)
						}
					>
						<PanelLeft className="mr-2 size-4" />
						Toggle sidebar
						<CommandShortcut>⌘⇧D</CommandShortcut>
					</CommandItem>
					<CommandItem
						onSelect={() =>
							runCommand(() =>
								window.dispatchEvent(new CustomEvent("etcd:show-help")),
							)
						}
					>
						<HelpCircle className="mr-2 size-4" />
						Show keyboard shortcuts
						<CommandShortcut>⌘?</CommandShortcut>
					</CommandItem>
				</CommandGroup>
			</CommandList>
		</CommandDialog>
	);
}
