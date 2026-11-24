"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ExamConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReload: () => void;
}

export function ExamConflictModal({
  isOpen,
  onClose,
  onReload,
}: ExamConflictModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <DialogTitle className="text-base font-bold">
              Xung đột phiên bản đề thi (409 Conflict)
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-600 dark:text-slate-400 pt-1">
            Đề thi này vừa được cập nhật cấu hình, cấu trúc hoặc trạng thái bởi
            một phiên làm việc khác. Để đảm bảo toàn vẹn dữ liệu Optimistic
            Locking, vui lòng tải lại dữ liệu mới nhất trước khi tiếp tục.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex items-center justify-end gap-2 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-xl text-xs cursor-pointer"
          >
            Đóng
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onReload();
              onClose();
            }}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Tải lại dữ liệu mới nhất
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
