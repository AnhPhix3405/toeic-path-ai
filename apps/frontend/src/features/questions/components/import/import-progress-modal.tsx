"use client";

import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  Layers,
  Loader2,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ImportErrorDetail,
  ImportJobDetail,
  ImportJobStatus,
  ImportUploadResponse,
} from "@/types/question-import";
import { useImportJobPolling } from "@/hooks/use-questions-import";
import { questionsImportService } from "@/services/questions-import.service";

export interface ImportProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialResult: ImportUploadResponse | null;
  selectedJobDetail?: ImportJobDetail | null;
  onDownloadErrorCsv?: (fileName: string, errors: ImportErrorDetail[]) => void;
}

function getStatusDisplay(
  status: ImportJobStatus,
  isAsync: boolean
): {
  label: string;
  colorClass: string;
  icon: React.ReactNode;
} {
  switch (status) {
    case "completed":
      return {
        label: "Import hoàn tất 100%",
        colorClass:
          "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      };
    case "partially_completed":
      return {
        label: "Hoàn tất một phần (Có dòng lỗi)",
        colorClass:
          "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
      };
    case "failed":
      return {
        label: "Import thất bại",
        colorClass:
          "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
        icon: <XCircle className="w-4 h-4 text-rose-600" />,
      };
    case "processing":
      return {
        label: isAsync
          ? "Đang xử lý bất đồng bộ qua hàng đợi..."
          : "Đang xử lý dữ liệu...",
        colorClass:
          "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
        icon: <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />,
      };
    case "pending":
    default:
      return {
        label: "Đang chờ xử lý...",
        colorClass:
          "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
        icon: <Clock className="w-4 h-4 text-slate-500" />,
      };
  }
}

export function ImportProgressModal({
  open,
  onOpenChange,
  initialResult,
  selectedJobDetail = null,
  onDownloadErrorCsv,
}: ImportProgressModalProps) {
  const isAsyncUpload = Boolean(initialResult?.isAsync);
  const asyncJobId = isAsyncUpload && initialResult ? initialResult.jobId : null;

  const { data: polledJob } = useImportJobPolling(
    asyncJobId,
    open && isAsyncUpload
  );

  if (!initialResult && !selectedJobDetail) return null;

  const activeJobId =
    selectedJobDetail?.id || polledJob?.id || initialResult?.jobId || "";
  const activeFileName =
    selectedJobDetail?.fileName ||
    polledJob?.fileName ||
    `import-${activeJobId.slice(0, 8)}.xlsx`;

  const status: ImportJobStatus =
    selectedJobDetail?.status ||
    polledJob?.status ||
    initialResult?.status ||
    "pending";

  const totalRows =
    selectedJobDetail?.totalRows ??
    polledJob?.totalRows ??
    initialResult?.totalRows ??
    0;

  const successCount =
    selectedJobDetail?.successCount ??
    polledJob?.successCount ??
    (initialResult && !initialResult.isAsync ? initialResult.successCount : 0);

  const errorCount =
    selectedJobDetail?.errorCount ??
    polledJob?.errorCount ??
    (initialResult && !initialResult.isAsync ? initialResult.errorCount : 0);

  const createdGroupsCount =
    selectedJobDetail?.createdGroupsCount ??
    polledJob?.createdGroupsCount ??
    (initialResult && !initialResult.isAsync
      ? initialResult.createdGroupsCount
      : 0);

  const errorDetails: ImportErrorDetail[] =
    selectedJobDetail?.errorDetails ||
    polledJob?.errorDetails ||
    (initialResult && !initialResult.isAsync
      ? initialResult.errorDetails || []
      : []) ||
    [];

  const isTerminal =
    status === "completed" ||
    status === "partially_completed" ||
    status === "failed";

  const processedRows = successCount + errorCount;
  const progressPercent = isTerminal
    ? 100
    : totalRows > 0 && processedRows > 0
    ? Math.min(95, Math.round((processedRows / totalRows) * 100))
    : status === "processing"
    ? 15
    : 5;

  const statusDisplay = getStatusDisplay(status, isAsyncUpload);

  const handleDownloadCsv = () => {
    if (onDownloadErrorCsv) {
      onDownloadErrorCsv(activeFileName, errorDetails);
      return;
    }

    const csvContent = questionsImportService.exportErrorLogCsv(
      activeFileName,
      errorDetails
    );
    if (typeof window !== "undefined") {
      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `import-errors-${activeJobId.slice(0, 8) || "log"}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Báo cáo & Tiến trình Import Câu hỏi
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Mã phiên:{" "}
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {activeJobId}
                  </span>
                </DialogDescription>
              </div>
            </div>

            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${statusDisplay.colorClass}`}
            >
              {statusDisplay.icon}
              <span>{statusDisplay.label}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-medium">
                Tiến độ xử lý ({processedRows} / {totalRows} dòng)
              </span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  status === "failed"
                    ? "bg-rose-500"
                    : status === "partially_completed"
                    ? "bg-amber-500"
                    : "bg-indigo-600"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* 4 Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tổng số dòng
              </p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {totalRows}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60">
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Thành công
              </p>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                {successCount}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-800/60">
              <p className="text-xs text-rose-700 dark:text-rose-400">
                Dòng bị lỗi
              </p>
              <p className="text-xl font-bold text-rose-700 dark:text-rose-300 mt-1">
                {errorCount}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/60">
              <p className="text-xs text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                Nhóm tạo mới
              </p>
              <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300 mt-1">
                {createdGroupsCount}
              </p>
            </div>
          </div>

          {/* Error Details Section */}
          {errorDetails.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  Chi tiết các dòng bị lỗi ({errorDetails.length} lỗi)
                </h4>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadCsv}
                  className="rounded-xl text-xs border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Tải log lỗi (CSV)
                </Button>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto max-h-[300px]">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                    <TableRow>
                      <TableHead className="w-[90px] text-xs font-semibold">
                        Dòng Excel
                      </TableHead>
                      <TableHead className="w-[210px] text-xs font-semibold">
                        Mã lỗi (Code)
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Mô tả lỗi chi tiết
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errorDetails.map((err, idx) => (
                      <TableRow
                        key={`${err.row}-${idx}`}
                        className="hover:bg-rose-50/30 dark:hover:bg-rose-950/20"
                      >
                        <TableCell className="text-xs font-mono font-semibold text-rose-600 dark:text-rose-400">
                          Dòng #{err.row}
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                            {err.code || "ROW_VALIDATION_ERROR"}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-800 dark:text-slate-200">
                          {err.error}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : isTerminal && status === "completed" ? (
            <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-xs">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>
                Toàn bộ {successCount} câu hỏi đã được kiểm tra hợp lệ và lưu
                vào Ngân hàng câu hỏi thành công!
              </span>
            </div>
          ) : null}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer"
          >
            Đóng hộp thoại
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
