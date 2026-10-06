"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  resetErrorBoundary = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback(this.state.error, this.resetErrorBoundary);
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[200px] w-full flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-3">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            Thành phần gặp sự cố khi hiển thị
          </h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            {this.state.error.message || "Đã xảy ra lỗi không xác định. Vui lòng thử tải lại khối nội dung này."}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={this.resetErrorBoundary}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Thử tải lại
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
