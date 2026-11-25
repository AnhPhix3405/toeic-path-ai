"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Flag,
  HelpCircle,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionReviewItem } from "@/types/exam-attempt";
import { cn } from "@/lib/utils";

export interface ReviewQuestionCardProps {
  question: QuestionReviewItem;
  onOpenReportModal: (question: QuestionReviewItem) => void;
}

export function ReviewQuestionCard({
  question,
  onOpenReportModal,
}: ReviewQuestionCardProps) {
  const [showTranscript, setShowTranscript] = useState(false);

  const isSkipped = !question.selectedOptionId;
  const statusBadge = question.isCorrect
    ? {
        label: "Trả lời đúng",
        className:
          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
        icon: CheckCircle2,
      }
    : isSkipped
    ? {
        label: "Bỏ trống",
        className:
          "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
        icon: HelpCircle,
      }
    : {
        label: "Trả lời sai",
        className:
          "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800",
        icon: XCircle,
      };
  const StatusIcon = statusBadge.icon;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
            Câu {question.orderIndex}
          </span>
          <span className="text-xs font-medium text-slate-500">
            Part {question.partNumber}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
              statusBadge.className
            )}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            {statusBadge.label}
          </span>
          {question.isMarkedForReview && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <Flag className="w-3 h-3" />
              Đã đánh dấu
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5" />
            {question.timeSpentSeconds}s
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenReportModal(question)}
            className="h-8 rounded-xl text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5 mr-1" />
            Báo cáo lỗi
          </Button>
        </div>
      </div>

      {/* Question Prompt (Rule #1002 nullable content safe) */}
      <div>
        {question.content ? (
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
            {question.content}
          </p>
        ) : (
          <p className="text-xs italic text-slate-400">
            (Câu hỏi Part {question.partNumber}: Nội dung câu hỏi nằm trong tệp
            Audio hoặc đoạn văn nhóm)
          </p>
        )}
      </div>

      {/* Options Breakdown */}
      <div className="space-y-2.5">
        {question.options.map((opt) => {
          const isSelected = question.selectedOptionId === opt.id;
          const isCorrectOpt = opt.isCorrect || question.correctOptionId === opt.id;
          const isWrongSelection = isSelected && !isCorrectOpt;

          return (
            <div
              key={opt.id}
              className={cn(
                "flex items-center gap-3 p-3.5 rounded-xl border transition-colors",
                isCorrectOpt
                  ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100"
                  : isWrongSelection
                  ? "bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100"
                  : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              )}
            >
              <span
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                  isCorrectOpt
                    ? "bg-emerald-600 text-white"
                    : isWrongSelection
                    ? "bg-rose-600 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                )}
              >
                {opt.label}
              </span>
              <span className="flex-1 text-sm">
                {opt.content ? (
                  opt.content
                ) : (
                  <span className="italic text-xs text-slate-400">
                    (Phương án {opt.label} — Nghe trong Audio)
                  </span>
                )}
              </span>

              {isCorrectOpt && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                  Đáp án đúng
                </span>
              )}
              {isWrongSelection && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 shrink-0">
                  <XCircle className="w-4 h-4" />
                  Bạn đã chọn
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Single Question Audio Transcript (Part 1, Part 2) */}
      {question.transcript && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800"
          >
            <span className="inline-flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              Lời thoại Audio (Transcript)
            </span>
            {showTranscript ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {showTranscript && (
            <div className="px-4 pb-3 pt-1 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed border-t border-slate-200/70 dark:border-slate-700/70">
              {question.transcript}
            </div>
          )}
        </div>
      )}

      {/* Explanation Card */}
      <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200/80 dark:border-amber-900/50 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-400">
          <Sparkles className="w-4 h-4" />
          Lời giải chi tiết
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
          {question.explanation ||
            "Câu hỏi này chưa có lời giải chi tiết bổ sung."}
        </p>
      </div>
    </div>
  );
}
