"use client";

import React from "react";
import { AlertTriangle, Clock, Loader2, Play, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AnotherExamInProgressErrorData } from "@/types/exam-attempt";

export interface ActiveAttemptConflictDialogProps {
  conflict: AnotherExamInProgressErrorData | null;
  isAbandoning: boolean;
  onClose: () => void;
  onResumeOldAttempt: (attemptId: string) => void;
  onAbandonAndStartNew: (attemptId: string) => void;
}

function formatRemaining(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins} phút ${String(secs).padStart(2, "0")} giây`;
}

export function ActiveAttemptConflictDialog({
  conflict,
  isAbandoning,
  onClose,
  onResumeOldAttempt,
  onAbandonAndStartNew,
}: ActiveAttemptConflictDialogProps) {
  return (
    <Dialog open={Boolean(conflict)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        {conflict && (
          <>
            <DialogHeader className="space-y-2">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <DialogTitle className="text-base font-bold">
                  Bạn đang có một bài thi khác chưa hoàn thành
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
                Hệ thống chỉ cho phép làm tối đa 1 bài thi trực tuyến tại cùng
                một thời điểm để đảm bảo tính chính xác của bộ đếm giờ.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-4 space-y-2 text-xs">
              <p className="font-bold text-slate-900 dark:text-slate-100">
                {conflict.examTitle}
              </p>
              <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Thời gian còn lại:{" "}
                  <strong>{formatRemaining(conflict.remainingSeconds)}</strong>
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                Lưu ý: Nếu chọn <strong>Hủy bài cũ</strong> trên đề Full Exam có
                giới hạn số lượt, lượt thi bị hủy vẫn được tính là 1 lượt đã sử
                dụng.
              </p>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isAbandoning}
                onClick={() => onResumeOldAttempt(conflict.attemptId)}
                className="rounded-xl text-xs cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                Tiếp tục bài cũ
              </Button>

              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isAbandoning}
                onClick={() => onAbandonAndStartNew(conflict.attemptId)}
                className="rounded-xl text-xs cursor-pointer"
              >
                {isAbandoning ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                )}
                Hủy bài cũ &amp; Bắt đầu đề này
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
