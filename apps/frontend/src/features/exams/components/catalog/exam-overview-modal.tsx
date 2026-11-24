"use client";

import React from "react";
import Link from "next/link";
import {
  CalendarClock,
  Clock,
  FileQuestion,
  Layers,
  Loader2,
  Play,
  ShieldCheck,
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
import { ExamTypeBadge } from "@/features/exams/components/exam-badges";
import { ExamOverview } from "@/types/exam";

export interface ExamOverviewModalProps {
  isOpen: boolean;
  isLoading?: boolean;
  overview: ExamOverview | null;
  onClose: () => void;
}

export function ExamOverviewModal({
  isOpen,
  isLoading = false,
  overview,
  onClose,
}: ExamOverviewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl rounded-2xl">
        {isLoading || !overview ? (
          <div className="py-12 text-center text-xs text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
            Đang tải tổng quan cấu trúc đề thi...
          </div>
        ) : (
          <>
            <DialogHeader className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <ExamTypeBadge type={overview.type} />
                {overview.isScheduled && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    <CalendarClock className="w-3 h-3" />
                    Sắp diễn ra
                  </span>
                )}
              </div>
              <DialogTitle className="text-lg font-bold">
                {overview.title}
              </DialogTitle>
              {overview.description && (
                <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
                  {overview.description}
                </DialogDescription>
              )}
            </DialogHeader>

            {/* Key Exam Metrics */}
            <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-100 dark:border-slate-800 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <span className="text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  Thời lượng thi
                </span>
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  {overview.durationMinutes} phút
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <span className="text-slate-500 flex items-center gap-1">
                  <FileQuestion className="w-3.5 h-3.5 text-indigo-500" />
                  Tổng số câu hỏi
                </span>
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  {overview.totalQuestions} câu
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <span className="text-slate-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                  Lượt thi còn lại
                </span>
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  {overview.remainingAttempts !== null
                    ? `${overview.remainingAttempts} lượt`
                    : "Không giới hạn"}
                </p>
              </div>
            </div>

            {/* Part Breakdown (Zero Answer Leakage) */}
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Cấu trúc các Phần thi ({overview.parts?.length || 0} Part)
                </span>
                {overview.allowPartPractice && (
                  <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                    Hỗ trợ bóc tách luyện từng Part độc lập
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {overview.parts?.map((part) => (
                  <div
                    key={part.partNumber}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        Part {part.partNumber}: {part.partName}
                      </p>
                      {part.suggestedDuration && (
                        <p className="text-[11px] text-slate-500">
                          Gợi ý luyện Part: {part.suggestedDuration} phút
                        </p>
                      )}
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold">
                      {part.questionCount} câu
                    </span>
                  </div>
                ))}
              </div>
            </div>

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

              {(() => {
                const isOnlyPartPracticeAvailable =
                  overview.remainingAttempts === 0 &&
                  overview.allowPartPractice;
                const isBlocked =
                  overview.isScheduled ||
                  (overview.remainingAttempts === 0 &&
                    !overview.allowPartPractice);
                const targetHref = isOnlyPartPracticeAvailable
                  ? `/exams/${overview.id}/instructions?mode=part_practice`
                  : `/exams/${overview.id}/instructions`;

                if (isBlocked) {
                  return (
                    <Button
                      type="button"
                      size="sm"
                      disabled
                      className="rounded-xl bg-indigo-600 text-white text-xs"
                    >
                      <Play className="w-3.5 h-3.5 mr-1.5" />
                      {overview.isScheduled
                        ? "Chưa đến giờ mở đề"
                        : "Đã hết lượt thi"}
                    </Button>
                  );
                }

                return (
                  <Button
                    asChild
                    size="sm"
                    onClick={onClose}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs cursor-pointer"
                  >
                    <Link href={targetHref}>
                      <Play className="w-3.5 h-3.5 mr-1.5" />
                      {isOnlyPartPracticeAvailable
                        ? "Luyện từng Part"
                        : "Bắt đầu làm bài"}
                    </Link>
                  </Button>
                );
              })()}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
