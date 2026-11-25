"use client";

import React from "react";
import {
  AttemptReviewFilter,
  ReviewFilterCounts,
} from "@/types/exam-attempt";
import { cn } from "@/lib/utils";

export interface ReviewFilterBarProps {
  filterCounts: ReviewFilterCounts;
  activeFilter: AttemptReviewFilter;
  /** PMR 033 #2: Dynamic available parts from the attempt (never hardcoded 1..7) */
  availableParts: number[];
  activePartNumber?: number;
  onFilterChange: (filter: AttemptReviewFilter) => void;
  onPartChange: (partNumber?: number) => void;
}

const FILTER_TABS: Array<{
  key: AttemptReviewFilter;
  label: string;
  activeClass: string;
}> = [
  { key: "all", label: "Tất cả", activeClass: "bg-indigo-600 text-white" },
  { key: "correct", label: "Đúng", activeClass: "bg-emerald-600 text-white" },
  { key: "wrong", label: "Sai", activeClass: "bg-rose-600 text-white" },
  { key: "skipped", label: "Bỏ trống", activeClass: "bg-slate-700 text-white" },
  { key: "marked", label: "Đánh dấu", activeClass: "bg-amber-600 text-white" },
];

export function ReviewFilterBar({
  filterCounts,
  activeFilter,
  availableParts,
  activePartNumber,
  onFilterChange,
  onPartChange,
}: ReviewFilterBarProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div
          role="tablist"
          aria-label="Lọc câu hỏi theo trạng thái"
          className="flex flex-wrap items-center gap-1.5"
        >
          {FILTER_TABS.map((tab) => {
            const isSelected = activeFilter === tab.key;
            const count = filterCounts[tab.key] ?? 0;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onFilterChange(tab.key)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5",
                  isSelected
                    ? tab.activeClass
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-md text-[10px] font-mono",
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Part Pills (PMR 033 #2) */}
        {availableParts.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 md:pb-0">
            <button
              type="button"
              onClick={() => onPartChange(undefined)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer",
                activePartNumber === undefined
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              Tất cả Part
            </button>
            {availableParts.map((partNum) => {
              const isSelected = activePartNumber === partNum;
              return (
                <button
                  key={partNum}
                  type="button"
                  onClick={() => onPartChange(partNum)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer",
                    isSelected
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  )}
                >
                  Part {partNum}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
