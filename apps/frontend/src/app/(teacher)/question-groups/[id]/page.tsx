"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Edit2,
  Eye,
  FileQuestion,
  Loader2,
} from "lucide-react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Button } from "@/components/ui/button";
import { PassageViewer } from "@/features/question-groups/components/passage-viewer";
import { ChildQuestionsManager } from "@/features/question-groups/components/child-questions-manager";
import { GroupToeicPreview } from "@/features/question-groups/components/group-toeic-preview";
import { useQuestionGroup } from "@/hooks/use-question-groups";

export default function QuestionGroupDetailPage() {
  const params = useParams<{ id: string }>();
  const groupId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : null;

  const { data: group, isLoading, isPending, error, refetch } = useQuestionGroup(groupId);
  const [activeTab, setActiveTab] = useState<"manage" | "preview">("manage");

  if (!groupId || isLoading || isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-sm">Đang tải thông tin nhóm bài đọc...</p>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/40 max-w-lg mx-auto my-12 space-y-4">
        <p className="font-semibold text-rose-600 dark:text-rose-400">Không tìm thấy nhóm câu hỏi hoặc nhóm đã bị xóa.</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Mã định danh nhóm: <code className="font-mono">{groupId}</code>
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl">
            Thử tải lại
          </Button>
          <Button asChild size="sm" className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
            <Link href="/question-groups">Quay lại danh sách</Link>
          </Button>
        </div>
      </div>
    );
  }

  const childQuestions = group.questions || [];

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl">
            <Link href="/question-groups">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
              {group.title || "Nhóm bài đọc không tiêu đề"}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Gồm {childQuestions.length} câu hỏi con liên kết
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab buttons */}
          <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("manage")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "manage"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <FileQuestion className="w-3.5 h-3.5 inline mr-1" />
              Quản lý câu hỏi
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "preview"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Eye className="w-3.5 h-3.5 inline mr-1" />
              Mô phỏng TOEIC
            </button>
          </div>

          <Button asChild variant="outline" className="rounded-xl">
            <Link href={`/question-groups/${group.id}/edit`}>
              <Edit2 className="w-4 h-4 mr-1.5" />
              Sửa bài đọc
            </Link>
          </Button>
        </div>
      </div>

      {/* Tab 1: Manage View */}
      {activeTab === "manage" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Passage Viewer */}
          <div className="lg:col-span-5 sticky top-6">
            <PassageViewer
              title={group.title || "Đoạn văn bài đọc"}
              context={group.context}
            />
          </div>

          {/* Right Column: Child Questions Manager */}
          <div className="lg:col-span-7">
            <ChildQuestionsManager
              groupId={group.id}
              questions={childQuestions}
            />
          </div>
        </div>
      )}

      {/* Tab 2: Split-View TOEIC Simulation Preview */}
      {activeTab === "preview" && (
        <GroupToeicPreview
          title={group.title}
          context={group.context}
          questions={childQuestions}
        />
      )}
    </div>
  );
}
