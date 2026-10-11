"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileQuestion,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QuestionDifficultyBadge } from "@/features/questions/components/question-difficulty-badge";
import { useAssignQuestionGroup, useDetachQuestionGroup, useQuestions } from "@/hooks/use-questions";
import { Question } from "@/types/question";
import { toast } from "sonner";

interface ChildQuestionsManagerProps {
  groupId: string;
  questions: Question[];
}

export function ChildQuestionsManager({
  groupId,
  questions,
}: ChildQuestionsManagerProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [questionToDetach, setQuestionToDetach] = useState<Question | null>(null);

  const assignMutation = useAssignQuestionGroup();
  const detachMutation = useDetachQuestionGroup();

  // Fetch candidate questions (single choice questions)
  const { data: candidateData, isLoading: candidatesLoading } = useQuestions({
    page: 1,
    limit: 50,
  });

  // Filter questions not already in this group
  const availableQuestions = (candidateData?.data || []).filter(
    (q) => !questions.some((existing) => existing.id === q.id)
  );

  const handleAddQuestion = async () => {
    if (!selectedQuestionId) return;

    try {
      const nextOrder = questions.length + 1;
      await assignMutation.mutateAsync({
        id: selectedQuestionId,
        dto: {
          questionGroupId: groupId,
          groupOrder: nextOrder,
        },
      });
      setIsAddModalOpen(false);
      setSelectedQuestionId(null);
    } catch {
      // Toast handled by mutation
    }
  };

  const handleDetachQuestion = async () => {
    if (!questionToDetach) return;

    try {
      await detachMutation.mutateAsync(questionToDetach.id);
      setQuestionToDetach(null);
    } catch {
      // Toast handled by mutation
    }
  };

  const sortedQuestions = [...questions].sort(
    (a, b) => (a.groupOrder || 0) - (b.groupOrder || 0)
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileQuestion className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Các câu hỏi con trong nhóm ({questions.length})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Danh sách câu hỏi trắc nghiệm tương ứng với bài đọc ngữ cảnh
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm text-xs h-9"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Gán câu hỏi vào nhóm
        </Button>
      </div>

      {/* Child Questions List */}
      {sortedQuestions.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20">
          <FileQuestion className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Chưa có câu hỏi nào được gán vào nhóm này
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Bấm nút &quot;Gán câu hỏi vào nhóm&quot; phía trên để liên kết các câu hỏi con thuộc bài đọc.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedQuestions.map((q, idx) => {
            const order = q.groupOrder || idx + 1;
            const correctOpt = q.options?.find((o) => o.isCorrect);

            return (
              <div
                key={q.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm gap-4"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    #{order}
                  </span>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/questions/${q.id}`}
                      className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-600 line-clamp-2"
                    >
                      {q.content}
                    </Link>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
                      <QuestionDifficultyBadge difficulty={q.difficulty} />
                      {correctOpt && (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Đáp án đúng: {correctOpt.content}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                    <Link href={`/questions/${q.id}`} title="Xem chi tiết">
                      <ExternalLink className="w-4 h-4 text-slate-500" />
                    </Link>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuestionToDetach(q)}
                    className="h-8 w-8 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    title="Gỡ khỏi nhóm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Question to Group Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Gán câu hỏi vào nhóm bài đọc
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Chọn câu hỏi trắc nghiệm từ ngân hàng câu hỏi để đưa vào nhóm bài đọc này.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[340px] overflow-y-auto space-y-2 py-2">
            {candidatesLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-indigo-600" />
                Đang tải danh sách câu hỏi...
              </div>
            ) : availableQuestions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Không còn câu hỏi khả dụng để gán.
              </div>
            ) : (
              availableQuestions.map((q) => {
                const isSelected = selectedQuestionId === q.id;
                return (
                  <div
                    key={q.id}
                    onClick={() => setSelectedQuestionId(q.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 ring-1 ring-indigo-400"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {q.part ? `Part ${q.part.partNumber}` : "Single choice"}
                      </span>
                      <QuestionDifficultyBadge difficulty={q.difficulty} />
                    </div>
                    <p className="line-clamp-2 text-slate-800 dark:text-slate-200">
                      {q.content}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={!selectedQuestionId || assignMutation.isPending}
              onClick={handleAddQuestion}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {assignMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Xác nhận gán
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detach Confirmation Dialog */}
      <Dialog
        open={Boolean(questionToDetach)}
        onOpenChange={(open) => !open && setQuestionToDetach(null)}
      >
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600">
              Gỡ câu hỏi khỏi nhóm
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Câu hỏi sẽ được tách khỏi bài đọc này và trở thành câu hỏi độc lập. Câu hỏi không bị xóa khỏi hệ thống.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setQuestionToDetach(null)}
              disabled={detachMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDetachQuestion}
              disabled={detachMutation.isPending}
            >
              {detachMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Xác nhận gỡ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
