"use client";

import React from "react";
import { CheckSquare, Clock, Layers, ShieldAlert, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { estimatePartPracticeMinutes } from "@/lib/validations/exam-attempt.schema";
import { ExamOverview } from "@/types/exam";
import { PartPracticeMode } from "@/types/exam-attempt";

export interface PartPracticeSelectorProps {
  overview: ExamOverview;
  mode: PartPracticeMode;
  selectedParts: number[];
  errorMessage?: string | null;
  onModeChange: (mode: PartPracticeMode) => void;
  onTogglePart: (partNumber: number) => void;
  onSelectAllParts: () => void;
}

export function PartPracticeSelector({
  overview,
  mode,
  selectedParts,
  errorMessage,
  onModeChange,
  onTogglePart,
  onSelectAllParts,
}: PartPracticeSelectorProps) {
  const isFullExamExhausted = overview.remainingAttempts === 0;
  const estimatedPracticeMinutes = estimatePartPracticeMinutes(
    overview.parts ?? [],
    selectedParts
  );

  const selectedQuestionsCount = (overview.parts ?? [])
    .filter((p) => selectedParts.includes(p.partNumber))
    .reduce((sum, p) => sum + p.questionCount, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Full Exam Card */}
        <button
          type="button"
          disabled={isFullExamExhausted}
          onClick={() => onModeChange("full_exam")}
          className={cn(
            "text-left p-4 rounded-2xl border transition-all space-y-1.5",
            isFullExamExhausted
              ? "opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              : "cursor-pointer",
            mode === "full_exam" && !isFullExamExhausted
              ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500/30"
              : "border-slate-200 dark:border-slate-800 hover:border-indigo-300"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Làm toàn bộ đề thi (Full Exam)
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
              {overview.durationMinutes} phút
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Thực hiện trọn vẹn {overview.totalQuestions} câu hỏi theo đúng áp
            lực thời gian chuẩn của đề thi.
          </p>
          {isFullExamExhausted && (
            <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 pt-1">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              Đã hết lượt thi Full Exam — Vui lòng chọn Luyện tập từng Part
            </p>
          )}
        </button>

        {/* Part Practice Card */}
        <button
          type="button"
          disabled={!overview.allowPartPractice}
          onClick={() => onModeChange("part_practice")}
          className={cn(
            "text-left p-4 rounded-2xl border transition-all space-y-1.5",
            !overview.allowPartPractice
              ? "opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              : "cursor-pointer",
            mode === "part_practice" && overview.allowPartPractice
              ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500/30"
              : "border-slate-200 dark:border-slate-800 hover:border-indigo-300"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Luyện tập từng Part
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
              Không trừ lượt thi
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {overview.allowPartPractice
              ? "Tùy chọn bóc tách một hoặc nhiều Part để rèn luyện kỹ năng chuyên sâu."
              : "Đề thi này không hỗ trợ chế độ bóc tách luyện từng Part."}
          </p>
        </button>
      </div>

      {/* Part Selection Grid when part_practice is active */}
      {mode === "part_practice" && overview.allowPartPractice && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Layers className="w-4 h-4 text-indigo-600" />
              Chọn các Phần thi muốn luyện ({selectedParts.length}/
              {overview.parts?.length ?? 0} Part)
            </div>
            <button
              type="button"
              onClick={onSelectAllParts}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
            >
              Chọn tất cả Part
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(overview.parts ?? []).map((part) => {
              const checked = selectedParts.includes(part.partNumber);
              return (
                <button
                  key={part.partNumber}
                  type="button"
                  onClick={() => onTogglePart(part.partNumber)}
                  aria-pressed={checked}
                  aria-label={`Chọn Part ${part.partNumber}: ${part.partName}`}
                  className={cn(
                    "flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer",
                    checked
                      ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        Part {part.partNumber}: {part.partName}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {part.questionCount} câu hỏi
                        {part.suggestedDuration
                          ? ` • Gợi ý ${part.suggestedDuration} phút`
                          : ""}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedParts.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              <span>
                Tổng số câu đã chọn:{" "}
                <strong className="text-slate-900 dark:text-slate-100">
                  {selectedQuestionsCount} câu
                </strong>
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                <Clock className="w-3.5 h-3.5" />
                Thời lượng dự kiến: {estimatedPracticeMinutes} phút
              </span>
            </div>
          )}

          {errorMessage && (
            <p
              role="alert"
              className="text-xs font-medium text-rose-600 dark:text-rose-400 pt-1"
            >
              {errorMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
