"use client";

import React, { Suspense, useMemo, useState } from "react";
import { CheckSquare, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { ReviewQueueFilters } from "@/features/questions/components/reviews/review-queue-filters";
import { ReviewQueueTable } from "@/features/questions/components/reviews/review-queue-table";
import { ReviewSplitWorkspace } from "@/features/questions/components/reviews/review-split-workspace";
import { useReviewQueue } from "@/hooks/use-question-reviews";
import { useSyncReviewQueueUrl } from "@/hooks/use-sync-review-queue-url";
import { useAuthStore } from "@/stores/auth.store";
import { Question } from "@/types/question";

function ContentReviewsContent() {
  const filter = useSyncReviewQueueUrl();
  const currentUser = useAuthStore((s) => s.user);

  const { data, isLoading, isFetching, refetch } = useReviewQueue({
    page: filter.page,
    limit: filter.limit,
    search: filter.search || undefined,
    partId: filter.partId !== "all" ? filter.partId : undefined,
    topicIds: filter.topicId !== "all" ? [filter.topicId] : undefined,
    creatorId: filter.creatorId || undefined,
  });

  // PMR 005 #1: Only store selectedQuestionId in state and derive selectedQuestion from live queue data
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    null
  );

  const queueItems = useMemo(() => data?.items || [], [data?.items]);
  const total = data?.total || 0;

  const selectedQuestion = useMemo(
    () =>
      selectedQuestionId
        ? queueItems.find((q) => q.id === selectedQuestionId) ?? null
        : null,
    [queueItems, selectedQuestionId]
  );

  const handleSelectQuestion = (question: Question) => {
    setSelectedQuestionId(question.id);
  };

  const handleReloadQuestion = async () => {
    const res = await refetch();
    const updatedItems = res.data?.items || [];
    if (
      selectedQuestionId &&
      !updatedItems.some((q) => q.id === selectedQuestionId)
    ) {
      toast.info(
        "Câu hỏi này đã được xử lý bởi người duyệt khác và không còn trong hàng đợi."
      );
      setSelectedQuestionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CheckSquare className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Hàng đợi kiểm duyệt câu hỏi TOEIC
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Thẩm định chất lượng câu hỏi chờ duyệt (pending_review) theo quy tắc
            Maker-Checker & kiểm soát phiên bản Optimistic Locking
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800 text-xs text-indigo-700 dark:text-indigo-300 self-start md:self-auto">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>
            Đang chờ duyệt: <strong className="font-bold">{total}</strong> câu
            hỏi
          </span>
        </div>
      </div>

      {/* Split-Screen Review Workspace (Mounted with dynamic key per questionId + version — PMR 005 #1) */}
      {selectedQuestion && (
        <ReviewSplitWorkspace
          key={`${selectedQuestion.id}-${selectedQuestion.version ?? 1}`}
          question={selectedQuestion}
          currentUserId={currentUser?.id}
          currentUserRole={
            (currentUser?.role as "student" | "teacher" | "admin") || "teacher"
          }
          onClose={() => setSelectedQuestionId(null)}
          onReviewCompleted={() => {
            setSelectedQuestionId(null);
            void refetch();
          }}
          onReloadQuestion={handleReloadQuestion}
        />
      )}

      {/* Queue Filters Bar (#1007, #1008) */}
      <ReviewQueueFilters
        filter={filter}
        isFetching={isFetching}
        onRefresh={() => void refetch()}
      />

      {/* Queue Data Table (#1006, Maker-Checker Batch Approve) */}
      <ReviewQueueTable
        questions={queueItems}
        total={total}
        page={filter.page}
        limit={filter.limit}
        isLoading={isLoading}
        currentUserId={currentUser?.id}
        currentUserRole={
          (currentUser?.role as "student" | "teacher" | "admin") || "teacher"
        }
        selectedQuestionId={selectedQuestionId}
        onSelectQuestion={handleSelectQuestion}
        onPageChange={filter.setPage}
        onLimitChange={filter.setLimit}
        onResetFilters={filter.resetFilters}
      />
    </div>
  );
}

export default function ContentReviewsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500">
          Đang tải hàng đợi kiểm duyệt câu hỏi...
        </div>
      }
    >
      <ContentReviewsContent />
    </Suspense>
  );
}
