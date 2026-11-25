"use client";

import React, { useState } from "react";
import { AlertCircle, Flag, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { QuestionReportReason } from "@/types/question-report";
import { createQuestionReportSchema } from "@/lib/validations/question-report.schema";
import { extractApiErrorMeta } from "@/lib/validations/exam-attempt.schema";
import { useCreateQuestionReport } from "@/hooks/use-question-reports";
import { QUESTION_REPORT_REASON_LABELS } from "./question-report-badges";

export interface ReportQuestionModalProps {
  isOpen: boolean;
  /** Canonical Question UUID (required by Backend ParseUUIDPipe) */
  questionId: string;
  /** Canonical ExamAttempt UUID (PMR 033 #2: NEVER pass attemptCode) */
  attemptId?: string;
  questionLabel?: string;
  onClose: () => void;
}

const REASONS: QuestionReportReason[] = [
  "wrong_answer",
  "typo_error",
  "broken_media",
  "unclear_explanation",
  "other",
];

export function ReportQuestionModal({
  isOpen,
  questionId,
  attemptId,
  questionLabel,
  onClose,
}: ReportQuestionModalProps) {
  const createMutation = useCreateQuestionReport();
  const [reason, setReason] = useState<QuestionReportReason>("wrong_answer");
  const [description, setDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverConflictError, setServerConflictError] = useState<string | null>(
    null
  );

  const resetForm = () => {
    setReason("wrong_answer");
    setDescription("");
    setFieldErrors({});
    setServerConflictError(null);
  };

  const handleClose = () => {
    if (createMutation.isPending) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setServerConflictError(null);

    const parsed = createQuestionReportSchema.safeParse({
      reason,
      description: description.trim() ? description.trim() : undefined,
      attemptId,
    });

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] || "form");
        if (!nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        questionId,
        dto: {
          reason: parsed.data.reason,
          description: parsed.data.description || undefined,
          attemptId: parsed.data.attemptId,
        },
      });
      toast.success(
        created.reportCode
          ? `Đã gửi báo cáo ${created.reportCode} tới đội ngũ chuyên môn!`
          : "Đã gửi báo cáo câu hỏi lỗi thành công!"
      );
      resetForm();
      onClose();
    } catch (err: unknown) {
      const meta = extractApiErrorMeta(err);
      if (
        meta.status === 409 ||
        meta.errorCode === "ERR_DUPLICATE_OPEN_REPORT"
      ) {
        setServerConflictError(
          meta.message ||
            "Bạn đã có một báo cáo đang chờ xử lý cho câu hỏi này."
        );
        return;
      }
      toast.error(meta.message || "Không thể gửi báo cáo câu hỏi.");
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Flag className="w-4 h-4 text-rose-500" />
            Báo cáo lỗi câu hỏi {questionLabel ? `(${questionLabel})` : ""}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Phản hồi của bạn sẽ được gửi tới Giáo viên/Admin để kiểm tra và cập
            nhật chính xác.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit} className="space-y-4 pt-1">
          {serverConflictError && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>{serverConflictError}</span>
            </div>
          )}

          {/* Reason Selector */}
          <div className="space-y-2">
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Loại lỗi phát hiện *
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REASONS.map((r) => {
                const isSelected = reason === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setReason(r);
                      setFieldErrors({});
                    }}
                    className={`px-3 py-2.5 rounded-xl border text-left text-xs font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300"
                        : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                    }`}
                  >
                    {QUESTION_REPORT_REASON_LABELS[r]}
                  </button>
                );
              })}
            </div>
            {fieldErrors.reason && (
              <p
                role="alert"
                className="text-xs font-medium text-rose-600 dark:text-rose-400"
              >
                {fieldErrors.reason}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="report-description-input"
                className="text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Mô tả chi tiết{" "}
                {reason === "other" ? (
                  <span className="text-rose-500">* (tối thiểu 10 ký tự)</span>
                ) : (
                  <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                )}
              </label>
              <span className="text-[11px] text-slate-400">
                {description.length}/1000
              </span>
            </div>
            <Textarea
              id="report-description-input"
              rows={4}
              maxLength={1000}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (fieldErrors.description) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.description;
                    return next;
                  });
                }
              }}
              placeholder="Mô tả cụ thể vị trí sai sót (VD: Đáp án đúng phải là B vì...)"
              className="rounded-xl text-sm"
            />
            {fieldErrors.description && (
              <p
                role="alert"
                className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {fieldErrors.description}
              </p>
            )}
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={createMutation.isPending}
              onClick={handleClose}
              className="rounded-xl text-xs cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs cursor-pointer"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 mr-1.5" />
              )}
              Gửi báo cáo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
