import React from "react";
import * as Sentry from "@sentry/react";
import { Result, Button } from "antd";
import { UndoOutlined, BugOutlined } from "@ant-design/icons";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary that catches React errors and displays a user-friendly message
 */
class ErrorBoundaryComponent extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, _errorInfo: React.ErrorInfo): void {
    // Log to Sentry
    Sentry.captureException(error);
    console.error("Error boundary caught error:", error);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    // Reload the extension to clear state
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "24px" }}>
          <Result
            status="error"
            title="Oops, something went wrong"
            subTitle={
              <>
                <p>We've logged this error and our team has been notified.</p>
                <p style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
                  {this.state.error?.message || "An unexpected error occurred"}
                </p>
              </>
            }
            extra={[
              <Button
                type="primary"
                key="retry"
                icon={<UndoOutlined />}
                onClick={this.handleReset}
              >
                Try Again
              </Button>,
              <Button
                key="report"
                icon={<BugOutlined />}
                onClick={() => {
                  // Could open a feedback form or support page
                  Sentry.showReportDialog();
                }}
              >
                Report Issue
              </Button>
            ]}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

// Export wrapped with Sentry error boundary
export const ErrorBoundary = Sentry.withErrorBoundary(ErrorBoundaryComponent, {
  fallback: (
    <div style={{ padding: "24px", textAlign: "center" }}>
      <p>Application error. Please refresh and try again.</p>
    </div>
  ),
  showDialog: false
});
