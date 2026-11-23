"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
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
import { ClientImportPreviewResult } from "@/lib/validations/question-import.schema";
import { ImportTargetStatus } from "@/types/question-import";

export interface ImportPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewData: ClientImportPreviewResult | null;
  targetStatus: ImportTargetStatus;
  isSubmitting?: boolean;
  onConfirmImport: () => void;
}

type PreviewFilterTab = "all" | "valid" | "invalid";

export function ImportPreviewModal({
  open,
  onOpenChange,
  previewData,
  targetStatus,
  isSubmitting = false,
  onConfirmImport,
}: ImportPreviewModalProps) {
  const [filterTab, setFilterTab] = useState<PreviewFilterTab>("all");

  const filteredRows = useMemo(() => {
    if (!previewData) return [];
    if (filterTab === "valid") {
      return previewData.rows.filter((r) => r.isValid);
    }
    if (filterTab === "invalid") {
      return previewData.rows.filter((r) => !r.isValid);
    }
    return previewData.rows;
  }, [previewData, filterTab]);

  if (!previewData) return null;

  const canConfirm =
    !previewData.headerError &&
    previewData.totalRows > 0 &&
    previewData.validCount > 0 &&
    !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[88vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Xem trước dữ liệu Import (&lt; 100 dòng)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tệp:{" "}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {previewData.fileName}
                </span>{" "}
                • Chế độ lưu:{" "}
                <span className="font-medium text-indigo-600 dark:text-indigo-400">
                  {targetStatus === "pending_review"
                    ? "Gửi duyệt ngay (pending_review)"
                    : "Lưu bản nháp (draft)"}
                </span>
              </DialogDescription>
            </div>
          </div>

          {/* Summary Badges */}
          <div className="flex flex-wrap items-center gap-2.5 mt-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Tổng số: {previewData.totalRows} dòng
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {previewData.validCount} hợp lệ
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800/60">
              <XCircle className="w-3.5 h-3.5" />
              {previewData.invalidCount} dòng lỗi
            </span>
            {previewData.groupedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                <Layers className="w-3.5 h-3.5" />
                {previewData.groupedCount} nhóm câu hỏi (Group_ID)
              </span>
            )}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {previewData.headerError ? (
            <div
              role="alert"
              className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 flex items-start gap-3 text-rose-700 dark:text-rose-300 text-sm"
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Không thể tiếp tục Import</p>
                <p className="text-xs mt-1">{previewData.headerError}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Filter Tabs */}
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                  <button
                    type="button"
                    onClick={() => setFilterTab("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-200 ${
                      filterTab === "all"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    Tất cả ({previewData.totalRows})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab("valid")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-200 ${
                      filterTab === "valid"
                        ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    Hợp lệ ({previewData.validCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab("invalid")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-200 ${
                      filterTab === "invalid"
                        ? "bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    Có lỗi ({previewData.invalidCount})
                  </button>
                </div>

                {previewData.invalidCount > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Lưu ý: Nếu câu hỏi con trong nhóm bị lỗi, toàn bộ nhóm đó sẽ bị rollback (Group Atomicity).
                  </p>
                )}
              </div>

              {/* Preview Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                    <TableRow>
                      <TableHead className="w-[70px] text-xs font-semibold">
                        Dòng
                      </TableHead>
                      <TableHead className="w-[70px] text-xs font-semibold">
                        Part
                      </TableHead>
                      <TableHead className="w-[110px] text-xs font-semibold">
                        Group_ID
                      </TableHead>
                      <TableHead className="min-w-[220px] text-xs font-semibold">
                        Nội dung câu hỏi
                      </TableHead>
                      <TableHead className="w-[80px] text-xs font-semibold">
                        Đáp án
                      </TableHead>
                      <TableHead className="w-[120px] text-xs font-semibold">
                        Media_Ref
                      </TableHead>
                      <TableHead className="min-w-[220px] text-xs font-semibold">
                        Kiểm tra hợp lệ
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row) => (
                      <TableRow
                        key={row.rowNumber}
                        className={
                          row.isValid
                            ? "hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                            : "bg-rose-50/40 dark:bg-rose-950/20"
                        }
                      >
                        <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-400">
                          #{row.rowNumber}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-900 dark:text-slate-100">
                          {row.partNumber ? `Part ${row.partNumber}` : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                          {row.groupId || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-800 dark:text-slate-200 max-w-[260px] truncate">
                          {row.questionText || (
                            <span className="italic text-slate-400">
                              (Không có văn bản — Audio/Group)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          {row.correctAnswer || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                          {row.mediaRef || "—"}
                        </TableCell>
                        <TableCell>
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Hợp lệ
                            </span>
                          ) : (
                            <ul className="space-y-0.5 text-xs text-rose-600 dark:text-rose-400">
                              {row.errors.map((err, i) => (
                                <li key={i} className="flex items-start gap-1">
                                  <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                  <span>{err}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="rounded-xl cursor-pointer"
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            onClick={onConfirmImport}
            disabled={!canConfirm}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Xác nhận Import ({previewData.validCount} câu hỏi)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
