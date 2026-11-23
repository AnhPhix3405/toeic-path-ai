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
import { useToeicParts, useTopics } from "@/hooks/use-classification";
import { ReviewQueueUrlFilterState } from "@/hooks/use-sync-review-queue-url";

export interface ReviewQueueFiltersProps {
  filter: ReviewQueueUrlFilterState;
  isFetching?: boolean;
  onRefresh: () => void;
}

export function ReviewQueueFilters({
  filter,
  isFetching = false,
  onRefresh,
}: ReviewQueueFiltersProps) {
  const { data: parts } = useToeicParts();
  const { data: topics } = useTopics();

  const [localSearch, setLocalSearch] = useState(filter.search);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filter.search) {
        filter.setSearch(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, filter]);

  const hasActiveFilters = Boolean(
    filter.search ||
      (filter.partId && filter.partId !== "all") ||
      (filter.topicId && filter.topicId !== "all") ||
      filter.creatorId
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
            placeholder="Tìm kiếm nội dung câu hỏi hoặc lời giải chờ duyệt..."
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
              className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl cursor-pointer"
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
            onClick={onRefresh}
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

      {/* Filter Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        {/* TOEIC Part */}
        <div>
          <Select
            value={filter.partId || "all"}
            onValueChange={(val) => filter.setPartId(val)}
          >
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Phần thi (Part)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả Part (1–7)</SelectItem>
              {parts?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  Part {p.partNumber}: {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Topic */}
        <div>
          <Select
            value={filter.topicId || "all"}
            onValueChange={(val) => filter.setTopicId(val)}
          >
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Chủ đề (Topic)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả chủ đề</SelectItem>
              {topics?.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Creator UUID Filter */}
        <div>
          <Input
            value={filter.creatorId}
            onChange={(e) => filter.setCreatorId(e.target.value.trim())}
            placeholder="Lọc theo UUID người tạo (Creator ID)..."
            className="h-9 rounded-xl text-xs"
          />
        </div>
      </div>
    </div>
  );
}
