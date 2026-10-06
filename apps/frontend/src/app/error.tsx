"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log the error to error tracking (e.g. Sentry)
    console.error("Global application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center animate-in fade-in-50 duration-200">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4 shadow-xs">
        <AlertTriangle className="h-8 w-8" aria-hidden="true" />
      </div>

      <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Đã có sự cố xảy ra!
      </h2>

      <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
        Hệ thống gặp lỗi không mong muốn trong quá trình xử lý yêu cầu. Vui lòng thử lại hoặc quay lại trang chủ.
      </p>

      {error.digest && (
        <div className="mt-3 rounded-md bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground border border-border">
          Mã sự cố (Digest): <span className="font-semibold text-foreground">{error.digest}</span>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={() => reset()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Thử lại
        </Button>

        <Button asChild variant="outline" className="gap-2">
          <Link href="/">
            <Home className="h-4 w-4" />
            Về trang chủ
          </Link>
        </Button>
      </div>
    </div>
  );
}
