"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="rounded-full bg-destructive/10 p-4 text-destructive mb-4">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Đã có sự cố xảy ra!
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Hệ thống gặp lỗi không mong muốn trong quá trình xử lý yêu cầu. Vui lòng thử lại hoặc tải lại trang.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs font-mono text-muted-foreground">
          Mã lỗi (Digest): {error.digest}
        </p>
      )}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
          type="button"
        >
          <RefreshCw className="h-4 w-4" /> Thử lại
        </button>
      </div>
    </div>
  );
}
