"use client";

import React from "react";
import { PlusCircle } from "lucide-react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { QuestionGroupForm } from "@/features/question-groups/components/question-group-form";

export default function CreateQuestionGroupPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs />

      <div className="flex items-center gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <PlusCircle className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Tạo nhóm câu hỏi mới
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Soạn thảo đoạn văn bài đọc, email hoặc đoạn hội thoại ngữ cảnh chung cho bài thi TOEIC
          </p>
        </div>
      </div>

      <QuestionGroupForm mode="create" />
    </div>
  );
}
