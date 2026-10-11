"use client";

import React, { useDeferredValue, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Eye, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { QuestionDifficultyBadge } from "./question-difficulty-badge";
import { SingleQuestionFormValues } from "@/lib/validations/question.schema";
import { useToeicParts } from "@/hooks/use-classification";

interface QuestionPreviewCardProps {
  formValues: SingleQuestionFormValues;
}

const optionLabels = ["A", "B", "C", "D", "E", "F"];

export function QuestionPreviewCard({ formValues }: QuestionPreviewCardProps) {
  // PM Point 4: React 19 useDeferredValue to avoid stutter when typing
  const deferredValues = useDeferredValue(formValues);
  const [showExplanation, setShowExplanation] = useState(true);

  const { data: parts } = useToeicParts();
  const selectedPart = parts?.find((p) => p.id === deferredValues.partId);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4 sticky top-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Eye className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Mô phỏng đề thi TOEIC
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selectedPart && (
            <Badge variant="secondary" className="text-xs">
              Part {selectedPart.partNumber}
            </Badge>
          )}
          <QuestionDifficultyBadge difficulty={deferredValues.difficulty} />
        </div>
      </div>

      {/* Question Prompt */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          Question 101
        </span>
        <p className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-relaxed min-h-[48px]">
          {deferredValues.content || (
            <span className="text-slate-400 italic font-normal">
              Nội dung câu hỏi sẽ hiển thị trực quan tại đây khi bạn gõ...
            </span>
          )}
        </p>
      </div>

      {/* Options List */}
      <div className="space-y-2.5 pt-2">
        {deferredValues.options.map((opt, idx) => {
          const label = optionLabels[idx] || String.fromCharCode(65 + idx);
          const isCorrect = opt.isCorrect;

          return (
            <div
              key={idx}
              className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition-all ${
                isCorrect
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 font-medium"
                  : "bg-slate-50/60 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isCorrect
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {label}
              </span>
              <span className="flex-1">
                {opt.content || (
                  <span className="text-slate-400 italic">Phương án {label}</span>
                )}
              </span>
              {isCorrect && (
                <span className="inline-flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Đáp án đúng
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Collapsible Explanation Box */}
      {deferredValues.explanation && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowExplanation(!showExplanation)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Lời giải chi tiết
            </span>
            {showExplanation ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {showExplanation && (
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40 leading-relaxed">
              {deferredValues.explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
