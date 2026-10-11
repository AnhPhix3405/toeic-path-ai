"use client";

import React, { Suspense } from "react";
import { HelpCircle } from "lucide-react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { QuestionFilters } from "@/features/questions/components/question-filters";
import { QuestionTable } from "@/features/questions/components/question-table";
import { useSyncFilterWithUrl } from "@/hooks/use-sync-filter-with-url";

function QuestionBankContent() {
  // Sync state between Zustand and URL search params (PM Point 3)
  useSyncFilterWithUrl();

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Ngân hàng câu hỏi TOEIC
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quản lý, tìm kiếm và phân loại câu hỏi trắc nghiệm theo 7 phần thi TOEIC (Part 1–7)
          </p>
        </div>
      </div>

      {/* Filters & Actions Bar */}
      <QuestionFilters />

      {/* Data Table */}
      <QuestionTable />
    </div>
  );
}

export default function QuestionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Đang tải ngân hàng câu hỏi...</div>}>
      <QuestionBankContent />
    </Suspense>
  );
}
