"use client";

import React, { useMemo, useState } from "react";
import { Bookmark, Grid3X3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { LocalAnswerState } from "@/stores/exam-room.store";
import { QuestionDeliveryItem } from "@/types/exam-attempt";

export interface ExamQuestionPaletteProps {
  questions: QuestionDeliveryItem[];
  answers: Record<string, LocalAnswerState>;
  activeOrderIndex: number;
  onJumpToOrderIndex: (orderIndex: number) => void;
}

type PaletteFilter = "all" | "unanswered" | "flagged";

export function ExamQuestionPalette({
  questions,
  answers,
  activeOrderIndex,
  onJumpToOrderIndex,
}: ExamQuestionPaletteProps) {
  const [filter, setFilter] = useState<PaletteFilter>("all");
  const [jumpInput, setJumpInput] = useState(String(activeOrderIndex));

  const stats = useMemo(() => {
    let answered = 0;
    let flagged = 0;
    for (const q of questions) {
      const state = answers[q.id];
      if (state?.selectedOptionId) answered++;
      if (state?.isMarkedForReview) flagged++;
    }
    return {
      total: questions.length,
      answered,
      unanswered: questions.length - answered,
      flagged,
    };
  }, [questions, answers]);

  const groupedByPart = useMemo(() => {
    const map = new Map<number, QuestionDeliveryItem[]>();
    for (const q of questions) {
      const state = answers[q.id];
      const isAnswered = Boolean(state?.selectedOptionId);
      const isFlagged = Boolean(state?.isMarkedForReview);

      if (filter === "unanswered" && isAnswered) continue;
      if (filter === "flagged" && !isFlagged) continue;

      const list = map.get(q.partNumber) ?? [];
      list.push(q);
      map.set(q.partNumber, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [questions, answers, filter]);

  const commitJump = (rawValue: string) => {
    const parsed = Number(rawValue);
    if (
      Number.isInteger(parsed) &&
      parsed >= 1 &&
      parsed <= questions.length
    ) {
      onJumpToOrderIndex(parsed);
      setJumpInput(String(parsed));
    } else {
      setJumpInput(String(activeOrderIndex));
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
          <Grid3X3 className="w-4 h-4 text-indigo-600" />
          <span>Bảng câu hỏi ({stats.answered}/{stats.total})</span>
        </div>

        {/* #1006 Jump-to-question spinbutton */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <label htmlFor="palette-jump-input" className="shrink-0">
            Đi tới câu:
          </label>
          <input
            id="palette-jump-input"
            type="number"
            min={1}
            max={Math.max(1, questions.length)}
            value={jumpInput}
            aria-label="Nhập số câu hỏi cần xem"
            onChange={(e) => setJumpInput(e.target.value)}
            onBlur={(e) => commitJump(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitJump(jumpInput);
              }
            }}
            className="w-14 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-center text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Filter Pills */}
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-[11px] font-semibold">
        {(
          [
            { key: "all", label: `Tất cả (${stats.total})` },
            { key: "unanswered", label: `Chưa làm (${stats.unanswered})` },
            { key: "flagged", label: `Xem lại (${stats.flagged})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={cn(
              "py-1 px-1.5 rounded-lg transition-colors cursor-pointer truncate",
              filter === tab.key
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600" />
          Đã làm
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
          Chưa làm
        </span>
        <span className="inline-flex items-center gap-1">
          <Bookmark className="w-3 h-3 text-amber-500 fill-amber-500" />
          Xem lại
        </span>
      </div>

      {/* Question Grids Grouped by Part */}
      <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
        {groupedByPart.length === 0 ? (
          <p className="text-center text-xs text-slate-500 py-6">
            Không có câu hỏi nào thuộc bộ lọc này.
          </p>
        ) : (
          groupedByPart.map(([partNum, partQuestions]) => (
            <div key={partNum} className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Part {partNum}
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {partQuestions.map((q) => {
                  const state = answers[q.id];
                  const isAnswered = Boolean(state?.selectedOptionId);
                  const isFlagged = Boolean(state?.isMarkedForReview);
                  const isActive = q.orderIndex === activeOrderIndex;

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        onJumpToOrderIndex(q.orderIndex);
                        setJumpInput(String(q.orderIndex));
                      }}
                      aria-label={`Câu hỏi ${q.orderIndex}${
                        isAnswered ? " - Đã trả lời" : " - Chưa trả lời"
                      }${isFlagged ? " - Đánh dấu xem lại" : ""}`}
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "relative h-8 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                        isAnswered
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400",
                        isActive &&
                          "ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-slate-900",
                        isFlagged && "border-amber-500"
                      )}
                    >
                      {q.orderIndex}
                      {isFlagged && (
                        <span
                          aria-hidden="true"
                          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white dark:border-slate-900"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
