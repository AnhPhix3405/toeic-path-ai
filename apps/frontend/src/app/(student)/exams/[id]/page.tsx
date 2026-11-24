"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  FileQuestion,
  Layers,
  Loader2,
  Play,
  ShieldCheck,
} from "lucide-react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Button } from "@/components/ui/button";
import { ExamTypeBadge } from "@/features/exams/components/exam-badges";
import { useExamOverview } from "@/hooks/use-exams";

export default function ExamOverviewPage() {
  const params = useParams<{ id: string }>();
  const examId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : null;

  const { data: overview, isLoading, error } = useExamOverview(examId);

  if (!examId || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-sm">Đang tải thông tin tổng quan đề thi...</p>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/40 max-w-lg mx-auto my-12 space-y-4">
        <p className="font-semibold text-rose-600 dark:text-rose-400">
          Đề thi không tồn tại, chưa được xuất bản hoặc đã đóng.
        </p>
        <Button asChild size="sm" className="rounded-xl bg-indigo-600 text-white">
          <Link href="/exams">Quay lại thư viện đề thi</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Breadcrumbs />

      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="rounded-xl text-xs">
          <Link href="/exams">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Quay lại Thư viện đề thi
          </Link>
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <ExamTypeBadge type={overview.type} />
              {overview.isScheduled && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <CalendarClock className="w-3 h-3" />
                  Sắp diễn ra
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {overview.title}
            </h1>
            {overview.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {overview.description}
              </p>
            )}
          </div>

          <Button
            type="button"
            disabled={
              overview.isScheduled || overview.remainingAttempts === 0
            }
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 cursor-pointer"
          >
            <Play className="w-4 h-4 mr-2" />
            {overview.isScheduled
              ? "Chưa đến giờ mở đề"
              : overview.remainingAttempts === 0
              ? "Đã hết lượt thi"
              : "Bắt đầu làm bài"}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-500" />
              Thời lượng làm bài
            </span>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100">
              {overview.durationMinutes} phút
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
            <span className="text-slate-500 flex items-center gap-1.5">
              <FileQuestion className="w-4 h-4 text-indigo-500" />
              Tổng số câu hỏi
            </span>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100">
              {overview.totalQuestions} câu hỏi
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
            <span className="text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              Số lượt thi còn lại
            </span>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100">
              {overview.remainingAttempts !== null
                ? `${overview.remainingAttempts} lượt`
                : "Không giới hạn"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              Chi tiết các Phần thi trong đề ({overview.parts?.length || 0} Part)
            </h2>
            {overview.allowPartPractice && (
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                Hỗ trợ bóc tách luyện tập từng Part
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {overview.parts?.map((part) => (
              <div
                key={part.partNumber}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-900 dark:text-slate-100">
                    Part {part.partNumber}: {part.partName}
                  </p>
                  {part.suggestedDuration && (
                    <p className="text-[11px] text-slate-500">
                      Thời lượng gợi ý luyện riêng: {part.suggestedDuration} phút
                    </p>
                  )}
                </div>
                <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                  {part.questionCount} câu
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
