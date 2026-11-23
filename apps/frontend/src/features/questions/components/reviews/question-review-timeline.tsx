"use client";

import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  History,
  MessageSquareQuote,
  Sparkles,
  User as UserIcon,
  XCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  QuestionReviewAction,
  QuestionReviewLogItem,
} from "@/types/question-review";

export interface QuestionReviewTimelineProps {
  logs: QuestionReviewLogItem[];
  isLoading?: boolean;
}

function getActionStyle(action: QuestionReviewAction): {
  label: string;
  badgeClass: string;
  dotClass: string;
  icon: React.ReactNode;
} {
  switch (action) {
    case "approved":
      return {
        label: "Đã phê duyệt (Published)",
        badgeClass:
          "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        dotClass: "bg-emerald-500",
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      };
    case "quick_fix_approved":
      return {
        label: "Sửa nhanh & Phê duyệt",
        badgeClass:
          "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
        dotClass: "bg-indigo-500",
        icon: <Sparkles className="w-3.5 h-3.5 text-indigo-600" />,
      };
    case "revision_requested":
      return {
        label: "Yêu cầu chỉnh sửa",
        badgeClass:
          "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        dotClass: "bg-amber-500",
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
      };
    case "rejected":
    default:
      return {
        label: "Từ chối xuất bản",
        badgeClass:
          "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
        dotClass: "bg-rose-500",
        icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
      };
  }
}

export function QuestionReviewTimeline({
  logs,
  isLoading = false,
}: QuestionReviewTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
        <History className="w-7 h-7 text-slate-400 mx-auto" />
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Câu hỏi chưa có lịch sử kiểm duyệt
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Toàn bộ quyết định thẩm định và nhận xét của Reviewer sẽ được ghi nhận
          trên dòng thời gian này.
        </p>
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
      {logs.map((log) => {
        const style = getActionStyle(log.action);
        const reviewerDisplay =
          log.reviewer?.fullName ||
          log.reviewer?.email ||
          (log.reviewerId ? log.reviewerId.slice(0, 8) : "Reviewer");

        return (
          <div
            key={log.id}
            className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs space-y-2.5"
          >
            {/* Timeline Node Dot */}
            <span
              className={`absolute -left-[19px] top-4 w-3 h-3 rounded-full ring-4 ring-white dark:ring-slate-950 ${style.dotClass}`}
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.badgeClass}`}
                >
                  {style.icon}
                  {style.label}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Phiên bản v{log.version}
                </span>
              </div>

              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {new Date(log.createdAt).toLocaleString("vi-VN")}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <UserIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>Người thẩm định:</span>
              <strong className="text-slate-800 dark:text-slate-200">
                {reviewerDisplay}
              </strong>
            </div>

            {log.feedback && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200">
                <MessageSquareQuote className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed whitespace-pre-wrap">
                  {log.feedback}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
