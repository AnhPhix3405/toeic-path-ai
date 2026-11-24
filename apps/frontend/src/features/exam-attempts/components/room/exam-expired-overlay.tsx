"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, ClockAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ExamExpiredOverlayProps {
  isOpen: boolean;
  isSyncing: boolean;
  pendingCount: number;
  answeredCount: number;
  totalQuestions: number;
  onRetrySync?: () => void;
  onSubmitExamAttempt?: () => void;
}

export function ExamExpiredOverlay({
  isOpen,
  isSyncing,
  pendingCount,
  answeredCount,
  totalQuestions,
  onRetrySync,
  onSubmitExamAttempt,
}: ExamExpiredOverlayProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exam-expired-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <ClockAlert className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h2
            id="exam-expired-title"
            className="text-lg font-bold text-slate-900 dark:text-slate-100"
          >
            Đã hết thời gian làm bài
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Phòng thi đã tự động khóa thao tác chọn đáp án. Bạn đã hoàn thành{" "}
            <strong className="text-slate-900 dark:text-slate-100">
              {answeredCount}/{totalQuestions} câu hỏi
            </strong>
            .
          </p>
        </div>

        <div className="rounded-xl p-3 text-xs border bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2">
          {isSyncing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Đang đồng bộ những đáp án cuối cùng lên hệ thống...</span>
            </>
          ) : pendingCount > 0 ? (
            <div className="space-y-2">
              <p className="text-amber-700 dark:text-amber-300 font-medium">
                Còn {pendingCount} câu chưa đồng bộ do gián đoạn mạng.
              </p>
              {onRetrySync && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onRetrySync}
                  className="rounded-xl text-xs cursor-pointer"
                >
                  Thử đồng bộ lại
                </Button>
              )}
            </div>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                Toàn bộ đáp án đã được lưu an toàn trên hệ thống.
              </span>
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 pt-1">
          {onSubmitExamAttempt && (
            <Button
              type="button"
              onClick={onSubmitExamAttempt}
              disabled={isSyncing}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs cursor-pointer"
            >
              Nộp bài &amp; Xem kết quả
            </Button>
          )}
          <Button
            asChild
            variant={onSubmitExamAttempt ? "outline" : "default"}
            className="rounded-xl text-xs cursor-pointer"
          >
            <Link href="/exams">Quay về Thư viện đề thi</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
