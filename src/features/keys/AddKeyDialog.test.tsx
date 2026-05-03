import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAddKey = vi.fn();

vi.mock("./keys-store", () => ({
	useKeysStore: vi.fn().mockReturnValue({
		showAddDialog: true,
		newKey: "test-key",
		newValue: "test-value",
		newKeyLeaseId: null,
		setShowAddDialog: vi.fn(),
		setNewKey: vi.fn(),
		setNewValue: vi.fn(),
		setNewKeyLeaseId: vi.fn(),
		addKey: (...args: unknown[]) => mockAddKey(...args),
	}),
}));

vi.mock("@/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		disabled,
	}: {
		children?: React.ReactNode;
		onClick?: () => void;
		disabled?: boolean;
	}) => (
		<button type="button" onClick={onClick} disabled={disabled}>
			{children}
		</button>
	),
}));

vi.mock("@/components/ui/dialog", () => ({
	Dialog: ({ children }: { children?: React.ReactNode }) => (
		<div>{children}</div>
	),
	DialogContent: ({ children }: { children?: React.ReactNode }) => (
		<div data-testid="add-key-dialog">{children}</div>
	),
	DialogDescription: ({ children }: { children?: React.ReactNode }) => (
		<div>{children}</div>
	),
	DialogFooter: ({ children }: { children?: React.ReactNode }) => (
		<div>{children}</div>
	),
	DialogHeader: ({ children }: { children?: React.ReactNode }) => (
		<div>{children}</div>
	),
	DialogTitle: ({ children }: { children?: React.ReactNode }) => (
		<div>{children}</div>
	),
}));

vi.mock("@/components/ui/input", () => ({
	Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
		<input {...props} />
	),
}));

vi.mock("@/components/ui/label", () => ({
	Label: ({
		children,
		htmlFor,
	}: {
		children?: React.ReactNode;
		htmlFor?: string;
	}) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock("@/features/leases/LeaseSelector", () => ({
	LeaseSelector: () => <div data-testid="lease-selector" />,
}));

import { AddKeyDialog } from "./AddKeyDialog";

describe("AddKeyDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockAddKey.mockResolvedValue(undefined);
	});

	it("should call addKey when Add Key button is clicked", async () => {
		render(<AddKeyDialog connectionId="conn-1" />);

		fireEvent.click(screen.getByText("Add Key"));

		await waitFor(() => {
			expect(mockAddKey).toHaveBeenCalledWith("conn-1", undefined);
		});
	});

	it("should prevent double-submit on rapid clicks", async () => {
		const resolveRef = { current: null as (() => void) | null };
		mockAddKey.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					resolveRef.current = resolve;
				}),
		);

		render(<AddKeyDialog connectionId="conn-1" />);

		const addButton = screen.getByText("Add Key");
		fireEvent.click(addButton);
		fireEvent.click(addButton);

		expect(mockAddKey).toHaveBeenCalledTimes(1);

		act(() => {
			resolveRef.current?.();
		});

		await waitFor(() => {
			expect(mockAddKey).toHaveBeenCalledTimes(1);
		});
	});

	it("should disable the Add Key button while submitting", async () => {
		const resolveRef = { current: null as (() => void) | null };
		mockAddKey.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					resolveRef.current = resolve;
				}),
		);

		render(<AddKeyDialog connectionId="conn-1" />);

		const addButton = screen.getByText("Add Key");
		fireEvent.click(addButton);

		await waitFor(() => {
			expect(addButton).toBeDisabled();
		});

		act(() => {
			resolveRef.current?.();
		});

		await waitFor(() => {
			expect(addButton).not.toBeDisabled();
		});
	});

	it("should show a loading spinner while submitting", async () => {
		const resolveRef = { current: null as (() => void) | null };
		mockAddKey.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					resolveRef.current = resolve;
				}),
		);

		render(<AddKeyDialog connectionId="conn-1" />);

		fireEvent.click(screen.getByText("Add Key"));

		await waitFor(() => {
			expect(document.querySelector(".animate-spin")).toBeInTheDocument();
		});

		act(() => {
			resolveRef.current?.();
		});

		await waitFor(() => {
			expect(document.querySelector(".animate-spin")).not.toBeInTheDocument();
		});
	});
});
