"use client";

import React from "react";
import { Bookmark, Check, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuestionDeliveryItem } from "@/types/exam-attempt";

export interface ExamQuestionCardProps {
  question: QuestionDeliveryItem;
  selectedOptionId: string | null;
  isMarkedForReview: boolean;
  isLocked: boolean;
  onSelectOption: (questionId: string, optionId: string) => void;
  onClearOption: (questionId: string) => void;
  onToggleReview: (questionId: string) => void;
}

function getFallbackPrompt(partNumber: number): string {
  if (partNumber === 1 || partNumber === 2) {
    return "Nghe đoạn âm thanh và chọn phương án chính xác nhất.";
  }
  if (partNumber === 6) {
    return "Chọn phương án phù hợp nhất để điền vào chỗ trống tương ứng trong đoạn văn.";
  }
  return "Chọn đáp án đúng nhất cho câu hỏi này.";
}

export function ExamQuestionCard({
  question,
  selectedOptionId,
  isMarkedForReview,
  isLocked,
  onSelectOption,
  onClearOption,
  onToggleReview,
}: ExamQuestionCardProps) {
  const promptText =
    question.content && question.content.trim().length > 0
      ? question.content
      : getFallbackPrompt(question.partNumber);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5 shadow-2xs">
      {/* Question Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold">
            Câu {question.orderIndex}
          </span>
          <span className="text-xs font-semibold text-slate-500">
            Part {question.partNumber}
          </span>
          {question.originalQuestionNumber != null &&
            question.originalQuestionNumber !== question.orderIndex && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                #{question.originalQuestionNumber}
              </span>
            )}
        </div>

        <div className="flex items-center gap-1.5">
          {selectedOptionId && !isLocked && (
            <button
              type="button"
              onClick={() => onClearOption(question.id)}
              aria-label={`Bỏ chọn đáp án câu ${question.orderIndex}`}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            >
              <Eraser className="w-3.5 h-3.5" />
              Bỏ chọn
            </button>
          )}

          <button
            type="button"
            disabled={isLocked}
            onClick={() => onToggleReview(question.id)}
            aria-pressed={isMarkedForReview}
            aria-label={
              isMarkedForReview
                ? `Bỏ đánh dấu xem lại câu ${question.orderIndex}`
                : `Đánh dấu xem lại câu ${question.orderIndex}`
            }
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors",
              isLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
              isMarkedForReview
                ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            <Bookmark
              className={cn(
                "w-3.5 h-3.5",
                isMarkedForReview && "fill-amber-500 text-amber-500"
              )}
            />
            {isMarkedForReview ? "Đã đánh dấu xem lại" : "Đánh dấu xem lại"}
          </button>
        </div>
      </div>

      {/* Question Prompt (Rule #1002 nullable-safe) */}
      <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
        {promptText}
      </p>

      {/* Options A/B/C/D */}
      <div
        className="space-y-2.5"
        role="radiogroup"
        aria-label={`Các phương án cho câu ${question.orderIndex}`}
      >
        {question.options.map((opt) => {
          const isSelected = selectedOptionId === opt.id;
          const hasText =
            opt.content !== null &&
            opt.content !== undefined &&
            opt.content.trim().length > 0;

          return (
            <button
              key={opt.id}
              type="button"
              disabled={isLocked}
              aria-pressed={isSelected}
              aria-label={`Chọn đáp án ${opt.label}${
                hasText ? `: ${opt.content}` : ""
              }`}
              onClick={() => {
                if (isSelected) {
                  onClearOption(question.id);
                } else {
                  onSelectOption(question.id, opt.id);
                }
              }}
              className={cn(
                "w-full flex items-center gap-3.5 p-3.5 rounded-xl border text-left transition-all",
                isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
                isSelected
                  ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-1 ring-indigo-500/30"
                  : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              )}
            >
              <span
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border transition-colors",
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                )}
              >
                {isSelected ? <Check className="w-4 h-4" /> : opt.label}
              </span>

              <span className="text-sm text-slate-800 dark:text-slate-200 leading-snug">
                {hasText ? opt.content : `Đáp án (${opt.label})`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
