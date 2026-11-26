"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ManageExamsUrlFilterState } from "@/hooks/use-sync-manage-exams-url";
import { ExamStatus, ExamType } from "@/types/exam";

export interface ManageExamsFiltersProps {
  filter: ManageExamsUrlFilterState;
  isFetching?: boolean;
  onRefresh: () => void;
}

export function ManageExamsFilters({
  filter,
  isFetching = false,
  onRefresh,
}: ManageExamsFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filter.search);
  const [prevFilterSearch, setPrevFilterSearch] = useState(filter.search);

  if (filter.search !== prevFilterSearch) {
    setPrevFilterSearch(filter.search);
    setLocalSearch(filter.search);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filter.search) {
        filter.setSearch(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, filter]);

  const hasActiveFilters = Boolean(
    filter.search || filter.type !== "all" || filter.status !== "all"
  );

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Tìm kiếm tiêu đề đề thi..."
            className="pl-10 pr-9 h-10 rounded-xl"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch("");
                filter.setSearch("");
              }}
              aria-label="Xóa từ khóa tìm kiếm"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto">
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setLocalSearch("");
                filter.resetFilters();
              }}
              className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
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
            disabled={isFetching}
            onClick={onRefresh}
            className="rounded-xl cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 mr-1.5 ${
                isFetching ? "animate-spin text-indigo-600" : ""
              }`}
            />
            Làm mới
          </Button>

          <Button
            asChild
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
          >
            <Link href="/exams/create">
              <Plus className="w-4 h-4 mr-1.5" />
              Tạo đề thi mới
            </Link>
          </Button>
        </div>
      </div>

      {/* Dropdown Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <div>
          <Select
            value={filter.type}
            onValueChange={(val) => filter.setType(val as ExamType | "all")}
          >
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Loại đề thi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại đề thi</SelectItem>
              <SelectItem value="full_test">Full Test (200 câu - 120 phút)</SelectItem>
              <SelectItem value="mini_test">Mini Test (Luyện tập rút gọn)</SelectItem>
              <SelectItem value="placement_test">Placement Test (Đánh giá đầu vào)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Select
            value={filter.status}
            onValueChange={(val) => filter.setStatus(val as ExamStatus | "all")}
          >
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Trạng thái đề thi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="draft">Bản nháp (Draft)</SelectItem>
              <SelectItem value="published">Đã xuất bản (Published)</SelectItem>
              <SelectItem value="closed">Đã đóng (Closed)</SelectItem>
              <SelectItem value="archived">Lưu trữ (Archived)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
