"use client";

import React from "react";
import { AlertTriangle, Archive, Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExamDetail } from "@/types/exam";

export interface DeleteExamDialogProps {
  exam: ExamDetail | null;
  isOpen: boolean;
  isDeleting?: boolean;
  isArchiving?: boolean;
  hasAttemptsConflictError?: string | null;
  onClose: () => void;
  onConfirmDelete: () => void;
  onArchiveInstead?: () => void;
}

export function DeleteExamDialog({
  exam,
  isOpen,
  isDeleting = false,
  isArchiving = false,
  hasAttemptsConflictError = null,
  onClose,
  onConfirmDelete,
  onArchiveInstead,
}: DeleteExamDialogProps) {
  if (!exam) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <DialogTitle className="text-base font-bold">
              Xác nhận xóa đề thi
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-600 dark:text-slate-400 pt-1">
            Bạn có chắc chắn muốn xóa đề thi{" "}
            <strong className="text-slate-900 dark:text-slate-100">
              &ldquo;{exam.title}&rdquo;
            </strong>
            ? Đề thi chưa phát sinh lượt làm bài sẽ được xóa mềm khỏi danh sách.
          </DialogDescription>
        </DialogHeader>

        {/* Review Focus 2: 409 ERR_EXAM_HAS_ATTEMPTS Conflict Warning & One-Click Archive */}
        {hasAttemptsConflictError && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-2"
          >
            <p className="font-semibold">{hasAttemptsConflictError}</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              Hệ thống nghiêm cấm xóa đề thi đã có học viên dự thi để bảo vệ toàn
              vẹn bảng điểm lịch sử. Bạn có thể chuyển đề thi này sang trạng
              thái Lưu trữ (Archived) ngay bên dưới.
            </p>
          </div>
        )}

        <DialogFooter className="flex flex-wrap items-center justify-end gap-2 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-xl text-xs cursor-pointer"
          >
            Hủy bỏ
          </Button>

          {hasAttemptsConflictError && onArchiveInstead ? (
            <Button
              type="button"
              size="sm"
              disabled={isArchiving}
              onClick={onArchiveInstead}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs cursor-pointer"
            >
              {isArchiving ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Archive className="w-3.5 h-3.5 mr-1.5" />
              )}
              Chuyển sang Lưu trữ (Archived)
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={isDeleting}
              onClick={onConfirmDelete}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs cursor-pointer"
            >
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              )}
              Xóa đề thi
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
