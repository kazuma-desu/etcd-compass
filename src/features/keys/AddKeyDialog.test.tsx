import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const toastError = vi.fn();
vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: (...args: unknown[]) => toastError(...args),
	},
}));

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
		children?: ReactNode;
		onClick?: () => void;
		disabled?: boolean;
	}) => (
		<button type="button" onClick={onClick} disabled={disabled}>
			{children}
		</button>
	),
}));

vi.mock("@/components/ui/dialog", () => ({
	Dialog: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
	DialogContent: ({ children }: { children?: ReactNode }) => (
		<div data-testid="add-key-dialog">{children}</div>
	),
	DialogDescription: ({ children }: { children?: ReactNode }) => (
		<div>{children}</div>
	),
	DialogFooter: ({ children }: { children?: ReactNode }) => (
		<div>{children}</div>
	),
	DialogHeader: ({ children }: { children?: ReactNode }) => (
		<div>{children}</div>
	),
	DialogTitle: ({ children }: { children?: ReactNode }) => (
		<div>{children}</div>
	),
}));

vi.mock("@/components/ui/input", () => ({
	Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
	Label: ({
		children,
		htmlFor,
	}: {
		children?: ReactNode;
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

	it("should show error toast and keep dialog open on addKey failure", async () => {
		const setShowAddDialogMock = vi.fn();
		const { useKeysStore } = await import("./keys-store");
		vi.mocked(useKeysStore).mockReturnValue({
			showAddDialog: true,
			newKey: "test-key",
			newValue: "test-value",
			newKeyLeaseId: null,
			setShowAddDialog: setShowAddDialogMock,
			setNewKey: vi.fn(),
			setNewValue: vi.fn(),
			setNewKeyLeaseId: vi.fn(),
			addKey: (...args: unknown[]) => mockAddKey(...args),
		});

		const error = new Error("etcd connection failed");
		mockAddKey.mockRejectedValue(error);

		render(<AddKeyDialog connectionId="conn-1" />);

		fireEvent.click(screen.getByText("Add Key"));

		await waitFor(() => {
			expect(toastError).toHaveBeenCalledWith("etcd connection failed");
		});

		expect(setShowAddDialogMock).not.toHaveBeenCalledWith(false);
	});
});
