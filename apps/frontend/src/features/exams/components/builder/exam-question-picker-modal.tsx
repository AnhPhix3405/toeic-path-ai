"use client";

import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  FileQuestion,
  Layers,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuestionDifficultyBadge } from "@/features/questions/components/question-difficulty-badge";
import { AddExamQuestionsDto, ExamSectionItem } from "@/types/exam";
import { Question, QuestionGroup } from "@/types/question";

export interface ExamQuestionPickerModalProps {
  isOpen: boolean;
  version: number;
  section: ExamSectionItem | null;
  existingQuestionIds: string[];
  availableSingleQuestions: Question[];
  availableQuestionGroups: QuestionGroup[];
  isLoadingBank?: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirmAdd: (dto: AddExamQuestionsDto) => Promise<void> | void;
}

const GROUP_PART_NUMBERS = [3, 4, 6, 7];

export function ExamQuestionPickerModal({
  isOpen,
  version,
  section,
  existingQuestionIds,
  availableSingleQuestions,
  availableQuestionGroups,
  isLoadingBank = false,
  isSubmitting = false,
  onClose,
  onConfirmAdd,
}: ExamQuestionPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  const partNumber = section?.partNumber ?? 5;
  const isGroupPart = GROUP_PART_NUMBERS.includes(partNumber);

  const existingSet = useMemo(
    () => new Set(existingQuestionIds),
    [existingQuestionIds]
  );

  const sectionPartId = section?.partId;
  const sectionPartNumber = section?.partNumber;

  // Filter eligible single questions (published, not in group)
  const filteredSingleQuestions = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return availableSingleQuestions.filter((q) => {
      if (q.status !== "published") return false;
      if (q.questionGroupId) return false;
      if (sectionPartId && q.part?.id && q.part.id !== sectionPartId) {
        return false;
      }
      if (!keyword) return true;
      return (q.content || "").toLowerCase().includes(keyword);
    });
  }, [availableSingleQuestions, searchQuery, sectionPartId]);

  // Filter eligible question groups (100% child questions published and match part)
  const filteredQuestionGroups = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return availableQuestionGroups.filter((grp) => {
      const qs = grp.questions || [];
      if (qs.length === 0) return false;
      const allPublishedAndMatchPart = qs.every((q) => {
        if (q.status !== "published") return false;
        if (sectionPartId && q.part?.id && q.part.id !== sectionPartId) {
          return false;
        }
        if (
          sectionPartNumber &&
          q.part?.partNumber &&
          q.part.partNumber !== sectionPartNumber
        ) {
          return false;
        }
        return true;
      });
      if (!allPublishedAndMatchPart) return false;
      if (!keyword) return true;
      const titleMatch = (grp.title || "").toLowerCase().includes(keyword);
      const contextMatch = (grp.context || "").toLowerCase().includes(keyword);
      return titleMatch || contextMatch;
    });
  }, [
    availableQuestionGroups,
    searchQuery,
    section?.partId,
    section?.partNumber,
  ]);

  if (!section) return null;

  const handleToggleSingle = (questionId: string) => {
    if (existingSet.has(questionId)) return;
    setSelectedQuestionIds((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleToggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleConfirm = async () => {
    if (isGroupPart) {
      if (selectedGroupIds.length === 0) return;
      await onConfirmAdd({
        version,
        sectionId: section.id,
        questionGroupIds: selectedGroupIds,
      });
      setSelectedGroupIds([]);
    } else {
      if (selectedQuestionIds.length === 0) return;
      await onConfirmAdd({
        version,
        sectionId: section.id,
        questionIds: selectedQuestionIds,
      });
      setSelectedQuestionIds([]);
    }
  };

  const selectedCount = isGroupPart
    ? selectedGroupIds.length
    : selectedQuestionIds.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl rounded-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            {isGroupPart ? (
              <Layers className="w-5 h-5 text-indigo-600" />
            ) : (
              <FileQuestion className="w-5 h-5 text-indigo-600" />
            )}
            Tuyển chọn{" "}
            {isGroupPart
              ? "Nhóm câu hỏi nguyên khối (QuestionGroup)"
              : "Câu hỏi đơn lẻ"}{" "}
            — Part {section.partNumber}: {section.partName}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {isGroupPart
              ? "Theo quy tắc toàn vẹn nhóm câu hỏi (BR17.3), các phần thi có đoạn văn/hội thoại (Part 3, 4, 6, 7) sẽ nạp nguyên khối toàn bộ nhóm câu hỏi đã xuất bản (published)."
              : "Chỉ hiển thị các câu hỏi đơn đã qua kiểm duyệt ở trạng thái Đã xuất bản (published)."}
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative my-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isGroupPart
                ? "Tìm kiếm theo tiêu đề hoặc nội dung đoạn văn nhóm..."
                : "Tìm kiếm theo nội dung câu hỏi đã xuất bản..."
            }
            className="pl-10 h-9 rounded-xl text-xs"
          />
        </div>

        {/* List Area */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[260px] max-h-[420px]">
          {isLoadingBank ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
              Đang tải dữ liệu Ngân hàng câu hỏi đã xuất bản...
            </div>
          ) : isGroupPart ? (
            filteredQuestionGroups.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                Không có nhóm câu hỏi (QuestionGroup) nào thuộc Part{" "}
                {section.partNumber} có 100% câu hỏi con ở trạng thái Đã xuất
                bản (published).
              </div>
            ) : (
              filteredQuestionGroups.map((grp) => {
                const isAlreadyInExam = (grp.questions || []).some((q) =>
                  existingSet.has(q.id)
                );
                const isSelected = selectedGroupIds.includes(grp.id);

                return (
                  <label
                    key={grp.id}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors cursor-pointer ${
                      isAlreadyInExam
                        ? "opacity-50 bg-slate-50 dark:bg-slate-800/40 cursor-not-allowed"
                        : isSelected
                        ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50/60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      data-testid={`pick-question-group-${grp.id}`}
                      aria-label={`Chọn nhóm câu hỏi ${grp.title || grp.id}`}
                      disabled={isAlreadyInExam}
                      checked={isSelected}
                      onChange={() => handleToggleGroup(grp.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {grp.title || `Nhóm câu hỏi #${grp.id.slice(0, 8)}`}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold">
                          {grp.questions?.length || 0} câu hỏi con
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {grp.context}
                      </p>
                      {isAlreadyInExam && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle2 className="w-3 h-3" />
                          Đã có trong đề thi
                        </span>
                      )}
                    </div>
                  </label>
                );
              })
            )
          ) : filteredSingleQuestions.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              Không có câu hỏi đơn nào thuộc Part {section.partNumber} ở trạng
              thái Đã xuất bản (published).
            </div>
          ) : (
            filteredSingleQuestions.map((q) => {
              const isAlreadyInExam = existingSet.has(q.id);
              const isSelected = selectedQuestionIds.includes(q.id);

              return (
                <label
                  key={q.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                    isAlreadyInExam
                      ? "opacity-50 bg-slate-50 dark:bg-slate-800/40 cursor-not-allowed"
                      : isSelected
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50/60"
                  }`}
                >
                  <input
                    type="checkbox"
                    data-testid={`pick-single-question-${q.id}`}
                    aria-label={`Chọn câu hỏi ${q.id}`}
                    disabled={isAlreadyInExam}
                    checked={isSelected}
                    onChange={() => handleToggleSingle(q.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                        {q.content ||
                          "(Câu hỏi Audio Part 1/2 không có văn bản hiển thị)"}
                      </p>
                      <QuestionDifficultyBadge difficulty={q.difficulty} />
                    </div>
                    {isAlreadyInExam && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                        <CheckCircle2 className="w-3 h-3" />
                        Đã có trong đề thi
                      </span>
                    )}
                  </div>
                </label>
              );
            })
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-500">
            Đã chọn:{" "}
            <strong className="text-indigo-600 dark:text-indigo-400">
              {selectedCount}
            </strong>{" "}
            {isGroupPart ? "nhóm câu hỏi" : "câu hỏi đơn"}
          </span>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs cursor-pointer"
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={selectedCount === 0 || isSubmitting}
              onClick={handleConfirm}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5 mr-1.5" />
              )}
              Thêm vào đề thi ({selectedCount})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
