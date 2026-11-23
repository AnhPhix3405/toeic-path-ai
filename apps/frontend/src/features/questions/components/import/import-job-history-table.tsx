"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileArchive,
  FileSpreadsheet,
  History,
  Loader2,
  RefreshCw,
  RotateCcw,
  XCircle,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useImportJobs } from "@/hooks/use-questions-import";
import { useSyncImportJobsUrl } from "@/hooks/use-sync-import-jobs-url";
import { ImportJobDetail, ImportJobStatus } from "@/types/question-import";

export interface ImportJobHistoryTableProps {
  onSelectJob: (job: ImportJobDetail) => void;
}

function renderJobStatusBadge(status: ImportJobStatus) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800">
          <CheckCircle2 className="w-3 h-3" />
          Hoàn tất
        </span>
      );
    case "partially_completed":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800">
          <AlertTriangle className="w-3 h-3" />
          Một phần
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800">
          <XCircle className="w-3 h-3" />
          Thất bại
        </span>
      );
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800">
          <Loader2 className="w-3 h-3 animate-spin" />
          Đang xử lý
        </span>
      );
    case "pending":
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          <Clock className="w-3 h-3" />
          Đang chờ
        </span>
      );
  }
}

export function ImportJobHistoryTable({
  onSelectJob,
}: ImportJobHistoryTableProps) {
  const filter = useSyncImportJobsUrl();

  const isDateRangeInvalid = Boolean(
    filter.from && filter.to && filter.from > filter.to
  );

  const { data, isLoading, isFetching, refetch } = useImportJobs({
    page: filter.page,
    limit: filter.limit,
    status: filter.status === "all" ? undefined : filter.status,
    from:
      !isDateRangeInvalid && filter.from
        ? new Date(`${filter.from}T00:00:00.000Z`).toISOString()
        : undefined,
    to:
      !isDateRangeInvalid && filter.to
        ? new Date(`${filter.to}T23:59:59.999Z`).toISOString()
        : undefined,
  });

  const hasActiveFilters =
    filter.status !== "all" || Boolean(filter.from) || Boolean(filter.to);

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const [pageJumpInput, setPageJumpInput] = useState(String(filter.page));
  useEffect(() => {
    setPageJumpInput(String(filter.page));
  }, [filter.page]);

  const handlePageJumpCommit = (rawVal: string) => {
    const trimmed = rawVal.trim();
    const val = Number(trimmed);
    if (
      trimmed !== "" &&
      Number.isInteger(val) &&
      val >= 1 &&
      val <= totalPages
    ) {
      if (val !== filter.page) {
        filter.setPage(val);
      }
      setPageJumpInput(String(val));
    } else {
      setPageJumpInput(String(filter.page));
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Header & Filter Bar */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Lịch sử phiên Import
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Theo dõi các tệp đã tải lên, trạng thái xử lý hàng đợi và xem
                báo cáo lỗi chi tiết
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={filter.resetFilters}
                className="h-9 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-xl cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Đặt lại bộ lọc
              </Button>
            )}

            {/* Rule #1007: Refresh Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
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
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Trạng thái phiên Import
            </label>
            <Select
              value={filter.status}
              onValueChange={(val) =>
                filter.setStatus(val as ImportJobStatus | "all")
              }
            >
              <SelectTrigger className="h-9 rounded-xl text-xs">
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="pending">Đang chờ (pending)</SelectItem>
                <SelectItem value="processing">
                  Đang xử lý (processing)
                </SelectItem>
                <SelectItem value="completed">Hoàn tất (completed)</SelectItem>
                <SelectItem value="partially_completed">
                  Hoàn tất một phần (partially_completed)
                </SelectItem>
                <SelectItem value="failed">Thất bại (failed)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label
              htmlFor="import-jobs-from-date"
              className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1"
            >
              Từ ngày
            </label>
            <Input
              id="import-jobs-from-date"
              aria-label="Từ ngày"
              type="date"
              value={filter.from}
              onChange={(e) => filter.setFrom(e.target.value)}
              className="h-9 rounded-xl text-xs"
            />
          </div>

          <div>
            <label
              htmlFor="import-jobs-to-date"
              className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1"
            >
              Đến ngày
            </label>
            <Input
              id="import-jobs-to-date"
              aria-label="Đến ngày"
              type="date"
              value={filter.to}
              onChange={(e) => filter.setTo(e.target.value)}
              className="h-9 rounded-xl text-xs"
            />
          </div>
        </div>

        {/* Inline Date Range Validation Error (PMR 004 #6 & #1009) */}
        {isDateRangeInvalid && (
          <p
            role="alert"
            className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>
              Ngày bắt đầu không được lớn hơn ngày kết thúc. Vui lòng chọn lại
              khoảng thời gian hợp lệ.
            </span>
          </p>
        )}
      </div>

      {/* Table Body */}
      {isLoading ? (
        <div className="p-6 space-y-3">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <Skeleton className="h-8 flex-1 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-28 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="p-10 text-center space-y-2">
          <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Chưa có phiên Import nào
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Các lượt tải tệp Excel hoặc gói ZIP của bạn sẽ được lưu trữ và hiển
            thị tại đây.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/70 dark:bg-slate-800/50">
              <TableRow>
                <TableHead className="min-w-[220px] text-xs font-semibold">
                  Tệp tải lên
                </TableHead>
                <TableHead className="w-[120px] text-xs font-semibold">
                  Trạng thái đích
                </TableHead>
                <TableHead className="w-[140px] text-xs font-semibold">
                  Trạng thái xử lý
                </TableHead>
                <TableHead className="w-[200px] text-xs font-semibold">
                  Kết quả (Đúng / Lỗi / Nhóm)
                </TableHead>
                <TableHead className="w-[150px] text-xs font-semibold">
                  Thời gian tạo
                </TableHead>
                <TableHead className="w-[160px] text-right text-xs font-semibold">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((job) => (
                <TableRow
                  key={job.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      {job.fileType === "zip" ? (
                        <FileArchive className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : (
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[220px]">
                          {job.fileName}
                        </p>
                        <p className="text-[11px] text-slate-400 uppercase">
                          {job.fileType} • {job.totalRows} dòng
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                    {job.targetStatus === "pending_review"
                      ? "Chờ duyệt"
                      : "Bản nháp"}
                  </TableCell>

                  <TableCell>{renderJobStatusBadge(job.status)}</TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {job.successCount} thành công
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">
                        •
                      </span>
                      <span
                        className={
                          job.errorCount > 0
                            ? "font-semibold text-rose-600 dark:text-rose-400"
                            : "text-slate-500"
                        }
                      >
                        {job.errorCount} lỗi
                      </span>
                      {job.createdGroupsCount > 0 && (
                        <>
                          <span className="text-slate-300 dark:text-slate-700">
                            •
                          </span>
                          <span className="text-indigo-600 dark:text-indigo-400">
                            {job.createdGroupsCount} nhóm
                          </span>
                        </>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {new Date(job.createdAt).toLocaleString("vi-VN")}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectJob(job)}
                        className="h-8 px-2.5 rounded-lg text-xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Xem chi tiết
                      </Button>

                      {job.fileUrl && (
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-lg"
                          title="Tải tệp gốc"
                        >
                          <a
                            href={job.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Rule #1006: Pagination Component with 10 or 20 page size options */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Hiển thị{" "}
            <strong className="text-slate-700 dark:text-slate-300">
              {items.length}
            </strong>{" "}
            /{" "}
            <strong className="text-slate-700 dark:text-slate-300">
              {total}
            </strong>{" "}
            phiên import (Trang {filter.page} / {totalPages})
          </span>

          {/* Page Size Selector 10 or 20 (#1006) */}
          <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5">
            <button
              type="button"
              onClick={() => filter.setLimit(10)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors duration-200 ${
                filter.limit === 10
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              10 dòng
            </button>
            <button
              type="button"
              onClick={() => filter.setLimit(20)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors duration-200 ${
                filter.limit === 20
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              20 dòng
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Rule #1006: Page number jump input */}
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 mr-1">
            <label htmlFor="import-jobs-page-jump-input" className="whitespace-nowrap">
              Đi tới trang:
            </label>
            <input
              id="import-jobs-page-jump-input"
              aria-label="Nhập số trang cần xem"
              type="number"
              min={1}
              max={totalPages}
              value={pageJumpInput}
              onChange={(e) => {
                const raw = e.target.value;
                setPageJumpInput(raw);
                const val = Number(raw.trim());
                if (
                  raw.trim() !== "" &&
                  Number.isInteger(val) &&
                  val >= 1 &&
                  val <= totalPages &&
                  val !== filter.page
                ) {
                  filter.setPage(val);
                }
              }}
              onBlur={(e) => handlePageJumpCommit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handlePageJumpCommit((e.target as HTMLInputElement).value);
                }
              }}
              className="w-14 h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-center text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => filter.setPage(Math.max(1, filter.page - 1))}
            disabled={filter.page <= 1}
            className="h-8 px-2.5 rounded-lg text-xs cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Trước
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              filter.setPage(Math.min(totalPages, filter.page + 1))
            }
            disabled={filter.page >= totalPages}
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
