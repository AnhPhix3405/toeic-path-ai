"use client";

import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ExamSyncStatus } from "@/types/exam-attempt";

export interface ExamConnectionBadgeProps {
  status: ExamSyncStatus;
  pendingCount: number;
  onManualSync?: () => void;
  isSyncing?: boolean;
  className?: string;
}

export function ExamConnectionBadge({
  status,
  pendingCount,
  onManualSync,
  isSyncing = false,
  className,
}: ExamConnectionBadgeProps) {
  const config = (() => {
    if (status === "offline") {
      return {
        label:
          pendingCount > 0
            ? `Ngoại tuyến (${pendingCount} câu chờ đồng bộ)`
            : "Đang ngoại tuyến",
        badgeClass:
          "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800",
        icon: <CloudOff className="w-3.5 h-3.5 shrink-0" />,
      };
    }

    if (status === "syncing" || isSyncing) {
      return {
        label: "Đang lưu đáp án...",
        badgeClass:
          "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
        icon: <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />,
      };
    }

    if (status === "error") {
      return {
        label:
          pendingCount > 0
            ? `Chờ đồng bộ lại (${pendingCount})`
            : "Lỗi đồng bộ tạm thời",
        badgeClass:
          "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
        icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0" />,
      };
    }

    return {
      label:
        pendingCount > 0
          ? `Đã lưu tạm (${pendingCount} câu chờ)`
          : "Đã lưu tự động",
      badgeClass:
        "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />,
    };
  })();

  return (
    <div
      className={cn("inline-flex items-center gap-1.5", className)}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors",
          config.badgeClass
        )}
      >
        {config.icon}
        <span className="hidden sm:inline">{config.label}</span>
      </span>

      {onManualSync && (
        <button
          type="button"
          onClick={onManualSync}
          disabled={isSyncing}
          aria-label="Đồng bộ ngay trạng thái bài thi"
          title="Đồng bộ ngay trạng thái bài thi (#1007)"
          className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
        >
          <RefreshCw
            className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")}
          />
        </button>
      )}
    </div>
  );
}
