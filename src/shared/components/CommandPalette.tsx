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
import {
	formatShortcut,
	shortcuts,
} from "@/shared/hooks/use-keyboard-shortcuts";

function shortcutLabel(description: string) {
	const shortcut = shortcuts.find((item) => item.description === description);
	return shortcut
		? formatShortcut(shortcut.key, shortcut.modifier, shortcut.shift)
		: null;
}

export function CommandPalette() {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		const handleToggle = () => setOpen((current) => !current);

		window.addEventListener("etcd:command-palette", handleToggle);
		return () =>
			window.removeEventListener("etcd:command-palette", handleToggle);
	}, []);

	const runCommand = useCallback((command: () => void) => {
		setOpen(false);
		command();
	}, []);

	const newConnectionShortcut = shortcutLabel("New connection");
	const refreshKeysShortcut = shortcutLabel("Refresh keys");
	const toggleSidebarShortcut = shortcutLabel("Toggle sidebar");
	const showHelpShortcut = shortcutLabel("Show shortcut help");

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
						{newConnectionShortcut && (
							<CommandShortcut>{newConnectionShortcut}</CommandShortcut>
						)}
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
						{refreshKeysShortcut && (
							<CommandShortcut>{refreshKeysShortcut}</CommandShortcut>
						)}
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
						{toggleSidebarShortcut && (
							<CommandShortcut>{toggleSidebarShortcut}</CommandShortcut>
						)}
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
						{showHelpShortcut && (
							<CommandShortcut>{showHelpShortcut}</CommandShortcut>
						)}
					</CommandItem>
				</CommandGroup>
			</CommandList>
		</CommandDialog>
	);
}
