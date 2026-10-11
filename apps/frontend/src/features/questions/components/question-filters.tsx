"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RotateCcw, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuestionFilterStore } from "@/stores/question-filter.store";
import { useToeicParts } from "@/hooks/use-classification";
import { QuestionDifficulty, QuestionStatus } from "@/types/question";

export function QuestionFilters() {
  const store = useQuestionFilterStore();
  const { data: parts } = useToeicParts();

  // Local state for debounced search input
  const [localSearch, setLocalSearch] = useState(store.search);

  useEffect(() => {
    setLocalSearch(store.search);
  }, [store.search]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== store.search) {
        store.setSearch(localSearch);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [localSearch, store]);

  const hasActiveFilters = Boolean(
    store.search ||
      store.partId ||
      store.difficulty ||
      store.status ||
      store.topicIds.length > 0 ||
      store.skillIds.length > 0
  );

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search Bar with Debounce */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Tìm kiếm nội dung câu hỏi..."
            className="pl-10 pr-9 h-10 rounded-xl"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch("");
                store.setSearch("");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              aria-label="Xóa từ khóa"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setLocalSearch("");
                store.resetFilters();
              }}
              className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Đặt lại bộ lọc
            </Button>
          )}

          <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
            <Link href="/questions/create">
              <Plus className="w-4 h-4 mr-1.5" />
              Tạo câu hỏi
            </Link>
          </Button>
        </div>
      </div>

      {/* Dropdown Filters Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        {/* TOEIC Part Filter */}
        <div>
          <Select
            value={store.partId || "all"}
            onValueChange={(val) => store.setPartId(val === "all" ? null : val)}
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

        {/* Difficulty Filter */}
        <div>
          <Select
            value={store.difficulty || "all"}
            onValueChange={(val) =>
              store.setDifficulty(val === "all" ? null : (val as QuestionDifficulty))
            }
          >
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Độ khó" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả độ khó</SelectItem>
              <SelectItem value="easy">Dễ (Easy)</SelectItem>
              <SelectItem value="medium">Trung bình (Medium)</SelectItem>
              <SelectItem value="hard">Khó (Hard)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div>
          <Select
            value={store.status || "all"}
            onValueChange={(val) =>
              store.setStatus(val === "all" ? null : (val as QuestionStatus))
            }
          >
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Trạng thái kiểm duyệt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="draft">Bản nháp</SelectItem>
              <SelectItem value="pending_review">Chờ duyệt</SelectItem>
              <SelectItem value="published">Đã xuất bản</SelectItem>
              <SelectItem value="revision_requested">Yêu cầu sửa</SelectItem>
              <SelectItem value="rejected">Từ chối</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
