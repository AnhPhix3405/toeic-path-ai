"use client";

import React from "react";
import { PlusCircle } from "lucide-react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { SingleQuestionForm } from "@/features/questions/components/single-question-form";

export default function CreateQuestionPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs />

      <div className="flex items-center gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <PlusCircle className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Tạo câu hỏi TOEIC mới
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Soạn thảo nội dung câu hỏi trắc nghiệm, thiết lập các phương án A/B/C/D và phân loại theo Part
          </p>
        </div>
      </div>

      <SingleQuestionForm mode="create" />
    </div>
  );
}
