import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  /** The child components to wrap. */
  children: ReactNode;
}

interface State {
  /** Whether an error has occurred. */
  hasError: boolean;
  /** The error object, if any. */
  error: Error | null;
}

/**
 * A React Error Boundary component.
 * It catches JavaScript errors anywhere in the child component tree, logs those errors,
 * and displays a fallback UI instead of the component tree that crashed.
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  /**
   * Updates state so the next render will show the fallback UI.
   */
  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  /**
   * Logs the error information.
   */
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div>
          <h1>Sorry.. there was an error</h1>
          <pre>{this.state.error?.toString()}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
