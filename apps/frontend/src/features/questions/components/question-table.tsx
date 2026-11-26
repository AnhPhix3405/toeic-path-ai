"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  FileQuestion,
  Loader2,
  MoreHorizontal,
  Send,
  Trash2,
  X,
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
import { QuestionStatusBadge } from "./question-status-badge";
import { QuestionDifficultyBadge } from "./question-difficulty-badge";
import { DeleteQuestionDialog } from "./delete-question-dialog";
import { EmptyQuestionState } from "./empty-question-state";
import { CodeBadge } from "@/components/common/code-badge";
import { useDeleteQuestion, useQuestions } from "@/hooks/use-questions";
import { useSubmitQuestionsForReview } from "@/hooks/use-questions-import";
import { useQuestionFilterStore } from "@/stores/question-filter.store";
import { Question } from "@/types/question";
import { SkippedReviewItem } from "@/types/question-import";

function isQuestionSelectableForReview(question: Question): boolean {
  return (
    question.status === "draft" || question.status === "revision_requested"
  );
}

export function QuestionTable() {
  const store = useQuestionFilterStore();

  const { data, isLoading } = useQuestions({
    search: store.search || undefined,
    partId: store.partId || undefined,
    difficulty: store.difficulty || undefined,
    status: store.status || undefined,
    page: store.page,
    limit: store.limit,
  });

  const deleteMutation = useDeleteQuestion();
  const submitReviewMutation = useSubmitQuestionsForReview();

  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(
    null
  );
  const [rawSelectedIds, setSelectedIds] = useState<string[]>([]);
  const [skippedItems, setSkippedItems] = useState<SkippedReviewItem[]>([]);

  const questions = useMemo(() => data?.data || [], [data?.data]);
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const [pageJumpInput, setPageJumpInput] = useState(String(store.page));
  const [prevPage, setPrevPage] = useState(store.page);
  if (store.page !== prevPage) {
    setPrevPage(store.page);
    setPageJumpInput(String(store.page));
  }

  const handlePageJumpCommit = (rawVal: string) => {
    const trimmed = rawVal.trim();
    const val = Number(trimmed);
    if (
      trimmed !== "" &&
      Number.isInteger(val) &&
      val >= 1 &&
      val <= totalPages
    ) {
      if (val !== store.page) {
        store.setPage(val);
      }
      setPageJumpInput(String(val));
    } else {
      setPageJumpInput(String(store.page));
    }
  };

  const eligibleQuestionIds = useMemo(
    () =>
      questions
        .filter((q) => isQuestionSelectableForReview(q))
        .map((q) => q.id),
    [questions]
  );

  // PMR 004 #5: Automatically scope selectedIds to eligible questions on current page/filter
  const selectedIds = useMemo(
    () => rawSelectedIds.filter((id) => eligibleQuestionIds.includes(id)),
    [rawSelectedIds, eligibleQuestionIds]
  );

  const allEligibleSelected =
    eligibleQuestionIds.length > 0 &&
    eligibleQuestionIds.every((id) => selectedIds.includes(id));

  const handleToggleSelectAll = () => {
    if (eligibleQuestionIds.length === 0) return;
    if (allEligibleSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(eligibleQuestionIds);
    }
  };

  const handleToggleRow = (question: Question) => {
    if (!isQuestionSelectableForReview(question)) return;
    setSelectedIds((prev) =>
      prev.includes(question.id)
        ? prev.filter((id) => id !== question.id)
        : [...prev, question.id]
    );
  };

  const handleBulkSubmitForReview = async () => {
    if (selectedIds.length === 0) return;
    setSkippedItems([]);
    const res = await submitReviewMutation.mutateAsync({
      questionIds: selectedIds,
    });
    setSelectedIds([]);
    if (res?.skipped && res.skipped.length > 0) {
      setSkippedItems(res.skipped);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!questionToDelete) return;
    await deleteMutation.mutateAsync(questionToDelete.id);
    setQuestionToDelete(null);
  };

  const hasActiveFilters = Boolean(
    store.search || store.partId || store.difficulty || store.status
  );

  if (isLoading) {
    return (
      <div className="space-y-3 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-32" />
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-4 items-center py-2">
            <Skeleton className="h-8 w-12 rounded-lg" />
            <Skeleton className="h-8 flex-1 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <EmptyQuestionState
        hasFilters={hasActiveFilters}
        onResetFilters={() => store.resetFilters()}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Skipped Items Warning Banner (PMR 004 #5 & UC14-A5 Group Atomicity) */}
      {skippedItems.length > 0 && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 flex items-start justify-between gap-3 text-amber-800 dark:text-amber-300"
        >
          <div className="flex items-start gap-2.5 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">
                Có {skippedItems.length} câu hỏi bị bỏ qua khi gửi duyệt:
              </p>
              <ul className="list-disc list-inside space-y-0.5">
                {skippedItems.map((item) => (
                  <li key={item.id}>
                    <span className="font-mono">{item.id.slice(0, 8)}</span>:{" "}
                    {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSkippedItems([])}
            aria-label="Đóng cảnh báo"
            className="text-amber-600 hover:text-amber-800 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bulk Submit for Review Action Bar (UC14-A5) */}
      {selectedIds.length > 0 && (
        <div className="px-5 py-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-medium text-indigo-900 dark:text-indigo-200">
            Đã chọn{" "}
            <strong className="font-bold">{selectedIds.length}</strong> câu hỏi
            (Hệ thống sẽ tự động gom trọn bộ nhóm câu hỏi nếu thuộc
            QuestionGroup).
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="h-8 text-xs text-slate-600 dark:text-slate-300 rounded-xl cursor-pointer"
            >
              Bỏ chọn
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={submitReviewMutation.isPending}
              onClick={handleBulkSubmitForReview}
              className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-xl cursor-pointer"
            >
              {submitReviewMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 mr-1.5" />
              )}
              Gửi duyệt ({selectedIds.length})
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/70 dark:bg-slate-800/50">
              <TableRow>
                <TableHead className="w-[44px] text-center">
                  <input
                    type="checkbox"
                    aria-label="Chọn tất cả câu hỏi hợp lệ trên trang"
                    checked={allEligibleSelected}
                    disabled={eligibleQuestionIds.length === 0}
                    onChange={handleToggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </TableHead>
                <TableHead className="w-[80px] font-semibold text-slate-700 dark:text-slate-300">
                  Part
                </TableHead>
                <TableHead className="min-w-[280px] font-semibold text-slate-700 dark:text-slate-300">
                  Nội dung câu hỏi
                </TableHead>
                <TableHead className="w-[120px] font-semibold text-slate-700 dark:text-slate-300">
                  Độ khó
                </TableHead>
                <TableHead className="w-[140px] font-semibold text-slate-700 dark:text-slate-300">
                  Trạng thái
                </TableHead>
                <TableHead className="w-[110px] font-semibold text-slate-700 dark:text-slate-300">
                  Đáp án
                </TableHead>
                <TableHead className="w-[120px] font-semibold text-slate-700 dark:text-slate-300">
                  Ngày tạo
                </TableHead>
                <TableHead className="w-[80px] text-right font-semibold text-slate-700 dark:text-slate-300">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.map((question) => {
                const isLockedFromDelete =
                  question.status === "published" ||
                  question.status === "pending_review";
                const isSelectable = isQuestionSelectableForReview(question);
                const isSelected = selectedIds.includes(question.id);

                return (
                  <TableRow
                    key={question.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Bulk Selection Checkbox */}
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        data-testid={`select-question-${question.id}`}
                        aria-label={`Chọn câu hỏi ${question.id}`}
                        checked={isSelected}
                        disabled={!isSelectable}
                        onChange={() => handleToggleRow(question)}
                        title={
                          isSelectable
                            ? "Chọn để gửi duyệt"
                            : "Chỉ có thể gửi duyệt câu hỏi ở trạng thái Bản nháp hoặc Yêu cầu sửa"
                        }
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                    </TableCell>

                    {/* Part */}
                    <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                      {question.part
                        ? `Part ${question.part.partNumber}`
                        : "—"}
                    </TableCell>

                    {/* Content */}
                    <TableCell>
                      <div className="max-w-[480px] space-y-1">
                        {question.questionCode && (
                          <div>
                            <CodeBadge
                              code={question.questionCode}
                              label="Mã câu hỏi"
                            />
                          </div>
                        )}
                        <Link
                          href={`/questions/${question.questionCode || question.id}`}
                          className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-2"
                        >
                          {question.content || (
                            <span className="italic text-slate-400">
                              (Câu hỏi Audio / Đoạn văn không có văn bản riêng)
                            </span>
                          )}
                        </Link>
                        {question.explanation && (
                          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                            Lời giải: {question.explanation}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Difficulty */}
                    <TableCell>
                      <QuestionDifficultyBadge
                        difficulty={question.difficulty}
                      />
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <QuestionStatusBadge status={question.status} />
                    </TableCell>

                    {/* Options Count */}
                    <TableCell>
                      <span className="inline-flex items-center text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                        <FileQuestion className="w-3 h-3 mr-1" />
                        {question.options?.length || 0} lựa chọn
                      </span>
                    </TableCell>

                    {/* Created At */}
                    <TableCell className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(question.createdAt).toLocaleDateString("vi-VN")}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            aria-label="Tùy chọn thao tác"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/questions/${question.questionCode || question.id}`}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Xem chi tiết
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuItem asChild>
                            <Link
                              href={`/questions/${question.questionCode || question.id}/edit`}
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Chỉnh sửa
                            </Link>
                          </DropdownMenuItem>

                          {/* Delete Action with Status Guard (PM Point 2) */}
                          <DropdownMenuItem
                            disabled={isLockedFromDelete}
                            onClick={() => {
                              if (!isLockedFromDelete) {
                                setQuestionToDelete(question);
                              }
                            }}
                            className={
                              isLockedFromDelete
                                ? "opacity-50 cursor-not-allowed text-slate-400"
                                : "text-rose-600 focus:text-rose-600 cursor-pointer"
                            }
                            title={
                              isLockedFromDelete
                                ? "Không thể xóa câu hỏi đã xuất bản hoặc đang chờ duyệt"
                                : undefined
                            }
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            <span>Xóa câu hỏi</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer with 10 or 20 Page Size (#1006) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div>
              Hiển thị{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {questions.length}
              </span>{" "}
              trên tổng số{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {total}
              </span>{" "}
              câu hỏi (Trang {store.page} / {totalPages})
            </div>

            {/* Page Size Selector 10 or 20 (#1006) */}
            <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5">
              <button
                type="button"
                onClick={() => store.setLimit(10)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors duration-200 ${
                  store.limit === 10
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                10 dòng
              </button>
              <button
                type="button"
                onClick={() => store.setLimit(20)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors duration-200 ${
                  store.limit === 20
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                20 dòng
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Rule #1006: Page number jump input */}
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 mr-1">
              <label htmlFor="questions-page-jump-input" className="whitespace-nowrap">
                Đi tới trang:
              </label>
              <input
                id="questions-page-jump-input"
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
                    val !== store.page
                  ) {
                    store.setPage(val);
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
              onClick={() => store.setPage(Math.max(1, store.page - 1))}
              disabled={store.page <= 1}
              className="h-8 px-2.5 rounded-lg cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Trước
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                store.setPage(Math.min(totalPages, store.page + 1))
              }
              disabled={store.page >= totalPages}
              className="h-8 px-2.5 rounded-lg cursor-pointer"
            >
              Sau
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <DeleteQuestionDialog
          question={questionToDelete}
          isOpen={Boolean(questionToDelete)}
          isDeleting={deleteMutation.isPending}
          onClose={() => setQuestionToDelete(null)}
          onConfirm={handleDeleteConfirm}
        />
      </div>
    </div>
  );
}
