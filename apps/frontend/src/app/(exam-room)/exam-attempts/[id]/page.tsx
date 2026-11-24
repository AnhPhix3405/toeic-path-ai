"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useAttemptOverview,
  useAttemptQuestions,
} from "@/hooks/use-exam-attempts";
import { extractApiErrorMeta } from "@/lib/validations/exam-attempt.schema";
import { ExamRoomWorkspace } from "@/features/exam-attempts/components/room/exam-room-workspace";

export default function ExamAttemptRoomPage() {
  const params = useParams<{ id: string }>();
  const attemptId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : null;

  const overviewQuery = useAttemptOverview(attemptId);
  const overview = overviewQuery.data;

  // PMR 025 #6: Only fetch GET /questions when overview.status === "in_progress"
  const shouldFetchQuestions = overview?.status === "in_progress";
  const questionsQuery = useAttemptQuestions(attemptId, {
    enabled: shouldFetchQuestions,
  });

  if (!attemptId || overviewQuery.isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-slate-500 bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium">
          Đang tải thông tin phiên làm bài...
        </p>
      </div>
    );
  }

  // PMR 025 #6: Clean 403 / 404 error states
  if (overviewQuery.error || !overview) {
    const errMeta = extractApiErrorMeta(overviewQuery.error);
    const isForbidden = errMeta.status === 403;

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md w-full rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-6 text-center space-y-4 shadow-xs">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            {isForbidden ? (
              <ShieldAlert className="w-6 h-6" />
            ) : (
              <AlertCircle className="w-6 h-6" />
            )}
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {isForbidden
                ? "Không có quyền truy cập bài thi"
                : "Không tìm thấy lượt làm bài"}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {errMeta.message}
            </p>
          </div>
          <Button
            asChild
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
          >
            <Link href="/exams">Quay lại Thư viện đề thi</Link>
          </Button>
        </div>
      </div>
    );
  }

  // PMR 025 #6: Non-in_progress status card without calling GET /questions
  if (overview.status !== "in_progress") {
    const statusLabelMap = {
      submitted: "Bài thi đã được nộp thành công",
      abandoned: "Phiên làm bài này đã bị hủy",
      timed_out: "Phiên làm bài đã kết thúc do hết giờ",
    } as const;

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center space-y-4 shadow-xs">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {statusLabelMap[overview.status]}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {overview.examTitle} • Đã trả lời {overview.answeredCount}/
              {overview.totalQuestions} câu hỏi.
            </p>
          </div>
          <Button
            asChild
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
          >
            <Link href="/exams">Quay lại Thư viện đề thi</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (questionsQuery.isLoading || !questionsQuery.data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-slate-500 bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium">
          Đang tải toàn bộ cấu trúc đề thi và tài nguyên nghe/đọc...
        </p>
      </div>
    );
  }

  return (
    <ExamRoomWorkspace
      overview={overview}
      delivery={questionsQuery.data}
      onRefreshOverview={() => void overviewQuery.refetch()}
    />
  );
}
