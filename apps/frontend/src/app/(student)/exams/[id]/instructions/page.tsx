"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExamOverview } from "@/hooks/use-exams";
import {
  useAbandonExamAttempt,
  useStartExamAttempt,
} from "@/hooks/use-exam-attempts";
import { ExamInstructionsView } from "@/features/exam-attempts/components/instructions/exam-instructions-view";

export default function ExamInstructionsPage() {
  const params = useParams<{ id: string }>();
  const examId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : null;

  const { data: overview, isLoading, error } = useExamOverview(examId);
  const startMutation = useStartExamAttempt();
  const abandonMutation = useAbandonExamAttempt();

  if (!examId || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-sm">Đang tải thông tin phòng chờ đề thi...</p>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/40 max-w-lg mx-auto my-12 space-y-4">
        <p className="font-semibold text-rose-600 dark:text-rose-400">
          Đề thi không tồn tại, chưa được xuất bản hoặc đã đóng.
        </p>
        <Button
          asChild
          size="sm"
          className="rounded-xl bg-indigo-600 text-white"
        >
          <Link href="/exams">Quay lại thư viện đề thi</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ExamInstructionsView
        overview={overview}
        isStarting={startMutation.isPending}
        isAbandoning={abandonMutation.isPending}
        onStartAttempt={(dto) => startMutation.mutateAsync(dto)}
        onAbandonAttempt={(attemptId) =>
          abandonMutation.mutateAsync(attemptId)
        }
      />
    </div>
  );
}
