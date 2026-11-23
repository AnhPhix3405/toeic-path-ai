"use client";

import React from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileDiff,
  GitCommitHorizontal,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  QuestionHistoryChangeType,
  QuestionHistoryItem,
} from "@/types/question-review";
import { computeQuestionSnapshotDiff } from "@/lib/validations/question-review.schema";

export interface QuestionHistoryDiffViewerProps {
  histories: QuestionHistoryItem[];
  isLoading?: boolean;
}

function getChangeTypeMeta(changeType: QuestionHistoryChangeType): {
  label: string;
  badgeClass: string;
} {
  switch (changeType) {
    case "quick_fixed":
      return {
        label: "Reviewer sửa nhanh & duyệt",
        badgeClass:
          "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
      };
    case "resubmitted":
      return {
        label: "Giáo viên sửa & gửi duyệt lại",
        badgeClass:
          "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      };
    case "updated":
      return {
        label: "Cập nhật nội dung",
        badgeClass:
          "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
      };
    case "status_changed":
      return {
        label: "Chuyển trạng thái",
        badgeClass:
          "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      };
    case "created":
    default:
      return {
        label: "Khởi tạo câu hỏi",
        badgeClass:
          "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      };
  }
}

export function QuestionHistoryDiffViewer({
  histories,
  isLoading = false,
}: QuestionHistoryDiffViewerProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!histories || histories.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
        <FileDiff className="w-7 h-7 text-slate-400 mx-auto" />
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Chưa có lịch sử thay đổi phiên bản
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Các bản chụp (snapshots) trước và sau khi chỉnh sửa sẽ được lưu vết
          tại đây.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {histories.map((item) => {
        const meta = getChangeTypeMeta(item.changeType);
        const diff = computeQuestionSnapshotDiff(
          item.snapshotBefore,
          item.snapshotAfter
        );

        const authorDisplay =
          item.author?.fullName ||
          item.author?.email ||
          (item.changedBy ? item.changedBy.slice(0, 8) : "Hệ thống");

        return (
          <div
            key={item.id}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <GitCommitHorizontal className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${meta.badgeClass}`}
                >
                  {meta.label}
                </span>
                {item.snapshotAfter?.version && (
                  <span className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-200">
                    v{item.snapshotBefore?.version ?? 1} → v
                    {item.snapshotAfter.version}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <UserIcon className="w-3 h-3" />
                  {authorDisplay}
                </span>
                <span>{new Date(item.createdAt).toLocaleString("vi-VN")}</span>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3 text-xs">
              {item.comment && (
                <p className="text-xs italic text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800">
                  Ghi chú: &ldquo;{item.comment}&rdquo;
                </p>
              )}

              {/* Content Diff */}
              {(diff.contentChanged || diff.isInitialCreation) && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Nội dung câu hỏi
                  </p>
                  {!diff.isInitialCreation && (
                    <div className="p-2.5 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 line-through">
                      <span className="font-semibold mr-1.5 no-underline">
                        [Trước]:
                      </span>
                      {diff.beforeContent || "(Trống / Không có văn bản riêng)"}
                    </div>
                  )}
                  <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200">
                    <span className="font-semibold mr-1.5">[Sau]:</span>
                    {diff.afterContent || "(Trống / Không có văn bản riêng)"}
                  </div>
                </div>
              )}

              {/* Explanation Diff */}
              {diff.explanationChanged && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Lời giải chi tiết
                  </p>
                  <div className="p-2.5 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 line-through">
                    <span className="font-semibold mr-1.5 no-underline">
                      [Trước]:
                    </span>
                    {diff.beforeExplanation || "(Chưa có lời giải)"}
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200">
                    <span className="font-semibold mr-1.5">[Sau]:</span>
                    {diff.afterExplanation || "(Chưa có lời giải)"}
                  </div>
                </div>
              )}

              {/* Options Diff */}
              {diff.optionDiffs.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Phương án lựa chọn
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {diff.optionDiffs.map((opt) => {
                      const hasOptDiff =
                        opt.contentChanged || opt.correctChanged;

                      return (
                        <div
                          key={opt.id}
                          className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                            hasOptDiff
                              ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60"
                              : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/70 dark:border-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                              {opt.label}
                            </span>

                            {opt.contentChanged ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 line-through">
                                  {opt.beforeContent || "(Trống)"}
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-semibold">
                                  {opt.afterContent || "(Trống)"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-700 dark:text-slate-300">
                                {opt.afterContent || (
                                  <span className="italic text-slate-400">
                                    (Audio Option)
                                  </span>
                                )}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {opt.correctChanged ? (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                                {opt.beforeCorrect ? "Đáp án đúng" : "Sai"} →{" "}
                                {opt.afterCorrect ? "Đáp án đúng" : "Sai"}
                              </span>
                            ) : opt.afterCorrect ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Đáp án đúng
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
