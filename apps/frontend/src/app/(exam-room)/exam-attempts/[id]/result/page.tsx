"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAttemptResult } from "@/hooks/use-exam-attempts";
import { extractApiErrorMeta } from "@/lib/validations/exam-attempt.schema";
import { ScoreReportView } from "@/features/exam-attempts/components/result/score-report-view";

export default function ExamAttemptResultPage() {
  const params = useParams<{ id: string }>();
  const attemptIdentifier =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : null;

  const { data: result, isLoading, error } = useAttemptResult(attemptIdentifier);

  if (!attemptIdentifier || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-950 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium">
          Đang tổng hợp báo cáo điểm số và phân tích năng lực...
        </p>
      </div>
    );
  }

  if (error || !result) {
    const errMeta = extractApiErrorMeta(error);
    const isForbidden = errMeta.status === 403;
    const isNotSubmitted = errMeta.errorCode === "ERR_ATTEMPT_NOT_SUBMITTED";

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
              {isNotSubmitted
                ? "Bài thi chưa được nộp"
                : isForbidden
                ? "Không có quyền xem kết quả"
                : "Không tìm thấy báo cáo điểm số"}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {errMeta.message}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            {isNotSubmitted && (
              <Button
                asChild
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              >
                <Link href={`/exam-attempts/${attemptIdentifier}`}>
                  Quay lại phòng thi
                </Link>
              </Button>
            )}
            <Button
              asChild
              variant={isNotSubmitted ? "outline" : "default"}
              className="rounded-xl text-xs"
            >
              <Link href="/results">Về Lịch sử thi</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <ScoreReportView result={result} attemptSlugOrId={attemptIdentifier} />
    </div>
  );
}
