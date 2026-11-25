"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Flag,
  RefreshCw,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CodeBadge } from "@/components/common/code-badge";
import {
  AdminQuestionReportItem,
  QuestionReportReason,
  QuestionReportStatus,
} from "@/types/question-report";
import {
  QUESTION_REPORT_REASON_LABELS,
  QuestionReportReasonBadge,
  QuestionReportStatusBadge,
} from "./question-report-badges";

export interface QuestionReportsQueueTableProps {
  items: AdminQuestionReportItem[];
  total: number;
  page: number;
  limit: 10 | 20;
  status?: QuestionReportStatus;
  reason?: QuestionReportReason;
  isLoading?: boolean;
  isFetching?: boolean;
  onRefresh: () => void;
  onStatusChange: (status?: QuestionReportStatus) => void;
  onReasonChange: (reason?: QuestionReportReason) => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: 10 | 20) => void;
  onResetFilters: () => void;
  onInspectReport: (reportId: string) => void;
}

export function QuestionReportsQueueTable({
  items,
  total,
  page,
  limit,
  status,
  reason,
  isLoading = false,
  isFetching = false,
  onRefresh,
  onStatusChange,
  onReasonChange,
  onPageChange,
  onLimitChange,
  onResetFilters,
  onInspectReport,
}: QuestionReportsQueueTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const [pageJumpInput, setPageJumpInput] = useState(String(page));

  useEffect(() => {
    setPageJumpInput(String(page));
  }, [page]);

  const handlePageJumpCommit = (rawVal: string) => {
    const trimmed = rawVal.trim();
    const val = Number(trimmed);
    if (
      trimmed !== "" &&
      Number.isInteger(val) &&
      val >= 1 &&
      val <= totalPages
    ) {
      if (val !== page) onPageChange(val);
      setPageJumpInput(String(val));
    } else {
      setPageJumpInput(String(page));
    }
  };

  const hasFilters = Boolean(status || reason);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Toolbar (#1007, #1008) */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Lọc theo trạng thái báo cáo"
            value={status || ""}
            onChange={(e) =>
              onStatusChange(
                (e.target.value || undefined) as
                  | QuestionReportStatus
                  | undefined
              )
            }
            className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ xử lý</option>
            <option value="in_review">Đang kiểm tra</option>
            <option value="resolved">Đã xử lý</option>
            <option value="rejected">Từ chối</option>
          </select>

          <select
            aria-label="Lọc theo lý do báo cáo"
            value={reason || ""}
            onChange={(e) =>
              onReasonChange(
                (e.target.value || undefined) as
                  | QuestionReportReason
                  | undefined
              )
            }
            className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
          >
            <option value="">Tất cả lý do</option>
            {(
              Object.keys(
                QUESTION_REPORT_REASON_LABELS
              ) as QuestionReportReason[]
            ).map((r) => (
              <option key={r} value={r}>
                {QUESTION_REPORT_REASON_LABELS[r]}
              </option>
            ))}
          </select>

          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="h-9 rounded-xl text-xs cursor-pointer"
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isFetching}
          onClick={onRefresh}
          className="h-9 rounded-xl text-xs cursor-pointer"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 mr-1.5 ${
              isFetching ? "animate-spin text-indigo-600" : ""
            }`}
          />
          Làm mới
        </Button>
      </div>

      {isLoading ? (
        <div className="p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center space-y-2">
          <Flag className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {hasFilters
              ? "Không có báo cáo câu hỏi phù hợp với bộ lọc"
              : "Chưa có báo cáo câu hỏi lỗi nào"}
          </p>
          <p className="text-xs text-slate-500">
            Các phản hồi sai sót từ học viên sẽ hiển thị tại hàng đợi này để
            Giáo viên/Admin kiểm tra và xử lý.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/70 dark:bg-slate-800/50">
              <TableRow>
                <TableHead className="w-[160px] text-xs font-semibold">
                  Mã báo cáo / Câu hỏi
                </TableHead>
                <TableHead className="min-w-[240px] text-xs font-semibold">
                  Nội dung câu hỏi &amp; Mô tả
                </TableHead>
                <TableHead className="w-[160px] text-xs font-semibold">
                  Lý do
                </TableHead>
                <TableHead className="w-[130px] text-xs font-semibold">
                  Trạng thái
                </TableHead>
                <TableHead className="w-[160px] text-xs font-semibold">
                  Người gửi
                </TableHead>
                <TableHead className="w-[110px] text-xs font-semibold">
                  Ngày gửi
                </TableHead>
                <TableHead className="w-[130px] text-right text-xs font-semibold">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((rep) => (
                <TableRow key={rep.id}>
                  <TableCell>
                    <div className="space-y-1">
                      {rep.reportCode && (
                        <div>
                          <CodeBadge code={rep.reportCode} />
                        </div>
                      )}
                      {rep.questionCode ? (
                        <Link
                          href={`/questions/${rep.questionCode}`}
                          className="inline-block"
                        >
                          <CodeBadge code={rep.questionCode} label="Câu" />
                        </Link>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-400">
                          {rep.questionId.slice(0, 8)}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1 max-w-[360px]">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                        {rep.partNumber ? `[Part ${rep.partNumber}] ` : ""}
                        {rep.questionContent || (
                          <span className="italic font-normal text-slate-400">
                            (Câu hỏi Audio / Đoạn văn nhóm không có văn bản
                            riêng)
                          </span>
                        )}
                      </p>
                      {rep.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                          Phản hồi: {rep.description}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <QuestionReportReasonBadge reason={rep.reason} />
                  </TableCell>

                  <TableCell>
                    <QuestionReportStatusBadge status={rep.status} />
                  </TableCell>

                  <TableCell className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[160px]">
                    {rep.reporterEmail || rep.reporterId.slice(0, 8)}
                  </TableCell>

                  <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                    {new Date(rep.createdAt).toLocaleDateString("vi-VN")}
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onInspectReport(rep.id)}
                      className="h-8 rounded-xl text-xs cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      Xem &amp; Xử lý
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Rule #1006: Pagination 10/20 + Page Jump */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span>
            Hiển thị <strong>{items.length}</strong> / <strong>{total}</strong>{" "}
            báo cáo (Trang {page} / {totalPages})
          </span>
          <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5">
            {([10, 20] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onLimitChange(size)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                  limit === size
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                {size} dòng
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <label htmlFor="reports-queue-page-jump">Đi tới trang:</label>
            <input
              id="reports-queue-page-jump"
              aria-label="Nhập số trang hàng đợi báo cáo"
              type="number"
              min={1}
              max={totalPages}
              value={pageJumpInput}
              onChange={(e) => setPageJumpInput(e.target.value)}
              onBlur={(e) => handlePageJumpCommit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handlePageJumpCommit((e.target as HTMLInputElement).value);
                }
              }}
              className="w-14 h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-center text-xs font-semibold"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            className="h-8 px-2.5 rounded-lg text-xs cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Trước
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            className="h-8 px-2.5 rounded-lg text-xs cursor-pointer"
          >
            Sau
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
