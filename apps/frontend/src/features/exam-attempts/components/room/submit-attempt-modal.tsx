"use client";

import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Flag,
  HelpCircle,
  Loader2,
  Send,
  WifiOff,
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

export interface SubmitAttemptModalProps {
  isOpen: boolean;
  totalQuestions: number;
  answeredCount: number;
  markedCount: number;
  pendingOfflineCount: number;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirmSubmit: () => void;
}

export function SubmitAttemptModal({
  isOpen,
  totalQuestions,
  answeredCount,
  markedCount,
  pendingOfflineCount,
  isSubmitting,
  onClose,
  onConfirmSubmit,
}: SubmitAttemptModalProps) {
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Send className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Xác nhận nộp bài thi
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
            Sau khi nộp bài, hệ thống sẽ chấm điểm tự động và khóa toàn bộ đáp án
            của lượt thi này.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <p className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-300">
                {answeredCount}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Đã trả lời
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <HelpCircle className="w-4 h-4 text-slate-500 mx-auto mb-1" />
              <p className="text-lg font-bold font-mono text-slate-800 dark:text-slate-200">
                {unansweredCount}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Chưa làm
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70">
              <Flag className="w-4 h-4 text-amber-600 mx-auto mb-1" />
              <p className="text-lg font-bold font-mono text-amber-700 dark:text-amber-300">
                {markedCount}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Đánh dấu xem lại
              </p>
            </div>
          </div>

          {unansweredCount > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>
                Bạn vẫn còn <strong>{unansweredCount} câu chưa chọn đáp án</strong>
                . Các câu bỏ trống sẽ được tính là chưa đúng.
              </span>
            </div>
          )}

          {pendingOfflineCount > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-800 dark:text-indigo-300">
              <WifiOff className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600" />
              <span>
                Đang có <strong>{pendingOfflineCount} đáp án chờ đồng bộ</strong>
                . Hệ thống sẽ tự động đẩy lên máy chủ ngay trước khi chấm điểm.
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-xl text-xs cursor-pointer"
          >
            Quay lại làm bài
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isSubmitting}
            onClick={onConfirmSubmit}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Đang chấm điểm...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Xác nhận nộp bài
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
