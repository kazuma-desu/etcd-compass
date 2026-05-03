import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDeleteKey = vi.fn();

vi.mock("./keys-store", () => ({
	useKeysStore: vi.fn().mockReturnValue({
		showDeleteDialog: true,
		selectedKey: {
			key: "/test/key",
			value: "test-value",
			version: 1,
			create_revision: 1,
			mod_revision: 1,
			lease: 0,
		},
		setShowDeleteDialog: vi.fn(),
		deleteKey: (...args: unknown[]) => mockDeleteKey(...args),
	}),
}));

vi.mock("@/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		disabled,
		variant,
	}: {
		children?: React.ReactNode;
		onClick?: () => void;
		disabled?: boolean;
		variant?: string;
	}) => (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			data-variant={variant}
		>
			{children}
		</button>
	),
}));

vi.mock("@/components/ui/dialog", () => ({
	Dialog: ({ children }: { children?: React.ReactNode }) => (
		<div>{children}</div>
	),
	DialogContent: ({ children }: { children?: React.ReactNode }) => (
		<div data-testid="delete-key-dialog">{children}</div>
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

import { DeleteKeyDialog } from "./DeleteKeyDialog";

describe("DeleteKeyDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDeleteKey.mockResolvedValue(undefined);
	});

	it("should call deleteKey when Delete button is clicked", async () => {
		render(<DeleteKeyDialog connectionId="conn-1" />);

		fireEvent.click(screen.getByText("Delete"));

		await waitFor(() => {
			expect(mockDeleteKey).toHaveBeenCalledWith("conn-1");
		});
	});

	it("should prevent double-submit on rapid clicks", async () => {
		const resolveRef = { current: null as (() => void) | null };
		mockDeleteKey.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					resolveRef.current = resolve;
				}),
		);

		render(<DeleteKeyDialog connectionId="conn-1" />);

		const deleteButton = screen.getByText("Delete");
		fireEvent.click(deleteButton);
		fireEvent.click(deleteButton);

		expect(mockDeleteKey).toHaveBeenCalledTimes(1);

		resolveRef.current?.();

		await waitFor(() => {
			expect(mockDeleteKey).toHaveBeenCalledTimes(1);
		});
	});

	it("should disable the Delete button while deleting", async () => {
		const resolveRef = { current: null as (() => void) | null };
		mockDeleteKey.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					resolveRef.current = resolve;
				}),
		);

		render(<DeleteKeyDialog connectionId="conn-1" />);

		const deleteButton = screen.getByText("Delete");
		fireEvent.click(deleteButton);

		await waitFor(() => {
			expect(deleteButton).toBeDisabled();
		});

		resolveRef.current?.();

		await waitFor(() => {
			expect(deleteButton).not.toBeDisabled();
		});
	});

	it("should show a loading spinner while deleting", async () => {
		const resolveRef = { current: null as (() => void) | null };
		mockDeleteKey.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					resolveRef.current = resolve;
				}),
		);

		render(<DeleteKeyDialog connectionId="conn-1" />);

		fireEvent.click(screen.getByText("Delete"));

		await waitFor(() => {
			expect(document.querySelector(".animate-spin")).toBeInTheDocument();
		});

		resolveRef.current?.();
	});
});
