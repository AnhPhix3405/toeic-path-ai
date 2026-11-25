"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  Layers,
  MoreHorizontal,
  Sliders,
  Trash2,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ExamStatusBadge,
  ExamTypeBadge,
} from "@/features/exams/components/exam-badges";
import { CodeBadge } from "@/components/common/code-badge";
import { ExamDetail } from "@/types/exam";

export interface ManageExamsTableProps {
  exams: ExamDetail[];
  total: number;
  page: number;
  limit: 10 | 20;
  isLoading?: boolean;
  hasActiveFilters?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: 10 | 20) => void;
  onDeleteRequest: (exam: ExamDetail) => void;
  onResetFilters: () => void;
}

export function ManageExamsTable({
  exams,
  total,
  page,
  limit,
  isLoading = false,
  hasActiveFilters = false,
  onPageChange,
  onLimitChange,
  onDeleteRequest,
  onResetFilters,
}: ManageExamsTableProps) {
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
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        {[...Array(5)].map((_, idx) => (
          <div key={idx} className="flex items-center gap-4">
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-20 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {exams.length === 0 ? (
        <div className="p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {hasActiveFilters
                ? "Không tìm thấy đề thi phù hợp với bộ lọc"
                : "Chưa có đề thi nào trong hệ thống"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {hasActiveFilters
                ? "Thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc để xem toàn bộ danh sách đề thi."
                : "Hãy khởi tạo đề thi Full Test, Mini Test hoặc Placement Test đầu tiên để thiết lập cấu trúc câu hỏi."}
            </p>
          </div>
          {hasActiveFilters ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              className="rounded-xl text-xs cursor-pointer"
            >
              Đặt lại bộ lọc
            </Button>
          ) : (
            <Button
              asChild
              size="sm"
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
            >
              <Link href="/exams/create">Tạo đề thi mới</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/70 dark:bg-slate-800/50">
              <TableRow>
                <TableHead className="min-w-[260px] font-semibold text-xs">
                  Tiêu đề & Mô tả đề thi
                </TableHead>
                <TableHead className="w-[150px] font-semibold text-xs">
                  Loại đề
                </TableHead>
                <TableHead className="w-[140px] font-semibold text-xs">
                  Trạng thái
                </TableHead>
                <TableHead className="w-[130px] font-semibold text-xs">
                  Thời lượng / Phần
                </TableHead>
                <TableHead className="w-[90px] font-semibold text-xs">
                  Version
                </TableHead>
                <TableHead className="w-[120px] font-semibold text-xs">
                  Ngày tạo
                </TableHead>
                <TableHead className="w-[180px] text-right font-semibold text-xs">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.map((exam) => (
                <TableRow
                  key={exam.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <TableCell>
                    <div className="max-w-[380px] space-y-1">
                      <Link
                        href={`/exams/${exam.slug || exam.id}/builder`}
                        className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-1"
                      >
                        {exam.title}
                      </Link>
                      {exam.slug && (
                        <div>
                          <CodeBadge
                            code={exam.slug}
                            label="Slug đề thi"
                          />
                        </div>
                      )}
                      {exam.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                          {exam.description}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <ExamTypeBadge type={exam.type} />
                  </TableCell>

                  <TableCell>
                    <ExamStatusBadge
                      status={exam.status}
                      openAt={exam.openAt}
                    />
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {exam.durationMinutes} phút
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Layers className="w-3 h-3 text-indigo-500" />
                        {exam.sectionsCount} phần thi
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                      v{exam.version}
                    </span>
                  </TableCell>

                  <TableCell className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {new Date(exam.createdAt).toLocaleDateString("vi-VN")}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-xl text-xs"
                      >
                        <Link href={`/exams/${exam.slug || exam.id}/builder`}>
                          <Sliders className="w-3.5 h-3.5 mr-1.5" />
                          Cấu trúc đề
                        </Link>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Tùy chọn thao tác cho ${exam.title}`}
                            className="h-8 w-8 rounded-lg cursor-pointer"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link href={`/exams/${exam.slug || exam.id}/builder`}>
                              <Sliders className="w-4 h-4 mr-2" />
                              Cấu trúc & Xuất bản
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/exams/${exam.slug || exam.id}/edit`}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Chỉnh sửa cấu hình
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDeleteRequest(exam)}
                            className="text-rose-600 focus:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Xóa đề thi
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Rule #1006: Pagination Component with 10/20 page size & page jump input */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Hiển thị{" "}
            <strong className="text-slate-700 dark:text-slate-300">
              {exams.length}
            </strong>{" "}
            /{" "}
            <strong className="text-slate-700 dark:text-slate-300">
              {total}
            </strong>{" "}
            đề thi (Trang {page} / {totalPages})
          </span>

          <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5">
            <button
              type="button"
              onClick={() => onLimitChange(10)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors duration-200 ${
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
              className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors duration-200 ${
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
              htmlFor="manage-exams-page-jump-input"
              className="whitespace-nowrap"
            >
              Đi tới trang:
            </label>
            <input
              id="manage-exams-page-jump-input"
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
