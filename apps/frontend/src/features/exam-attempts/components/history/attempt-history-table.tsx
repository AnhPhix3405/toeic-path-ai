"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Play,
  RefreshCw,
  Trophy,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CodeBadge } from "@/components/common/code-badge";
import { ScorePassBadge } from "@/features/exam-attempts/components/result/score-pass-badge";
import {
  ExamAttemptHistoryItem,
  ExamAttemptStatus,
  PartPracticeMode,
} from "@/types/exam-attempt";
import {
  attemptHistoryFilterSchema,
  formatDurationSpent,
} from "@/lib/validations/exam-attempt.schema";

export interface AttemptHistoryTableProps {
  items: ExamAttemptHistoryItem[];
  total: number;
  page: number;
  limit: 10 | 20;
  mode?: PartPracticeMode;
  status?: ExamAttemptStatus;
  fromDate?: string;
  toDate?: string;
  isLoading?: boolean;
  isFetching?: boolean;
  onRefresh: () => void;
  onModeChange: (mode?: PartPracticeMode) => void;
  onStatusChange: (status?: ExamAttemptStatus) => void;
  onDateRangeChange: (fromDate?: string, toDate?: string) => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: 10 | 20) => void;
  onResetFilters: () => void;
}

const STATUS_BADGE: Record<
  ExamAttemptStatus,
  { label: string; className: string }
> = {
  in_progress: {
    label: "Đang làm bài",
    className:
      "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800",
  },
  submitted: {
    label: "Đã nộp bài",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
  },
  timed_out: {
    label: "Hết giờ",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
  },
  abandoned: {
    label: "Đã hủy",
    className:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  },
};

