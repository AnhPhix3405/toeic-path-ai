"use client";

import React from "react";
import {
  CheckCircle2,
  Clock,
  Eye,
  XCircle,
  AlertTriangle,
  FileWarning,
  VolumeX,
  HelpCircle,
  MessageSquare,
} from "lucide-react";
import {
  QuestionReportReason,
  QuestionReportStatus,
} from "@/types/question-report";
import { cn } from "@/lib/utils";

const statusMeta: Record<
  QuestionReportStatus,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: {
    label: "Chờ xử lý",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
    icon: Clock,
  },
  in_review: {
    label: "Đang kiểm tra",
    className:
      "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800",
    icon: Eye,
  },
  resolved: {
    label: "Đã xử lý",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Từ chối",
    className:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800",
    icon: XCircle,
  },
};

export function QuestionReportStatusBadge({
  status,
  className,
}: {
  status: QuestionReportStatus;
  className?: string;
}) {
  const meta = statusMeta[status] ?? statusMeta.pending;
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap",
        meta.className,
        className
      )}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {meta.label}
    </span>
  );
}

export const QUESTION_REPORT_REASON_LABELS: Record<QuestionReportReason, string> = {
  wrong_answer: "Sai đáp án",
  typo_error: "Lỗi chính tả / Nội dung",
  broken_media: "Lỗi Audio / Hình ảnh",
  unclear_explanation: "Lời giải chưa rõ ràng",
  other: "Lý do khác",
};

const reasonIcons: Record<
  QuestionReportReason,
  React.ComponentType<{ className?: string }>
> = {
  wrong_answer: AlertTriangle,
  typo_error: FileWarning,
  broken_media: VolumeX,
  unclear_explanation: HelpCircle,
  other: MessageSquare,
};

export function QuestionReportReasonBadge({
  reason,
  className,
}: {
  reason: QuestionReportReason;
  className?: string;
}) {
  const Icon = reasonIcons[reason] ?? MessageSquare;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 whitespace-nowrap",
        className
      )}
    >
      <Icon className="w-3 h-3 shrink-0 text-indigo-500" />
      {QUESTION_REPORT_REASON_LABELS[reason] ?? reason}
    </span>
  );
}
