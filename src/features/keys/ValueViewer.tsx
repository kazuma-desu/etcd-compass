"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/shared/utils";
import { JsonViewer } from "./JsonViewer";

interface ValueViewerProps {
	value: string;
	className?: string;
}

type TabType = "raw" | "json" | "hex" | "base64";

function isValidJSON(str: string): boolean {
	try {
		JSON.parse(str);
		return true;
	} catch {
		return false;
	}
}

function formatJSON(str: string): string {
	try {
		const parsed = JSON.parse(str);
		return JSON.stringify(parsed, null, 2);
	} catch {
		return str;
	}
}

function isValidBase64(str: string): boolean {
	try {
		if (str.trim() === "") return false;
		const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
		if (!base64Regex.test(str.replace(/\s/g, ""))) return false;
		const decoded = atob(str.replace(/\s/g, ""));
		return btoa(decoded) === str.replace(/\s/g, "");
	} catch {
		return false;
	}
}

function decodeBase64(str: string): string {
	try {
		const cleaned = str.replace(/\s/g, "");
		const decoded = atob(cleaned);
		return decoded;
	} catch {
		return str;
	}
}

function toHexDump(str: string): string {
	const encoder = new TextEncoder();
	const bytes = encoder.encode(str);
	const lines: string[] = [];

	for (let i = 0; i < bytes.length; i += 16) {
		const offset = i.toString(16).padStart(4, "0");
		const chunk = bytes.slice(i, i + 16);

		const hexBytes = Array.from(chunk)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join(" ");

		const ascii = Array.from(chunk)
			.map((b) => {
				const char = String.fromCharCode(b);
				return char >= " " && char <= "~" ? char : ".";
			})
			.join("");

		lines.push(`${offset}  ${hexBytes}  ${ascii}`);
	}

	return lines.join("\n");
}

async function copyToClipboard(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}

function JSONView({ value }: { value: string }) {
	const parsed = useMemo(() => {
		try {
			return JSON.parse(value);
		} catch {
			return null;
		}
	}, [value]);

	if (parsed === null) {
		return (
			<div className="p-4 text-muted-foreground text-sm">Invalid JSON</div>
		);
	}

	return (
		<div className="h-full">
			<JsonViewer data={parsed} rootName="root" />
		</div>
	);
}

function RawView({ value }: { value: string }) {
	const lines = useMemo(() => value.split("\n"), [value]);

	return (
		<div className="flex">
			<div className="bg-muted/50 border-r border-border select-none py-4 px-3 text-right">
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
						{value}
					</pre>
				</div>
			</ScrollArea>
		</div>
	);
}

function HexView({ value }: { value: string }) {
	const hexDump = useMemo(() => toHexDump(value), [value]);

	return (
		<ScrollArea className="h-full">
			<div className="p-4">
				<pre className="text-xs font-mono leading-5 whitespace-pre">
					{hexDump}
				</pre>
			</div>
		</ScrollArea>
	);
}

function Base64View({ value }: { value: string }) {
	const isValid = useMemo(() => isValidBase64(value), [value]);
	const decoded = useMemo(() => {
		if (!isValid) return null;
		return decodeBase64(value);
	}, [value, isValid]);

	if (!isValid || decoded === null) {
		return (
			<div className="p-4 text-muted-foreground text-sm">Not valid Base64</div>
		);
	}

	return (
		<div className="flex">
			<div className="bg-muted/50 border-r border-border select-none py-4 px-3 text-right">
				{decoded.split("\n").map((_, i) => (
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
						{decoded}
					</pre>
				</div>
			</ScrollArea>
		</div>
	);
}

function CopyButton({ text, label }: { text: string; label: string }) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(async () => {
		const success = await copyToClipboard(text);
		if (success) {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	}, [text]);

	return (
		<Button
			variant="ghost"
			size="sm"
			onClick={handleCopy}
			className="h-7 px-2 text-xs"
		>
			{copied ? (
				<>
					<Check className="w-3.5 h-3.5 mr-1.5" />
					Copied
				</>
			) : (
				<>
					<Copy className="w-3.5 h-3.5 mr-1.5" />
					Copy {label}
				</>
			)}
		</Button>
	);
}

export function ValueViewer({ value, className }: ValueViewerProps) {
	const defaultTab = useMemo(() => {
		if (isValidJSON(value)) return "json";
		return "raw";
	}, [value]);

	const [activeTab, setActiveTab] = useState<TabType>(defaultTab);

	useEffect(() => {
		const newDefault = isValidJSON(value) ? "json" : "raw";
		setActiveTab(newDefault);
	}, [value]);

	const getCopyContent = useCallback((): string => {
		switch (activeTab) {
			case "json":
				return formatJSON(value);
			case "hex":
				return toHexDump(value);
			case "base64":
				return isValidBase64(value) ? decodeBase64(value) : value;
			default:
				return value;
		}
	}, [activeTab, value]);

	const isBase64Valid = useMemo(() => isValidBase64(value), [value]);

	return (
		<div className={cn("flex flex-col h-full", className)}>
			<Tabs
				value={activeTab}
				onValueChange={(v) => setActiveTab(v as TabType)}
				className="flex-1 flex flex-col"
			>
				<div className="flex items-center justify-between border-b border-border px-2">
					<TabsList className="bg-transparent h-9">
						<TabsTrigger value="raw" className="text-xs">
							Raw
						</TabsTrigger>
						<TabsTrigger value="json" className="text-xs">
							JSON
						</TabsTrigger>
						<TabsTrigger value="hex" className="text-xs">
							Hex
						</TabsTrigger>
						<TabsTrigger value="base64" className="text-xs">
							Base64
						</TabsTrigger>
					</TabsList>

					<CopyButton
						text={getCopyContent()}
						label={activeTab === "raw" ? "" : activeTab.toUpperCase()}
					/>
				</div>

				<TabsContent value="raw" className="flex-1 mt-0 border-0 p-0">
					<div className="border rounded-md mt-2 bg-muted/30">
						<RawView value={value} />
					</div>
				</TabsContent>

				<TabsContent value="json" className="flex-1 mt-0 border-0 p-0">
					<div className="border rounded-md mt-2 bg-muted/30 overflow-auto">
						<JSONView value={value} />
					</div>
				</TabsContent>

				<TabsContent value="hex" className="flex-1 mt-0 border-0 p-0">
					<div className="border rounded-md mt-2 bg-muted/30 h-[300px]">
						<HexView value={value} />
					</div>
				</TabsContent>

				<TabsContent value="base64" className="flex-1 mt-0 border-0 p-0">
					<div
						className={cn(
							"border rounded-md mt-2 bg-muted/30",
							isBase64Valid
								? "h-auto"
								: "h-[100px] flex items-center justify-center",
						)}
					>
						<Base64View value={value} />
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}

export default ValueViewer;
