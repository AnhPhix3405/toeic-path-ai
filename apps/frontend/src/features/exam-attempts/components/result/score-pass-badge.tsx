"use client";

import React from "react";
import { Award, MinusCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function ScorePassBadge({
  isPassed,
  className,
}: {
  isPassed: boolean | null;
  className?: string;
}) {
  if (isPassed === null) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
          className
        )}
      >
        <MinusCircle className="w-3.5 h-3.5" />
        Không xét Đạt/Trượt
      </span>
    );
  }

  if (isPassed) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
          className
        )}
      >
        <Award className="w-3.5 h-3.5" />
        Đạt yêu cầu
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
        className
      )}
    >
      <XCircle className="w-3.5 h-3.5" />
      Chưa đạt
    </span>
  );
}
