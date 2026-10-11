"use client";

import React from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { QuestionOptionFormValue } from "@/lib/validations/question.schema";

interface QuestionOptionsEditorProps {
  options: QuestionOptionFormValue[];
  onChange: (options: QuestionOptionFormValue[]) => void;
  disabled?: boolean;
  errors?: Record<number, string>;
}

const optionLabels = ["A", "B", "C", "D", "E", "F"];

export function QuestionOptionsEditor({
  options,
  onChange,
  disabled = false,
  errors = {},
}: QuestionOptionsEditorProps) {
  const handleContentChange = (index: number, content: string) => {
    const updated = [...options];
    updated[index] = { ...updated[index], content };
    onChange(updated);
  };

  const handleCorrectSelect = (index: number) => {
    if (disabled) return;
    const updated = options.map((opt, i) => ({
      ...opt,
      isCorrect: i === index,
    }));
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Các phương án trả lời (Options)
        </label>
        <span className="text-xs text-slate-400">
          Chọn biểu tượng tròn bên cạnh để đánh dấu đáp án đúng
        </span>
      </div>

      <div className="space-y-3">
        {options.map((option, index) => {
          const label = optionLabels[index] || String.fromCharCode(65 + index);
          const isCorrect = option.isCorrect;
          const errorMsg = errors[index];

          return (
            <div
              key={option.position || index}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                isCorrect
                  ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 ring-1 ring-emerald-400/30"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
              }`}
            >
              {/* Radio button to mark as correct */}
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleCorrectSelect(index)}
                className={`mt-2 p-1 rounded-full transition-colors ${
                  isCorrect
                    ? "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
                    : "text-slate-300 hover:text-slate-500"
                } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                title={isCorrect ? "Đáp án chính xác" : "Chọn làm đáp án đúng"}
                aria-label={`Chọn phương án ${label} làm đáp án đúng`}
              >
                {isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 fill-emerald-100 dark:fill-emerald-950" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </button>

              {/* Label Badge (A, B, C, D) */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                  isCorrect
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {label}
              </div>

              {/* Input field */}
              <div className="flex-1 space-y-1">
                <Input
                  disabled={disabled}
                  value={option.content}
                  onChange={(e) => handleContentChange(index, e.target.value)}
                  placeholder={`Nội dung phương án ${label}...`}
                  className={`h-9 rounded-lg ${
                    errorMsg ? "border-rose-500 focus-visible:ring-rose-500" : ""
                  }`}
                />
                {errorMsg && (
                  <p className="text-xs text-rose-500 font-medium">{errorMsg}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
