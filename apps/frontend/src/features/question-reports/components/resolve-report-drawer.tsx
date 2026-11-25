"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CodeBadge } from "@/components/common/code-badge";
import {
  QuestionReportDetail,
  ResolvableReportStatus,
} from "@/types/question-report";
import { resolveQuestionReportSchema } from "@/lib/validations/question-report.schema";
import { extractApiErrorMeta } from "@/lib/validations/exam-attempt.schema";
import {
  useQuestionReportDetail,
  useResolveQuestionReport,
} from "@/hooks/use-question-reports";
import {
  QuestionReportReasonBadge,
  QuestionReportStatusBadge,
} from "./question-report-badges";

export interface ResolveReportDrawerProps {
  reportId: string | null;
  onClose: () => void;
}

function ResolveReportForm({
  detail,
  onSuccess,
}: {
  detail: QuestionReportDetail;
  onSuccess: () => void;
}) {
  const resolveMutation = useResolveQuestionReport();
  const isClosed = detail.status === "resolved" || detail.status === "rejected";
  const isAlreadyInReview = detail.status === "in_review";

  const [targetStatus, setTargetStatus] = useState<ResolvableReportStatus>(
    isAlreadyInReview ? "resolved" : "resolved"
  );
  const [resolutionNote, setResolutionNote] = useState(
    detail.resolutionNote || ""
  );
  const [resolveAllForQuestion, setResolveAllForQuestion] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // PMR 033 #3: Read-only mode when already resolved/rejected
  if (isClosed) {
    return (
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 dark:text-slate-200">
            Báo cáo đã được đóng
          </span>
          <QuestionReportStatusBadge status={detail.status} />
        </div>
        {detail.resolutionNote && (
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            <strong>Ghi chú xử lý:</strong> {detail.resolutionNote}
          </p>
        )}
        <p className="text-slate-500">
          Người xử lý: {detail.resolvedByEmail || "—"} • Thời điểm:{" "}
          {detail.resolvedAt
            ? new Date(detail.resolvedAt).toLocaleString("vi-VN")
            : "—"}
        </p>
      </div>
    );
  }

  const isTerminalSelection =
    targetStatus === "resolved" || targetStatus === "rejected";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const parsed = resolveQuestionReportSchema.safeParse({
      status: targetStatus,
      resolutionNote: resolutionNote.trim() ? resolutionNote.trim() : undefined,
      resolveAllForQuestion: isTerminalSelection ? resolveAllForQuestion : false,
    });

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] || "form");
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      setFieldErrors(nextErrors);
      return;
    }

    try {
      const res = await resolveMutation.mutateAsync({
        id: detail.id,
        dto: {
          status: parsed.data.status,
          resolutionNote: parsed.data.resolutionNote,
          resolveAllForQuestion: parsed.data.resolveAllForQuestion,
        },
      });
      if (res.bulkResolvedCount > 0) {
        toast.success(
          `Đã cập nhật báo cáo và đóng đồng loạt thêm ${res.bulkResolvedCount} báo cáo đang mở khác của câu hỏi này.`
        );
      } else {
        toast.success("Đã cập nhật trạng thái xử lý báo cáo thành công!");
      }
      onSuccess();
    } catch (err: unknown) {
      const meta = extractApiErrorMeta(err);
      toast.error(meta.message || "Không thể xử lý báo cáo câu hỏi.");
    }
  };

  // PMR 033 #3: Hide `in_review` option when already `in_review`
  const availableStatuses: Array<{
    value: ResolvableReportStatus;
    label: string;
  }> = [
    ...(!isAlreadyInReview
      ? [{ value: "in_review" as const, label: "Đang kiểm tra (in_review)" }]
      : []),
    { value: "resolved", label: "Đã xử lý (resolved)" },
    { value: "rejected", label: "Từ chối (rejected)" },
  ];

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800"
    >
      <div className="space-y-2">
        <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          Chuyển trạng thái xử lý *
        </span>
        <div className="flex flex-wrap gap-2">
          {availableStatuses.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setTargetStatus(opt.value);
                setFieldErrors({});
              }}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                targetStatus === opt.value
                  ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="resolve-report-note-input"
          className="block text-xs font-bold text-slate-700 dark:text-slate-300"
        >
          Ghi chú phản hồi xử lý{" "}
          {isTerminalSelection ? (
            <span className="text-rose-500">* (tối thiểu 10 ký tự)</span>
          ) : (
            <span className="text-slate-400 font-normal">(Tùy chọn)</span>
          )}
        </label>
        <Textarea
          id="resolve-report-note-input"
          rows={3}
          maxLength={1000}
          value={resolutionNote}
          onChange={(e) => {
            setResolutionNote(e.target.value);
            if (fieldErrors.resolutionNote) setFieldErrors({});
          }}
          placeholder="Nhập kết quả kiểm tra hoặc hướng xử lý phản hồi lại cho học viên..."
          className="rounded-xl text-sm"
        />
        {fieldErrors.resolutionNote && (
          <p
            role="alert"
            className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {fieldErrors.resolutionNote}
          </p>
        )}
      </div>

      {/* PMR 033 #3: Only show resolveAllForQuestion for terminal statuses */}
      {isTerminalSelection && (
        <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer text-xs">
          <input
            type="checkbox"
            checked={resolveAllForQuestion}
            onChange={(e) => setResolveAllForQuestion(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
          />
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Đóng đồng loạt tất cả báo cáo đang mở của câu hỏi này
            </p>
            <p className="text-[11px] text-slate-500">
              Áp dụng cùng trạng thái và ghi chú xử lý cho các báo cáo đang
              pending/in_review khác trên cùng câu hỏi.
            </p>
          </div>
        </label>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={resolveMutation.isPending}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs cursor-pointer"
        >
          {resolveMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5 mr-1.5" />
          )}
          Lưu kết quả xử lý
        </Button>
      </div>
    </form>
  );
}

export function ResolveReportDrawer({
  reportId,
  onClose,
}: ResolveReportDrawerProps) {
  const { data: detail, isLoading } = useQuestionReportDetail(reportId);

  return (
    <Dialog
      open={Boolean(reportId)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-2">
            <span>Chi tiết &amp; Xử lý báo cáo câu hỏi</span>
            {detail?.reportCode && <CodeBadge code={detail.reportCode} />}
            {detail && <QuestionReportStatusBadge status={detail.status} />}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Kiểm tra nội dung câu hỏi gốc, đáp án và phản hồi từ học viên trước
            khi chốt kết quả xử lý.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !detail ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <p className="text-xs">Đang tải chi tiết báo cáo...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Reporter Info */}
            <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/50 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <QuestionReportReasonBadge reason={detail.reason} />
                <span className="text-slate-500">
                  Người gửi: <strong>{detail.reporterEmail || "—"}</strong> •{" "}
                  {new Date(detail.createdAt).toLocaleString("vi-VN")}
                </span>
              </div>
              <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                {detail.description || (
                  <span className="italic text-slate-400">
                    (Học viên không nhập mô tả bổ sung)
                  </span>
                )}
              </p>
            </div>

            {/* Question Context */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {detail.questionCode && (
                    <CodeBadge code={detail.questionCode} label="Mã câu hỏi" />
                  )}
                  {detail.question.partNumber && (
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      Part {detail.question.partNumber}
                    </span>
                  )}
                </div>

                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-lg text-xs"
                >
                  <Link
                    href={`/questions/${
                      detail.questionCode || detail.questionId
                    }/edit`}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Mở trang sửa câu hỏi
                  </Link>
                </Button>
              </div>

              {detail.question.questionGroup?.passageText && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-700 dark:text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap">
                  {detail.question.questionGroup.passageText}
                </div>
              )}

              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {detail.question.content || (
                  <span className="italic text-xs font-normal text-slate-400">
                    (Câu hỏi Audio / Đoạn văn nhóm không có văn bản riêng)
                  </span>
                )}
              </p>

              <div className="space-y-1.5">
                {detail.question.options.map((opt) => (
                  <div
                    key={opt.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${
                      opt.isCorrect
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-semibold"
                        : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <span className="font-mono font-bold">{opt.label}.</span>
                    <span className="flex-1">
                      {opt.content || (
                        <span className="italic text-slate-400">
                          (Phương án Audio)
                        </span>
                      )}
                    </span>
                    {opt.isCorrect && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              {detail.question.explanation && (
                <p className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/30 p-3 rounded-lg">
                  <strong>Lời giải hiện tại:</strong>{" "}
                  {detail.question.explanation}
                </p>
              )}
            </div>

            {/* PMR 033 #3: Key form by `${detail.id}-${detail.status}` so state resets cleanly */}
            <ResolveReportForm
              key={`${detail.id}-${detail.status}`}
              detail={detail}
              onSuccess={onClose}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
