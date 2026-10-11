"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Edit3, Loader2 } from "lucide-react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Button } from "@/components/ui/button";
import { QuestionGroupForm } from "@/features/question-groups/components/question-group-form";
import { useQuestionGroup } from "@/hooks/use-question-groups";

export default function EditQuestionGroupPage() {
  const params = useParams<{ id: string }>();
  const groupId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : null;

  const { data: group, isLoading, isPending, error, refetch } = useQuestionGroup(groupId);

  if (!groupId || isLoading || isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-sm">Đang tải thông tin nhóm câu hỏi...</p>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/40 max-w-lg mx-auto my-12 space-y-4">
        <div className="text-rose-600 dark:text-rose-400 font-semibold text-base">
          Không tìm thấy nhóm câu hỏi hoặc nhóm đã bị xóa.
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Mã định danh nhóm: <code className="font-mono">{groupId}</code>
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl">
            Thử tải lại
          </Button>
          <Button asChild size="sm" className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
            <Link href="/question-groups">
              Quay lại danh sách nhóm câu hỏi
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      <div className="flex items-center gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <Edit3 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Chỉnh sửa nhóm câu hỏi
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Cập nhật tiêu đề hoặc chỉnh sửa đoạn văn bản ngữ cảnh bài đọc
          </p>
        </div>
      </div>

      <QuestionGroupForm mode="edit" initialGroup={group} />
    </div>
  );
}
