"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  FileQuestion,
  Layers,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionDifficultyBadge } from "@/features/questions/components/question-difficulty-badge";
import {
  ExamQuestionItem,
  ExamSectionItem,
  ExamStructure,
  ReorderItemInput,
} from "@/types/exam";
import { QuestionDifficulty } from "@/types/question";
import { buildContiguousReorderPayload } from "@/lib/validations/exam.schema";

export interface ExamStructureWorkspaceProps {
  structure: ExamStructure;
  isMutating?: boolean;
  onOpenQuestionPicker: (section: ExamSectionItem) => void;
  onOpenAutoGenerate: () => void;
  onReorderQuestions: (items: ReorderItemInput[]) => Promise<void> | void;
  onRemoveQuestion: (questionId: string) => Promise<void> | void;
}

export function ExamStructureWorkspace({
  structure,
  isMutating = false,
  onOpenQuestionPicker,
  onOpenAutoGenerate,
  onReorderQuestions,
  onRemoveQuestion,
}: ExamStructureWorkspaceProps) {
  const isDraft = structure.status === "draft";
  const sections = useMemo(
    () =>
      [...(structure.sections || [])].sort(
        (a, b) => (a.partNumber ?? 0) - (b.partNumber ?? 0)
      ),
    [structure.sections]
  );

  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    sections[0]?.id || null
  );

  const effectiveSection = useMemo(
    () =>
      sections.find((s) => s.id === activeSectionId) || sections[0] || null,
    [sections, activeSectionId]
  );

  const sortedAllQuestions = useMemo(
    () =>
      [...(structure.questions || [])].sort(
        (a, b) => a.orderIndex - b.orderIndex
      ),
    [structure.questions]
  );

  const sectionQuestions = useMemo(() => {
    if (!effectiveSection) return [];
    return sortedAllQuestions.filter(
      (q) => q.examSectionId === effectiveSection.id
    );
  }, [sortedAllQuestions, effectiveSection]);

  const handleMove = async (
    item: ExamQuestionItem,
    direction: "up" | "down"
  ) => {
    if (!isDraft || isMutating) return;
    const globalIdx = sortedAllQuestions.findIndex(
      (q) => q.questionId === item.questionId
    );
    if (globalIdx < 0) return;

    const reorderedItems = buildContiguousReorderPayload(
      sortedAllQuestions,
      globalIdx,
      direction
    );
    await onReorderQuestions(reorderedItems);
  };

  if (sections.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-10 text-center space-y-2">
        <Layers className="w-8 h-8 text-slate-400 mx-auto" />
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Đề thi chưa có cấu hình các phần thi (Sections)
        </p>
        <p className="text-xs text-slate-500">
          Vui lòng chọn các Part TOEIC và lưu cấu hình ở khung phía trên trước
          khi nạp câu hỏi vào đề thi.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Top Toolbar & Section Tabs */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Cấu trúc câu hỏi theo từng Phần thi (Part 1 – Part 7)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tổng số câu hỏi hiện có:{" "}
              <strong className="text-indigo-600 dark:text-indigo-400">
                {structure.totalQuestions}
              </strong>{" "}
              /{" "}
              <strong>
                {sections.reduce((s, sec) => s + sec.targetQuestionsCount, 0)}
              </strong>{" "}
              câu hỏi mục tiêu
            </p>
          </div>

          {isDraft && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isMutating}
              onClick={onOpenAutoGenerate}
              className="rounded-xl border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              Sinh đề tự động (Auto-Generate)
            </Button>
          )}
        </div>

        {/* Section Tabs */}
        <div className="flex flex-wrap gap-2">
          {sections.map((sec) => {
            const actual = sec.actualQuestionsCount ?? 0;
            const target = sec.targetQuestionsCount;
            const isComplete = actual === target;
            const isActive = effectiveSection?.id === sec.id;

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSectionId(sec.id)}
                className={`px-3.5 py-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <span className="text-xs font-bold">
                  Part {sec.partNumber ?? "—"}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : isComplete
                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                      : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                  }`}
                >
                  {actual}/{target}
                </span>
                {isComplete && (
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      isActive ? "text-white" : "text-emerald-600"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Section Detail & Questions List */}
      {effectiveSection && (
        <div className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Part {effectiveSection.partNumber}: {effectiveSection.partName}
              </h3>
              <p className="text-xs text-slate-500">
                Đã nạp:{" "}
                <strong>{effectiveSection.actualQuestionsCount ?? 0}</strong> /{" "}
                <strong>{effectiveSection.targetQuestionsCount}</strong> câu hỏi
                {effectiveSection.targetDurationMinutes
                  ? ` • Thời lượng gợi ý luyện Part: ${effectiveSection.targetDurationMinutes} phút`
                  : ""}
              </p>
            </div>

            {isDraft && (
              <Button
                type="button"
                size="sm"
                disabled={isMutating}
                onClick={() => onOpenQuestionPicker(effectiveSection)}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Tuyển chọn câu hỏi từ Ngân hàng
              </Button>
            )}
          </div>

          {sectionQuestions.length === 0 ? (
            <div className="p-10 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
              <FileQuestion className="w-7 h-7 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Chưa có câu hỏi nào trong Part {effectiveSection.partNumber}
              </p>
              <p className="text-[11px] text-slate-500">
                Nhấn nút &ldquo;Tuyển chọn câu hỏi từ Ngân hàng&rdquo; hoặc dùng
                công cụ &ldquo;Sinh đề tự động&rdquo; để nạp câu hỏi đã xuất bản.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sectionQuestions.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      #{item.orderIndex}
                    </span>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.questionGroupId && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            <Layers className="w-3 h-3" />
                            Nhóm #{item.questionGroupId.slice(0, 6)} (Câu{" "}
                            {item.groupOrder ?? 1})
                          </span>
                        )}
                        {item.difficulty && (
                          <QuestionDifficultyBadge
                            difficulty={item.difficulty as QuestionDifficulty}
                          />
                        )}
                      </div>

                      <p className="text-xs font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                        {item.content ||
                          "(Câu hỏi Audio / Đoạn văn nhóm không có văn bản riêng)"}
                      </p>
                    </div>
                  </div>

                  {isDraft && (
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={isMutating || idx === 0}
                        aria-label={`Di chuyển câu hỏi #${item.orderIndex} lên`}
                        onClick={() => handleMove(item, "up")}
                        className="h-8 w-8 rounded-lg cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={
                          isMutating || idx === sectionQuestions.length - 1
                        }
                        aria-label={`Di chuyển câu hỏi #${item.orderIndex} xuống`}
                        onClick={() => handleMove(item, "down")}
                        className="h-8 w-8 rounded-lg cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isMutating}
                        onClick={() => onRemoveQuestion(item.questionId)}
                        className="h-8 px-2.5 rounded-lg text-rose-600 hover:text-rose-700 border-rose-200 dark:border-rose-900 text-xs cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        {item.questionGroupId ? "Gỡ nhóm" : "Gỡ câu"}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
