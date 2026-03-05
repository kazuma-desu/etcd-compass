import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock Tauri API
vi.mock("@tauri-apps/api/tauri", () => ({
	invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/dialog", () => ({
	save: vi.fn(),
	open: vi.fn(),
}));

vi.mock("@tauri-apps/api/fs", () => ({
	writeTextFile: vi.fn(),
	readTextFile: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
	},
}));

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// Mock navigator.clipboard
Object.defineProperty(navigator, "clipboard", {
	writable: true,
	value: {
		writeText: vi.fn(),
		readText: vi.fn(),
	},
});

// Mock navigator.platform for keyboard shortcuts
Object.defineProperty(navigator, "platform", {
	writable: true,
	value: "MacIntel",
});
