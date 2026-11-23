"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Send,
  XCircle,
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
import { reviewFeedbackSchema } from "@/lib/validations/question-review.schema";

export interface FeedbackActionModalProps {
  open: boolean;
  mode: "revision" | "reject";
  hasQuestionGroup?: boolean;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: {
    feedback: string;
    applyToWholeGroup: boolean;
  }) => Promise<void> | void;
}

export function FeedbackActionModal({
  open,
  mode,
  hasQuestionGroup = false,
  isSubmitting = false,
  onOpenChange,
  onConfirm,
}: FeedbackActionModalProps) {
  const [feedback, setFeedback] = useState("");
  const [applyToWholeGroup, setApplyToWholeGroup] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isRevision = mode === "revision";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = reviewFeedbackSchema.safeParse({
      feedback,
      applyToWholeGroup,
    });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      setErrorMsg(
        firstIssue?.message ||
          "Vui lòng nhập nhận xét chi tiết và hướng dẫn chỉnh sửa cho giáo viên."
      );
      return;
    }

    setErrorMsg(null);
    await onConfirm({
      feedback: parsed.data.feedback,
      applyToWholeGroup: Boolean(parsed.data.applyToWholeGroup),
    });
    setFeedback("");
    setApplyToWholeGroup(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isRevision
                  ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
                  : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
              }`}
            >
              {isRevision ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isRevision
                  ? "Yêu cầu chỉnh sửa câu hỏi (revision_requested)"
                  : "Từ chối xuất bản câu hỏi (rejected)"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isRevision
                  ? "Trả câu hỏi về cho chính giáo viên biên soạn để khắc phục lỗi trọng yếu."
                  : "Từ chối đưa câu hỏi này vào ngân hàng đề thi chính thức."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-2">
          <div>
            <label
              htmlFor="review-feedback-textarea"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              {isRevision
                ? "Nhận xét chi tiết & Hướng dẫn chỉnh sửa"
                : "Lý do từ chối câu hỏi"}{" "}
              <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="review-feedback-textarea"
              rows={4}
              value={feedback}
              onChange={(e) => {
                setFeedback(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder={
                isRevision
                  ? "Ví dụ: Đáp án B sai ngữ pháp, vui lòng kiểm tra lại thì của động từ và bổ sung lời giải chi tiết..."
                  : "Ví dụ: Câu hỏi trùng lặp nội dung hoặc vi phạm bản quyền tài liệu..."
              }
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            {/* Rule #1009: Inline Validation Message below validated field */}
            {errorMsg && (
              <p
                role="alert"
                className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </p>
            )}
          </div>

          {hasQuestionGroup && (
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={applyToWholeGroup}
                onChange={(e) => setApplyToWholeGroup(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <div className="text-xs">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Áp dụng đồng bộ cho toàn bộ câu hỏi cùng nhóm
                  (applyToWholeGroup)
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Chuyển trạng thái tất cả các câu hỏi con thuộc cùng đoạn văn /
                  audio này để giáo viên sửa đồng bộ.
                </p>
              </div>
            </label>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl text-xs cursor-pointer"
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={`rounded-xl text-xs text-white cursor-pointer ${
                isRevision
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 mr-1.5" />
              )}
              {isRevision ? "Gửi yêu cầu chỉnh sửa" : "Xác nhận từ chối"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export interface OptimisticLockConflictModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReloadLatest: () => void;
}

export function OptimisticLockConflictModal({
  open,
  onOpenChange,
  onReloadLatest,
}: OptimisticLockConflictModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Xung đột phiên bản dữ liệu (Optimistic Locking)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Mã lỗi: <code className="font-mono">ERR_CONCURRENCY_CONFLICT</code>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Nội dung hoặc trạng thái của câu hỏi này vừa được cập nhật bởi một
          Reviewer hoặc Giáo viên khác. Để đảm bảo tính toàn vẹn dữ liệu, vui
          lòng tải lại phiên bản mới nhất trước khi tiếp tục thao tác.
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs cursor-pointer"
          >
            Đóng
          </Button>
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onReloadLatest();
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Tải lại dữ liệu mới nhất
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
