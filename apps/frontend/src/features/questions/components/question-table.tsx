"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  FileQuestion,
  MoreHorizontal,
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
import { QuestionStatusBadge } from "./question-status-badge";
import { QuestionDifficultyBadge } from "./question-difficulty-badge";
import { DeleteQuestionDialog } from "./delete-question-dialog";
import { EmptyQuestionState } from "./empty-question-state";
import { useDeleteQuestion, useQuestions } from "@/hooks/use-questions";
import { useQuestionFilterStore } from "@/stores/question-filter.store";
import { Question } from "@/types/question";

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
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);

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

  const questions = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  if (questions.length === 0) {
    return (
      <EmptyQuestionState
        hasFilters={hasActiveFilters}
        onResetFilters={() => store.resetFilters()}
      />
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/70 dark:bg-slate-800/50">
            <TableRow>
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

              return (
                <TableRow
                  key={question.id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  {/* Part */}
                  <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                    {question.part ? `Part ${question.part.partNumber}` : "—"}
                  </TableCell>

                  {/* Content */}
                  <TableCell>
                    <div className="max-w-[480px]">
                      <Link
                        href={`/questions/${question.id}`}
                        className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-2"
                      >
                        {question.content}
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
                    <QuestionDifficultyBadge difficulty={question.difficulty} />
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
                          <Link href={`/questions/${question.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            Xem chi tiết
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                          <Link href={`/questions/${question.id}/edit`}>
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

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="text-xs text-slate-500 dark:text-slate-400">
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

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => store.setPage(Math.max(1, store.page - 1))}
            disabled={store.page <= 1}
            className="h-8 px-2.5 rounded-lg"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Trước
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => store.setPage(Math.min(totalPages, store.page + 1))}
            disabled={store.page >= totalPages}
            className="h-8 px-2.5 rounded-lg"
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
  );
}
