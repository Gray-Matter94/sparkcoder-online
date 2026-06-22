import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportLovableError } from "../lib/lovable-error-reporting";

interface Props {
  children: ReactNode;
  /** Friendly label for the area that failed, e.g. "Stats" */
  name?: string;
  /** Optional custom fallback UI */
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ""}]`, error, info);
    try {
      reportLovableError(error, {
        boundary: "react_error_boundary",
        name: this.props.name ?? "unknown",
        componentStack: info.componentStack ?? undefined,
      });
    } catch {
      /* swallow reporter errors */
    }
  }

  private handleRetry = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const label = this.props.name ?? "This section";
    return (
      <div
        role="alert"
        className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-foreground"
      >
        <p className="font-semibold">{label} couldn't load.</p>
        <p className="mt-1 text-muted-foreground">
          Something went wrong rendering this area. The rest of the page still works.
        </p>
        <button
          onClick={this.handleRetry}
          className="mt-3 inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
