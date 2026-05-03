import { AlertTriangle, Compass, RotateCcw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
	readonly children: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		console.error(
			"ErrorBoundary caught an error:",
			error.message,
			"\nComponent stack:",
			errorInfo.componentStack,
		);
	}

	private readonly handleReload = (): void => {
		globalThis.location.reload();
	};

	render(): ReactNode {
		if (this.state.hasError) {
			return (
				<div className="flex items-center justify-center min-h-[100dvh] h-[100dvh] bg-background p-6">
					<div className="text-center space-y-8 max-w-md mx-auto animate-in fade-in zoom-in duration-500">
						<div className="relative w-32 h-32 mx-auto flex items-center justify-center">
							<div className="absolute inset-0 bg-destructive/10 rounded-full animate-pulse" />
							<div className="absolute inset-3 bg-destructive/15 rounded-full animate-pulse delay-150" />
							<Compass className="w-14 h-14 text-destructive z-10" />
							<div className="absolute -top-1 -right-1 w-8 h-8 bg-destructive/10 rounded-full flex items-center justify-center border border-destructive/20">
								<AlertTriangle className="w-4 h-4 text-destructive" />
							</div>
						</div>

						<div className="space-y-3">
							<h1 className="text-2xl font-semibold tracking-tight text-foreground">
								Something went wrong
							</h1>
							<p className="text-sm text-muted-foreground">
								An unexpected error occurred in the application. You can try
								reloading to recover.
							</p>
						</div>

						{this.state.error && (
							<div className="p-4 bg-muted/50 rounded-xl border border-border/60 text-left">
								<p className="text-xs font-medium text-muted-foreground mb-1">
									Error details
								</p>
								<code className="text-xs text-destructive font-mono break-all">
									{this.state.error.message}
								</code>
							</div>
						)}

						<Button
							onClick={this.handleReload}
							size="lg"
							className="gap-2 w-full sm:w-auto font-medium rounded-lg"
						>
							<RotateCcw className="w-4 h-4" />
							Reload Application
						</Button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
