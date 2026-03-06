/**
 * Native platform commands — file dialogs, filesystem, certificates
 *
 * Wraps Tauri's native APIs (dialog, fs) and the pick_certificate_file command.
 * All native platform interactions go through here.
 */

import { invoke } from "@tauri-apps/api/core";
import { type DialogFilter, open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

// Certificate file picker (native OS dialog via Rust)
export async function pickCertificateFile(): Promise<string | null> {
	return invoke<string | null>("pick_certificate_file");
}

// File dialogs
export async function saveFileDialog(
	filters: DialogFilter[],
	defaultPath?: string,
): Promise<string | null> {
	return save({ filters, defaultPath });
}

export async function openFileDialog(
	filters: DialogFilter[],
	multiple?: boolean,
): Promise<string | string[] | null> {
	return open({ filters, multiple });
}

// Filesystem
export async function writeFile(path: string, content: string): Promise<void> {
	return writeTextFile(path, content);
}

export async function readFile(path: string): Promise<string> {
	return readTextFile(path);
}
