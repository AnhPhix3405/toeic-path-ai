import React from "react";
import {
  Archive,
  CalendarClock,
  CheckCircle2,
  FileEdit,
  Lock,
} from "lucide-react";
import { ExamStatus, ExamType } from "@/types/exam";

export function ExamTypeBadge({ type }: { type: ExamType }) {
  switch (type) {
    case "full_test":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          Full Test (200 câu)
        </span>
      );
    case "placement_test":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
          Placement Test
        </span>
      );
    case "mini_test":
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
          Mini Test
        </span>
      );
  }
}

export function ExamStatusBadge({
  status,
  openAt,
  isScheduled,
}: {
  status: ExamStatus;
  openAt?: string | null;
  isScheduled?: boolean;
}) {
  const computedScheduled =
    isScheduled !== undefined
      ? isScheduled
      : Boolean(
          status === "published" &&
            openAt &&
            new Date(openAt).getTime() > Date.now()
        );

  if (status === "published" && computedScheduled) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
        <CalendarClock className="w-3 h-3" />
        Sắp diễn ra
      </span>
    );
  }

  switch (status) {
    case "published":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-3 h-3" />
          Đã xuất bản
        </span>
      );
    case "closed":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          <Lock className="w-3 h-3" />
          Đã đóng
        </span>
      );
    case "archived":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
          <Archive className="w-3 h-3" />
          Lưu trữ
        </span>
      );
    case "draft":
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          <FileEdit className="w-3 h-3" />
          Bản nháp
        </span>
      );
  }
}
