import React from "react";
import { BookOpen } from "lucide-react";

interface PassageViewerProps {
  title?: string | null;
  context: string;
  className?: string;
  maxHeight?: string;
}

export function PassageViewer({
  title,
  context,
  className = "",
  maxHeight = "max-h-[520px]",
}: PassageViewerProps) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <BookOpen className="w-4 h-4" />
        </div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
          {title || "Đoạn văn ngữ cảnh TOEIC (Passage)"}
        </h4>
      </div>

      {/* Passage Context Body with Independent Scroll (PM Point 5) */}
      <div
        className={`p-6 overflow-y-auto text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans whitespace-pre-wrap select-text ${maxHeight}`}
      >
        {context}
      </div>
    </div>
  );
}
