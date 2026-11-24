"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileQuestion,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExamTypeBadge } from "@/features/exams/components/exam-badges";
import { ExamCatalogItem } from "@/types/exam";

export interface PublicExamCardGridProps {
  items: ExamCatalogItem[];
  total: number;
  page: number;
  limit: 10 | 20;
  isLoading?: boolean;
  hasActiveFilters?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: 10 | 20) => void;
  onSelectExam: (exam: ExamCatalogItem) => void;
  onResetFilters: () => void;
}

export function PublicExamCardGrid({
  items,
  total,
  page,
  limit,
  isLoading = false,
  hasActiveFilters = false,
  onPageChange,
  onLimitChange,
  onSelectExam,
  onResetFilters,
}: PublicExamCardGridProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const [pageJumpInput, setPageJumpInput] = useState(String(page));

  useEffect(() => {
    setPageJumpInput(String(page));
  }, [page]);

  const handlePageJumpCommit = (rawVal: string) => {
    const trimmed = rawVal.trim();
    const val = Number(trimmed);
    if (
      trimmed !== "" &&
      Number.isInteger(val) &&
      val >= 1 &&
      val <= totalPages
    ) {
      if (val !== page) {
        onPageChange(val);
      }
      setPageJumpInput(String(val));
    } else {
      setPageJumpInput(String(page));
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, idx) => (
          <Skeleton key={idx} className="h-56 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {hasActiveFilters
              ? "Không tìm thấy đề thi phù hợp"
              : "Hiện chưa có đề thi công khai nào"}
          </p>
          <p className="text-xs text-slate-500">
            Các đề thi đã được xuất bản (published) sẽ xuất hiện tại danh mục
            này để bạn luyện tập.
          </p>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              className="rounded-xl text-xs cursor-pointer"
            >
              Đặt lại bộ lọc
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((exam) => (
            <div
              key={exam.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <ExamTypeBadge type={exam.type} />
                  {exam.isScheduled ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      <CalendarClock className="w-3 h-3" />
                      Sắp diễn ra
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      Đang mở thi
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                    {exam.title}
                  </h3>
                  {exam.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {exam.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400 pt-1">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    {exam.durationMinutes} phút
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FileQuestion className="w-3.5 h-3.5 text-indigo-500" />
                    {exam.totalQuestions} câu hỏi
                  </span>
                  {exam.allowPartPractice && (
                    <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                      <Layers className="w-3.5 h-3.5" />
                      Luyện từng Part
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectExam(exam)}
                  className="flex-1 rounded-xl text-xs cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  Xem cấu trúc đề
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                >
                  <Link href={`/exams/${exam.id}`}>Chi tiết đề thi</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rule #1006: Pagination Footer with 10/20 page size & page jump input */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Hiển thị{" "}
            <strong className="text-slate-700 dark:text-slate-300">
              {items.length}
            </strong>{" "}
            /{" "}
            <strong className="text-slate-700 dark:text-slate-300">
              {total}
            </strong>{" "}
            đề thi công khai (Trang {page} / {totalPages})
          </span>

          <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-0.5">
            <button
              type="button"
              onClick={() => onLimitChange(10)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                limit === 10
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              10 dòng
            </button>
            <button
              type="button"
              onClick={() => onLimitChange(20)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                limit === 20
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              20 dòng
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 mr-1">
            <label
              htmlFor="public-exams-page-jump-input"
              className="whitespace-nowrap"
            >
              Đi tới trang:
            </label>
            <input
              id="public-exams-page-jump-input"
              aria-label="Nhập số trang cần xem"
              type="number"
              min={1}
              max={totalPages}
              value={pageJumpInput}
              onChange={(e) => {
                const raw = e.target.value;
                setPageJumpInput(raw);
                const val = Number(raw.trim());
                if (
                  raw.trim() !== "" &&
                  Number.isInteger(val) &&
                  val >= 1 &&
                  val <= totalPages &&
                  val !== page
                ) {
                  onPageChange(val);
                }
              }}
              onBlur={(e) => handlePageJumpCommit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handlePageJumpCommit((e.target as HTMLInputElement).value);
                }
              }}
              className="w-14 h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-center text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="h-8 px-2.5 rounded-lg text-xs cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Trước
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
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
