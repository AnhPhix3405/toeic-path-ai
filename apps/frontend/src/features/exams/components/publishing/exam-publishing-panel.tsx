"use client";

import React from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Loader2,
  Lock,
  RotateCcw,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ExamStatusBadge,
  ExamTypeBadge,
} from "@/features/exams/components/exam-badges";
import {
  ChangeExamStatusDto,
  ExamStatus,
  ExamType,
  PublishChecklistErrorInfo,
} from "@/types/exam";

export interface ExamPublishingPanelProps {
  examId: string;
  title: string;
  type?: ExamType;
  status: ExamStatus;
  version: number;
  openAt?: string | null;
  totalActualQuestions: number;
  totalTargetQuestions: number;
  checklistError?: PublishChecklistErrorInfo | null;
  isMutating?: boolean;
  onPublish: (dto: ChangeExamStatusDto) => Promise<void> | void;
  onUnpublish: (dto: ChangeExamStatusDto) => Promise<void> | void;
  onCloseExam: (dto: ChangeExamStatusDto) => Promise<void> | void;
  onArchiveExam: (dto: ChangeExamStatusDto) => Promise<void> | void;
}

export function ExamPublishingPanel({
  title,
  type = "full_test",
  status,
  version,
  openAt = null,
  totalActualQuestions,
  totalTargetQuestions,
  checklistError = null,
  isMutating = false,
  onPublish,
  onUnpublish,
  onCloseExam,
  onArchiveExam,
}: ExamPublishingPanelProps) {
  const isQuotaMet =
    totalTargetQuestions > 0 && totalActualQuestions === totalTargetQuestions;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {title}
            </h2>
            <ExamTypeBadge type={type} />
            <ExamStatusBadge status={status} openAt={openAt} />
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
              Phiên bản v{version}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Tiến độ hoàn thiện câu hỏi:</span>
            <strong
              className={
                isQuotaMet
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }
            >
              {totalActualQuestions} / {totalTargetQuestions} câu hỏi
            </strong>
            {isQuotaMet && (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Đủ chỉ tiêu số lượng
              </span>
            )}
          </div>
        </div>

        {/* Lifecycle Action Buttons (UC18) */}
        <div className="flex flex-wrap items-center gap-2">
          {status === "draft" && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isMutating}
                onClick={() => onArchiveExam({ version })}
                className="rounded-xl text-xs cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5 mr-1.5" />
                Lưu trữ (Archive)
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={isMutating}
                onClick={() => onPublish({ version })}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs cursor-pointer"
              >
                {isMutating ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                )}
                Xuất bản đề thi
              </Button>
            </>
          )}

          {status === "published" && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isMutating}
                onClick={() => onUnpublish({ version })}
                className="rounded-xl text-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Rút về bản nháp (Unpublish)
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={isMutating}
                onClick={() => onCloseExam({ version })}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 mr-1.5" />
                Đóng đề thi (Close)
              </Button>
            </>
          )}

          {status === "closed" && (
            <Button
              type="button"
              size="sm"
              disabled={isMutating}
              onClick={() => onArchiveExam({ version })}
              className="rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5 mr-1.5" />
              Lưu trữ đề thi (Archive)
            </Button>
          )}
        </div>
      </div>

      {/* Review Focus 4: Publish Checklist Failure Report */}
      {checklistError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs space-y-2"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">
                Chưa đạt điều kiện thẩm định Xuất bản (Publish Checklist):
              </p>
              <p>{checklistError.message}</p>

              {checklistError.invalidQuestionIds &&
                checklistError.invalidQuestionIds.length > 0 && (
                  <div className="pt-1">
                    <p className="font-semibold">
                      Danh sách mã câu hỏi cần kiểm tra lại (thiếu Audio/Hình
                      ảnh hoặc thiếu đoạn văn):
                    </p>
                    <ul className="list-disc list-inside font-mono text-[11px] space-y-0.5 mt-1">
                      {checklistError.invalidQuestionIds.map((qid) => (
                        <li key={qid}>{qid}</li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
