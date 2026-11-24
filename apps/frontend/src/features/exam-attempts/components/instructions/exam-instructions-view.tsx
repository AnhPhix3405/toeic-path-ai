"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  FileQuestion,
  Loader2,
  Play,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExamTypeBadge } from "@/features/exams/components/exam-badges";
import {
  createExamAttemptSchema,
  extractAnotherExamConflict,
  extractApiErrorMeta,
} from "@/lib/validations/exam-attempt.schema";
import { ExamOverview } from "@/types/exam";
import {
  AnotherExamInProgressErrorData,
  CreateExamAttemptDto,
  ExamAttemptSummary,
  PartPracticeMode,
} from "@/types/exam-attempt";
import { AudioCheckWidget } from "./audio-check-widget";
import { PartPracticeSelector } from "./part-practice-selector";
import { ActiveAttemptConflictDialog } from "./active-attempt-conflict-dialog";

export interface ExamInstructionsViewProps {
  overview: ExamOverview;
  isStarting: boolean;
  isAbandoning: boolean;
  onStartAttempt: (dto: CreateExamAttemptDto) => Promise<ExamAttemptSummary>;
  onAbandonAttempt: (attemptId: string) => Promise<unknown>;
}

export function ExamInstructionsView({
  overview,
  isStarting,
  isAbandoning,
  onStartAttempt,
  onAbandonAttempt,
}: ExamInstructionsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialMode: PartPracticeMode =
    (searchParams.get("mode") === "part_practice" ||
      overview.remainingAttempts === 0) &&
    overview.allowPartPractice
      ? "part_practice"
      : "full_exam";

  const [mode, setMode] = useState<PartPracticeMode>(initialMode);
  const [selectedParts, setSelectedParts] = useState<number[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [conflict, setConflict] =
    useState<AnotherExamInProgressErrorData | null>(null);

  const handleModeChange = (nextMode: PartPracticeMode) => {
    setMode(nextMode);
    setValidationError(null);
    setServerError(null);
  };

  const handleTogglePart = (partNumber: number) => {
    setValidationError(null);
    setSelectedParts((prev) =>
      prev.includes(partNumber)
        ? prev.filter((p) => p !== partNumber)
        : [...prev, partNumber].sort((a, b) => a - b)
    );
  };

  const handleSelectAllParts = () => {
    setValidationError(null);
    setSelectedParts((overview.parts ?? []).map((p) => p.partNumber));
  };

  const buildDto = (): CreateExamAttemptDto => {
    const base: CreateExamAttemptDto = {
      examId: overview.id,
      mode,
      deviceInfo:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };
    if (mode === "part_practice") {
      base.selectedParts = selectedParts;
    }
    return base;
  };

  const executeStart = async (dto: CreateExamAttemptDto) => {
    setServerError(null);
    try {
      const summary = await onStartAttempt(dto);
      if (summary.isResumed) {
        toast.info("Đang khôi phục phiên làm bài dở dang của bạn...");
      } else {
        toast.success("Khởi tạo phòng thi thành công. Chúc bạn làm bài tốt!");
      }
      router.push(`/exam-attempts/${summary.attemptId}`);
    } catch (error) {
      const conflictData = extractAnotherExamConflict(error);
      if (conflictData) {
        setConflict(conflictData);
        return;
      }

      const meta = extractApiErrorMeta(error);
      setServerError(meta.message);
      toast.error(meta.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setServerError(null);

    const dto = buildDto();
    const parsed = createExamAttemptSchema.safeParse(dto);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      setValidationError(
        firstIssue?.message ??
          "Vui lòng kiểm tra lại cấu hình chế độ làm bài."
      );
      return;
    }

    await executeStart(dto);
  };

  const handleAbandonAndRetry = async (oldAttemptId: string) => {
    try {
      await onAbandonAttempt(oldAttemptId);
      setConflict(null);
      toast.success("Đã hủy bài thi cũ. Đang khởi tạo đề thi mới...");
      await executeStart(buildDto());
    } catch (error) {
      const meta = extractApiErrorMeta(error);
      toast.error(meta.message);
    }
  };

  const isStartBlocked =
    overview.isScheduled ||
    (mode === "full_exam" && overview.remainingAttempts === 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="rounded-xl text-xs"
        >
          <Link href={`/exams/${overview.id}`}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Quay lại tổng quan đề thi
          </Link>
        </Button>
      </div>

      <form
        noValidate
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6"
      >
        {/* Header Summary */}
        <div className="space-y-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <ExamTypeBadge type={overview.type} />
            <span className="text-xs font-medium text-slate-500">
              Phòng chờ &amp; Quy chế thi trực tuyến
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {overview.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-500" />
              {overview.durationMinutes} phút (Full Exam)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FileQuestion className="w-4 h-4 text-indigo-500" />
              {overview.totalQuestions} câu hỏi
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              Lượt Full Exam còn lại:{" "}
              <strong className="text-slate-900 dark:text-slate-100">
                {overview.remainingAttempts !== null
                  ? `${overview.remainingAttempts} lượt`
                  : "Không giới hạn"}
              </strong>
            </span>
          </div>
        </div>

        {/* Exam Rules */}
        <div className="rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 p-4 space-y-2 text-xs text-slate-700 dark:text-slate-300">
          <h2 className="font-bold text-indigo-950 dark:text-indigo-200">
            Quy chế phòng thi &amp; Bảo toàn dữ liệu
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Đồng hồ đếm ngược được đồng bộ trực tiếp theo thời gian máy chủ và
              tự động khóa bài khi hết giờ.
            </li>
            <li>
              Đáp án của bạn được tự động lưu tức thì vào máy và đồng bộ lên hệ
              thống; nếu mất mạng tạm thời, bài làm sẽ tự đồng bộ lại ngay khi
              có kết nối.
            </li>
            <li>
              Bạn có thể đánh dấu xem lại các câu chưa chắc chắn và di chuyển
              nhanh bằng bảng Question Palette hoặc phím tắt bàn phím.
            </li>
          </ul>
        </div>

        {/* Audio Check */}
        <AudioCheckWidget />

        {/* Mode & Part Practice Selector */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Chọn chế độ làm bài
          </h2>
          <PartPracticeSelector
            overview={overview}
            mode={mode}
            selectedParts={selectedParts}
            errorMessage={validationError}
            onModeChange={handleModeChange}
            onTogglePart={handleTogglePart}
            onSelectAllParts={handleSelectAllParts}
          />
        </div>

        {serverError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Footer CTA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            asChild
            variant="outline"
            className="rounded-xl text-xs cursor-pointer"
          >
            <Link href="/exams">Hủy &amp; Về thư viện</Link>
          </Button>

          <Button
            type="submit"
            disabled={isStarting || isStartBlocked}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-6 cursor-pointer"
          >
            {isStarting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {overview.isScheduled
              ? "Chưa đến giờ mở đề"
              : mode === "part_practice"
              ? "Bắt đầu luyện tập"
              : "Bắt đầu làm bài"}
          </Button>
        </div>
      </form>

      <ActiveAttemptConflictDialog
        conflict={conflict}
        isAbandoning={isAbandoning}
        onClose={() => setConflict(null)}
        onResumeOldAttempt={(attemptId) => {
          setConflict(null);
          router.push(`/exam-attempts/${attemptId}`);
        }}
        onAbandonAndStartNew={handleAbandonAndRetry}
      />
    </div>
  );
}
