"use client";

import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Flag, RefreshCw } from "lucide-react";
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
  QuestionReportReasonBadge,
  QuestionReportStatusBadge,
} from "@/features/question-reports/components/question-report-badges";
import {
  MyQuestionReportItem,
  QuestionReportStatus,
} from "@/types/question-report";

export interface MyReportsTableProps {
  items: MyQuestionReportItem[];
  total: number;
  page: number;
  limit: 10 | 20;
  status?: QuestionReportStatus;
  isLoading?: boolean;
  isFetching?: boolean;
  onRefresh: () => void;
  onStatusChange: (status?: QuestionReportStatus) => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: 10 | 20) => void;
}

export function MyReportsTable({
  items,
  total,
  page,
  limit,
  status,
  isLoading = false,
  isFetching = false,
  onRefresh,
  onStatusChange,
  onPageChange,
  onLimitChange,
}: MyReportsTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const [pageJumpInput, setPageJumpInput] = useState(String(page));
  const [prevPage, setPrevPage] = useState(page);

  if (page !== prevPage) {
    setPrevPage(page);
    setPageJumpInput(String(page));
  }

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

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <select
          aria-label="Lọc trạng thái báo cáo của tôi"
          value={status || ""}
          onChange={(e) =>
            onStatusChange(
              (e.target.value || undefined) as QuestionReportStatus | undefined
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
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center space-y-2">
          <Flag className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Chưa có báo cáo câu hỏi lỗi nào
          </p>
          <p className="text-xs text-slate-500">
            Khi xem lại bài làm, bạn có thể gửi báo cáo nếu phát hiện sai sót về
            đáp án hoặc nội dung câu hỏi.
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
                <TableHead className="w-[170px] text-xs font-semibold">
                  Lý do
                </TableHead>
                <TableHead className="min-w-[200px] text-xs font-semibold">
                  Mô tả của bạn
                </TableHead>
                <TableHead className="w-[130px] text-xs font-semibold">
                  Trạng thái
                </TableHead>
                <TableHead className="min-w-[200px] text-xs font-semibold">
                  Phản hồi từ Giáo viên
                </TableHead>
                <TableHead className="w-[110px] text-xs font-semibold">
                  Ngày gửi
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
                      {rep.questionCode && (
                        <div>
                          <CodeBadge code={rep.questionCode} label="Câu" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <QuestionReportReasonBadge reason={rep.reason} />
                  </TableCell>
                  <TableCell className="text-xs text-slate-700 dark:text-slate-300">
                    {rep.description || (
                      <span className="italic text-slate-400">
                        (Không có mô tả thêm)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <QuestionReportStatusBadge status={rep.status} />
                  </TableCell>
                  <TableCell className="text-xs text-slate-700 dark:text-slate-300">
                    {rep.resolutionNote || (
                      <span className="italic text-slate-400">
                        Đang chờ phản hồi...
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                    {new Date(rep.createdAt).toLocaleDateString("vi-VN")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Rule #1006 Pagination */}
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
            <label htmlFor="my-reports-page-jump">Đi tới trang:</label>
            <input
              id="my-reports-page-jump"
              aria-label="Nhập số trang báo cáo của tôi"
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