export function AttemptHistoryTable({
  items,
  total,
  page,
  limit,
  mode,
  status,
  fromDate = "",
  toDate = "",
  isLoading = false,
  isFetching = false,
  onRefresh,
  onModeChange,
  onStatusChange,
  onDateRangeChange,
  onPageChange,
  onLimitChange,
  onResetFilters,
}: AttemptHistoryTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const [pageJumpInput, setPageJumpInput] = useState(String(page));
  const [prevPage, setPrevPage] = useState(page);
  const [localFromDate, setLocalFromDate] = useState(fromDate);
  const [prevFromDate, setPrevFromDate] = useState(fromDate);
  const [localToDate, setLocalToDate] = useState(toDate);
  const [prevToDate, setPrevToDate] = useState(toDate);
  const [dateError, setDateError] = useState<string | null>(null);

  if (page !== prevPage) {
    setPrevPage(page);
    setPageJumpInput(String(page));
  }
  if (fromDate !== prevFromDate) {
    setPrevFromDate(fromDate);
    setLocalFromDate(fromDate);
  }
  if (toDate !== prevToDate) {
    setPrevToDate(toDate);
    setLocalToDate(toDate);
  }

  const handleDateChange = (nextFrom: string, nextTo: string) => {
    setLocalFromDate(nextFrom);
    setLocalToDate(nextTo);
    const parsed = attemptHistoryFilterSchema.safeParse({
      fromDate: nextFrom || undefined,
      toDate: nextTo || undefined,
    });
    if (!parsed.success) {
      setDateError(
        parsed.error.issues[0]?.message || "Khoảng ngày lọc không hợp lệ."
      );
      return;
    }
    setDateError(null);
    onDateRangeChange(nextFrom || undefined, nextTo || undefined);
  };

  const handlePageJumpCommit = (rawVal: string) => {
    const trimmed = rawVal.trim();
    const val = Number(trimmed);
    if (
      trimmed !== "" &&
      Number.isInteger(val) &&
      val >= 1 &&
      val <= totalPages
    ) {
      if (val !== page) onPageChange(val);
      setPageJumpInput(String(val));
    } else {
      setPageJumpInput(String(page));
    }
  };

  const hasFilters = Boolean(mode || status || fromDate || toDate);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Filter & Refresh Toolbar (#1007, #1008, #1009) */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Lọc theo chế độ thi"
              value={mode || ""}
              onChange={(e) =>
                onModeChange(
                  (e.target.value || undefined) as PartPracticeMode | undefined
                )
              }
              className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
            >
              <option value="">Tất cả chế độ</option>
              <option value="full_exam">Full Exam</option>
              <option value="part_practice">Luyện từng Part</option>
            </select>

            <select
              aria-label="Lọc theo trạng thái lượt thi"
              value={status || ""}
              onChange={(e) =>
                onStatusChange(
                  (e.target.value || undefined) as ExamAttemptStatus | undefined
                )
              }
              className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="submitted">Đã nộp bài</option>
              <option value="timed_out">Hết giờ</option>
              <option value="in_progress">Đang làm bài</option>
              <option value="abandoned">Đã hủy</option>
            </select>

            <input
              type="date"
              aria-label="Từ ngày"
              value={localFromDate}
              onChange={(e) => handleDateChange(e.target.value, localToDate)}
              className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
            />
            <span className="text-xs text-slate-400">đến</span>
            <input
              type="date"
              aria-label="Đến ngày"
              value={localToDate}
              onChange={(e) => handleDateChange(localFromDate, e.target.value)}
              className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
            />

            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateError(null);
                  onResetFilters();
                }}
                className="h-9 rounded-xl text-xs cursor-pointer"
              >
                Xóa bộ lọc
              </Button>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={onRefresh}
            className="h-9 rounded-xl text-xs cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 mr-1.5 ${
                isFetching ? "animate-spin text-indigo-600" : ""
              }`}
            />
            Làm mới
          </Button>
        </div>

        {dateError && (
          <p
            role="alert"
            className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {dateError}
          </p>
        )}
      </div>

      {/* Table Content */}
      {isLoading ? (
        <div className="p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center space-y-2">
          <Trophy className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {hasFilters
              ? "Không tìm thấy lượt thi phù hợp với bộ lọc"
              : "Bạn chưa có lượt làm bài thi nào"}
          </p>
          <p className="text-xs text-slate-500">
            Hãy bắt đầu một đề thi thử trong Thư viện đề thi để theo dõi tiến
            trình điểm số.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/70 dark:bg-slate-800/50">
              <TableRow>
                <TableHead className="min-w-[240px] text-xs font-semibold">
                  Đề thi &amp; Mã lượt thi
                </TableHead>
                <TableHead className="w-[130px] text-xs font-semibold">
                  Chế độ
                </TableHead>
                <TableHead className="w-[120px] text-xs font-semibold">
                  Trạng thái
                </TableHead>
                <TableHead className="w-[160px] text-xs font-semibold">
                  Kết quả / Điểm
                </TableHead>
                <TableHead className="w-[130px] text-xs font-semibold">
                  Thời gian
                </TableHead>
                <TableHead className="w-[190px] text-right text-xs font-semibold">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const attemptUrlKey = item.attemptCode || item.attemptId;
                const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.submitted;
                const isGraded =
                  item.status === "submitted" || item.status === "timed_out";

                return (
                  <TableRow key={item.attemptId}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                          {item.examTitle}
                        </p>
                        {item.attemptCode && (
                          <div>
                            <CodeBadge
                              code={item.attemptCode}
                              label="Mã lượt"
                            />
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                      {item.mode === "part_practice"
                        ? `Part ${(item.selectedParts || []).join(", ")}`
                        : "Full Exam"}
                    </TableCell>

                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </TableCell>

                    <TableCell>
                      {isGraded ? (
                        <div className="space-y-1">
                          {item.totalScore !== null ? (
                            <p className="text-sm font-bold font-mono text-indigo-700 dark:text-indigo-300">
                              {item.totalScore}{" "}
                              <span className="text-xs font-normal text-slate-400">
                                / 990
                              </span>
                            </p>
                          ) : (
                            <p className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                              {item.accuracyPercentage !== null
                                ? `${Number(item.accuracyPercentage).toFixed(1)}%`
                                : "—"}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-500 font-mono">
                              {item.correctCount ?? 0}/{item.totalQuestions} câu
                            </span>
                            {item.isPassed !== null && (
                              <ScorePassBadge isPassed={item.isPassed} />
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <p>
                          {new Date(item.startedAt).toLocaleDateString("vi-VN")}
                        </p>
                        {item.durationSpentSeconds !== null && (
                          <p className="text-[11px] inline-flex items-center gap-1 text-slate-400">
                            <Clock className="w-3 h-3" />
                            {formatDurationSpent(item.durationSpentSeconds)}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {item.status === "in_progress" ? (
                          <Button
                            asChild
                            size="sm"
                            className="h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                          >
                            <Link href={`/exam-attempts/${attemptUrlKey}`}>
                              <Play className="w-3.5 h-3.5 mr-1" />
                              Tiếp tục
                            </Link>
                          </Button>
                        ) : isGraded ? (
                          <>
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-xl text-xs"
                            >
                              <Link
                                href={`/exam-attempts/${attemptUrlKey}/result`}
                              >
                                <Trophy className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                                Kết quả
                              </Link>
                            </Button>
                            <Button
                              asChild
                              size="sm"
                              className="h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                            >
                              <Link
                                href={`/exam-attempts/${attemptUrlKey}/review`}
                              >
                                <BookOpenCheck className="w-3.5 h-3.5 mr-1" />
                                Lời giải
                              </Link>
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Rule #1006: Pagination 10/20 + Page Jump */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span>
            Hiển thị <strong>{items.length}</strong> / <strong>{total}</strong>{" "}
            lượt thi (Trang {page} / {totalPages})
          </span>
          <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5">
            {([10, 20] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onLimitChange(size)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                  limit === size
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                {size} dòng
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <label htmlFor="history-page-jump">Đi tới trang:</label>
            <input
              id="history-page-jump"
              aria-label="Nhập số trang lịch sử thi"
              type="number"
              min={1}
              max={totalPages}
              value={pageJumpInput}
              onChange={(e) => setPageJumpInput(e.target.value)}
              onBlur={(e) => handlePageJumpCommit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handlePageJumpCommit((e.target as HTMLInputElement).value);
                }
              }}
              className="w-14 h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-center text-xs font-semibold"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            className="h-8 px-2.5 rounded-lg text-xs cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Trước
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            className="h-8 px-2.5 rounded-lg text-xs cursor-pointer"
          >
            Sau
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
