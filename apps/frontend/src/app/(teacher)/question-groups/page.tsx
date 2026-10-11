"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Button } from "@/components/ui/button";
import { QuestionGroupTable } from "@/features/question-groups/components/question-group-table";

export default function QuestionGroupsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Quản lý nhóm câu hỏi (Passage Groups)
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Soạn thảo đoạn văn ngữ cảnh chung và liên kết chuỗi câu hỏi con trong Part 3, 4, 6 và 7
            </p>
          </div>
        </div>

        <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm">
          <Link href="/question-groups/create">
            <Plus className="w-4 h-4 mr-2" />
            Tạo nhóm mới
          </Link>
        </Button>
      </div>

      {/* Groups Table */}
      <QuestionGroupTable />
    </div>
  );
}
