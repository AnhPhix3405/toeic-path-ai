import React from "react";
import { Badge } from "@/components/ui/badge";
import { QuestionStatus } from "@/types/question";

interface QuestionStatusBadgeProps {
  status: QuestionStatus;
  className?: string;
}

const statusConfig: Record<
  QuestionStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; colorClass: string }
> = {
  draft: {
    label: "Bản nháp",
    variant: "secondary",
    colorClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200",
  },
  pending_review: {
    label: "Chờ duyệt",
    variant: "outline",
    colorClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-300 dark:border-amber-800",
  },
  published: {
    label: "Đã xuất bản",
    variant: "default",
    colorClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800",
  },
  revision_requested: {
    label: "Yêu cầu sửa",
    variant: "outline",
    colorClass: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border-orange-300 dark:border-orange-800",
  },
  rejected: {
    label: "Từ chối",
    variant: "destructive",
    colorClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-300 dark:border-rose-800",
  },
};

export function QuestionStatusBadge({ status, className }: QuestionStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <Badge
      variant={config.variant}
      className={`font-medium border ${config.colorClass} ${className || ""}`}
    >
      {config.label}
    </Badge>
  );
}
