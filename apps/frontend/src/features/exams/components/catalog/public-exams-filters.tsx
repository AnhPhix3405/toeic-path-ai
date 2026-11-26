"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw, RotateCcw, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PublicExamsUrlFilterState } from "@/hooks/use-sync-public-exams-url";
import { ExamType } from "@/types/exam";

export interface PublicExamsFiltersProps {
  filter: PublicExamsUrlFilterState;
  isFetching?: boolean;
  onRefresh: () => void;
}

export function PublicExamsFilters({
  filter,
  isFetching = false,
  onRefresh,
}: PublicExamsFiltersProps) {
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

  const hasActiveFilters = Boolean(filter.search || filter.type !== "all");

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Tìm kiếm đề thi thử TOEIC theo tiêu đề..."
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

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-48">
          <Select
            value={filter.type}
            onValueChange={(val) => filter.setType(val as ExamType | "all")}
          >
            <SelectTrigger className="h-10 rounded-xl text-xs">
              <SelectValue placeholder="Loại đề thi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại đề thi</SelectItem>
              <SelectItem value="full_test">Full Test (200 câu)</SelectItem>
              <SelectItem value="mini_test">Mini Test</SelectItem>
              <SelectItem value="placement_test">Placement Test</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setLocalSearch("");
              filter.resetFilters();
            }}
            className="h-10 text-xs text-slate-500 cursor-pointer"
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
          className="h-10 rounded-xl text-xs cursor-pointer"
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
  );
}
