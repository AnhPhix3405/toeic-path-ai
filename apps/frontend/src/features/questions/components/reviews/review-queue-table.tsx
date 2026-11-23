"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers,
  Loader2,
  ShieldAlert,
  User as UserIcon,
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
import { QuestionDifficultyBadge } from "@/features/questions/components/question-difficulty-badge";
import { useBatchApproveQuestions } from "@/hooks/use-question-reviews";
import { Question } from "@/types/question";
import { SkippedBatchReviewItem } from "@/types/question-review";

export interface ReviewQueueTableProps {
  questions: Question[];
  total: number;
  page: number;
  limit: 10 | 20;
  isLoading?: boolean;
  currentUserId?: string;
  currentUserRole?: "student" | "teacher" | "admin";
  selectedQuestionId?: string | null;
  onSelectQuestion: (question: Question) => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: 10 | 20) => void;
  onResetFilters: () => void;
}

export function ReviewQueueTable({
  questions,
  total,
  page,
  limit,
  isLoading = false,
  currentUserId,
  selectedQuestionId = null,
  onSelectQuestion,
  onPageChange,
  onLimitChange,
}: ReviewQueueTableProps) {
  const batchApproveMutation = useBatchApproveQuestions();
  const [rawSelectedIds, setSelectedIds] = useState<string[]>([]);
  const [skippedItems, setSkippedItems] = useState<SkippedBatchReviewItem[]>(
    []
  );

  // PMR 005 #2: Calculate totalPages safely
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Maker-Checker Rule: Only questions NOT created by currentUserId are eligible for batch approve
  const eligibleQuestions = useMemo(
    () =>
      questions.filter(
        (q) => !currentUserId || q.createdBy !== currentUserId
      ),
    [questions, currentUserId]
  );

  const eligibleIds = useMemo(
    () => eligibleQuestions.map((q) => q.id),
    [eligibleQuestions]
  );

  // PMR 005 #2: Automatically scope selectedIds to eligible questions on current page
  const selectedIds = useMemo(
    () => rawSelectedIds.filter((id) => eligibleIds.includes(id)),
    [rawSelectedIds, eligibleIds]
  );

  const allEligibleSelected =
    eligibleIds.length > 0 &&
    eligibleIds.every((id) => selectedIds.includes(id));

  const handleToggleAll = () => {
    if (eligibleIds.length === 0) return;
    if (allEligibleSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(eligibleIds);
    }
  };

  const handleToggleRow = (question: Question) => {
    const isSelfCreated = Boolean(
      currentUserId && question.createdBy === currentUserId
    );
    if (isSelfCreated) return;

    setSelectedIds((prev) =>
      prev.includes(question.id)
        ? prev.filter((id) => id !== question.id)
        : [...prev, question.id]
    );
  };

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;
    setSkippedItems([]);

    const items = questions
      .filter((q) => selectedIds.includes(q.id))
      .map((q) => ({
        questionId: q.id,
        version: q.version ?? 1,
      }));

    const res = await batchApproveMutation.mutateAsync({ items });
    setSelectedIds([]);
    if (res?.skipped && res.skipped.length > 0) {
      setSkippedItems(res.skipped);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        {[...Array(5)].map((_, idx) => (
          <div key={idx} className="flex items-center gap-4">
            <Skeleton className="h-8 w-10 rounded-lg" />
            <Skeleton className="h-8 flex-1 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Skipped Items Warning Banner (PMR 005 #2) */}
      {skippedItems.length > 0 && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 flex items-start justify-between gap-3 text-amber-800 dark:text-amber-300"
        >
          <div className="flex items-start gap-2.5 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">
                Có {skippedItems.length} câu hỏi bị bỏ qua khi phê duyệt hàng
                loạt:
              </p>
              <ul className="list-disc list-inside space-y-0.5">
                {skippedItems.map((item) => (
                  <li key={item.questionId}>
                    <span className="font-mono">
                      {item.questionId.slice(0, 8)}
                    </span>
                    : {item.reason}
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

      {/* Batch Approve Action Bar (UC15-A5) */}
      {selectedIds.length > 0 && (
        <div className="px-5 py-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-medium text-emerald-900 dark:text-emerald-200">
            Đã chọn{" "}
            <strong className="font-bold">{selectedIds.length}</strong> câu hỏi
            hợp lệ để phê duyệt nhanh (Các câu hỏi tự tạo đã được loại trừ theo
            quy tắc Maker-Checker).
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
              disabled={batchApproveMutation.isPending}
              onClick={handleBatchApprove}
              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl cursor-pointer"
            >
              {batchApproveMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              )}
              Phê duyệt hàng loạt ({selectedIds.length})
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {questions.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckSquare className="w-9 h-9 text-emerald-500 mx-auto" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Hàng đợi kiểm duyệt hiện đang trống
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Không có câu hỏi nào ở trạng thái chờ thẩm định (pending_review)
              khớp với bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/70 dark:bg-slate-800/50">
                <TableRow>
                  <TableHead className="w-[44px] text-center">
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả câu hỏi hợp lệ để duyệt hàng loạt"
                      checked={allEligibleSelected}
                      disabled={eligibleIds.length === 0}
                      onChange={handleToggleAll}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </TableHead>
                  <TableHead className="w-[100px] text-xs font-semibold">
                    Part / Nhóm
                  </TableHead>
                  <TableHead className="min-w-[260px] text-xs font-semibold">
                    Nội dung câu hỏi chờ duyệt
                  </TableHead>
                  <TableHead className="w-[100px] text-xs font-semibold">
                    Độ khó
                  </TableHead>
                  <TableHead className="w-[180px] text-xs font-semibold">
                    Người biên soạn
                  </TableHead>
                  <TableHead className="w-[80px] text-xs font-semibold">
                    Version
                  </TableHead>
                  <TableHead className="w-[110px] text-xs font-semibold">
                    Ngày gửi
                  </TableHead>
                  <TableHead className="w-[120px] text-right text-xs font-semibold">
                    Thao tác
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((question) => {
                  const isSelfCreated = Boolean(
                    currentUserId && question.createdBy === currentUserId
                  );
                  const isSelectedForBatch = selectedIds.includes(question.id);
                  const isWorkspaceActive = selectedQuestionId === question.id;

                  return (
                    <TableRow
                      key={question.id}
                      className={`transition-colors ${
                        isWorkspaceActive
                          ? "bg-indigo-50/70 dark:bg-indigo-950/30"
                          : "hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                      }`}
                    >
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          data-testid={`select-review-${question.id}`}
                          aria-label={`Chọn duyệt câu hỏi ${question.id}`}
                          checked={isSelectedForBatch}
                          disabled={isSelfCreated}
                          onChange={() => handleToggleRow(question)}
                          title={
                            isSelfCreated
                              ? "Maker-Checker: Không thể chọn duyệt hàng loạt câu hỏi do chính bạn tạo (Dùng thẩm định chi tiết nếu cần Admin Bypass khẩn cấp)"
                              : "Chọn để phê duyệt hàng loạt"
                          }
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {question.part
                              ? `Part ${question.part.partNumber}`
                              : "—"}
                          </span>
                          {question.questionGroup && (
                            <span className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                              <Layers className="w-3 h-3" />
                              Nhóm
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="max-w-[440px]">
                          <button
                            type="button"
                            onClick={() => onSelectQuestion(question)}
                            className="text-left text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-2 cursor-pointer"
                          >
                            {question.content || (
                              <span className="italic text-slate-400">
                                (Câu hỏi Audio / Đoạn văn nhóm không có văn bản
                                riêng)
                              </span>
                            )}
                          </button>
                          {question.questionGroup?.title && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              Đoạn văn: {question.questionGroup.title}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <QuestionDifficultyBadge
                          difficulty={question.difficulty}
                        />
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                            <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[140px]">
                              {question.creator?.fullName ||
                                question.creator?.email ||
                                (question.createdBy
                                  ? question.createdBy.slice(0, 8)
                                  : "Giáo viên")}
                            </span>
                          </div>
                          {isSelfCreated && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <ShieldAlert className="w-3 h-3" />
                              Bài của bạn
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                          v{question.version ?? 1}
                        </span>
                      </TableCell>

                      <TableCell className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(question.createdAt).toLocaleDateString(
                          "vi-VN"
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant={isWorkspaceActive ? "default" : "outline"}
                          size="sm"
                          onClick={() => onSelectQuestion(question)}
                          className={`h-8 rounded-xl text-xs cursor-pointer ${
                            isWorkspaceActive
                              ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                              : ""
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          Thẩm định
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Rule #1006: Pagination Component with 10 or 20 page size options */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Hiển thị{" "}
              <strong className="text-slate-700 dark:text-slate-300">
                {questions.length}
              </strong>{" "}
              /{" "}
              <strong className="text-slate-700 dark:text-slate-300">
                {total}
              </strong>{" "}
              câu hỏi chờ duyệt (Trang {page} / {totalPages})
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

          <div className="flex items-center gap-2">
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
    </div>
  );
}
