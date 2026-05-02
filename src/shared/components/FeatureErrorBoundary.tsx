import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component } from "react";
import { Button } from "@/components/ui/button";

interface FeatureErrorBoundaryProps {
	featureName: string;
	children: React.ReactNode;
}

interface FeatureErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

export class FeatureErrorBoundary extends Component<
	FeatureErrorBoundaryProps,
	FeatureErrorBoundaryState
> {
	constructor(props: FeatureErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): FeatureErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		// eslint-disable-next-line no-console
		console.error(
			`FeatureErrorBoundary caught error in "${this.props.featureName}":`,
			error,
			errorInfo,
		);
	}

	handleRetry = () => {
		this.setState({ hasError: false, error: null });
	};

	render() {
		if (this.state.hasError) {
			return (
				<div className="h-full flex flex-col items-center justify-center p-6 text-center">
					<div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
						<AlertTriangle className="w-6 h-6 text-destructive" />
					</div>
					<h3 className="text-sm font-semibold text-foreground mb-1">
						{this.props.featureName} encountered an error
					</h3>
					<p className="text-xs text-muted-foreground max-w-[280px] mb-4 break-words">
						{this.state.error?.message || "An unexpected error occurred."}
					</p>
					<Button
						variant="outline"
						size="sm"
						onClick={this.handleRetry}
						className="gap-2"
					>
						<RefreshCw className="w-3.5 h-3.5" />
						Retry
					</Button>
				</div>
			);
		}

		return this.props.children;
	}
}
