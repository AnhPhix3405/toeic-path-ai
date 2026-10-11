"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Edit2,
  FileQuestion,
  Layers,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuestionStatusBadge } from "@/features/questions/components/question-status-badge";
import { QuestionDifficultyBadge } from "@/features/questions/components/question-difficulty-badge";
import { useQuestion } from "@/hooks/use-questions";

const optionLabels = ["A", "B", "C", "D", "E", "F"];

export default function QuestionDetailPage() {
  const params = useParams<{ id: string }>();
  const questionId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : null;

  const { data: question, isLoading, isPending, error, refetch } = useQuestion(questionId);

  if (!questionId || isLoading || isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-sm">Đang tải chi tiết câu hỏi...</p>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/40 max-w-lg mx-auto my-12 space-y-4">
        <p className="font-semibold text-rose-600 dark:text-rose-400">Không tìm thấy câu hỏi hoặc câu hỏi đã bị xóa.</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Mã định danh câu hỏi: <code className="font-mono">{questionId}</code>
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl">
            Thử tải lại
          </Button>
          <Button asChild size="sm" className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
            <Link href="/questions">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Quay lại danh sách
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Breadcrumbs />

      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl">
            <Link href="/questions">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Chi tiết câu hỏi
              </h1>
              <QuestionStatusBadge status={question.status} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">ID: {question.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={`/questions/${question.id}/edit`}>
              <Edit2 className="w-4 h-4 mr-1.5" />
              Chỉnh sửa
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
        {/* Metadata Badges */}
        <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800 text-xs">
          {question.part && (
            <Badge variant="secondary" className="font-medium text-xs py-1 px-2.5">
              Part {question.part.partNumber}: {question.part.name}
            </Badge>
          )}
          <QuestionDifficultyBadge difficulty={question.difficulty} />
          <div className="flex items-center text-slate-400 ml-auto">
            <Calendar className="w-3.5 h-3.5 mr-1" />
            {new Date(question.createdAt).toLocaleDateString("vi-VN")}
          </div>
        </div>

        {/* Question Prompt */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Nội dung câu hỏi
          </span>
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
            {question.content}
          </p>
        </div>

        {/* Options List */}
        <div className="space-y-3 pt-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Phương án lựa chọn ({question.options?.length || 0})
          </span>
          <div className="grid grid-cols-1 gap-2.5">
            {question.options?.map((opt, idx) => {
              const label = opt.label || optionLabels[idx] || String.fromCharCode(65 + idx);
              const isCorrect = opt.isCorrect;

              return (
                <div
                  key={opt.id}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                    isCorrect
                      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 font-medium"
                      : "bg-slate-50/50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      isCorrect
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {label}
                  </span>
                  <span className="flex-1 text-sm">{opt.content}</span>
                  {isCorrect && (
                    <span className="inline-flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Đáp án chính xác
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Explanation Card */}
        {question.explanation && (
          <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-400">
              <Sparkles className="w-4 h-4" />
              Lời giải chi tiết
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {question.explanation}
            </p>
          </div>
        )}

        {/* Topics & Skills Chips */}
        {((question.topics && question.topics.length > 0) ||
          (question.skills && question.skills.length > 0)) && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            {question.topics && question.topics.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-400">Chủ đề:</span>
                <div className="flex flex-wrap gap-1.5">
                  {question.topics.map((t) => (
                    <Badge key={t.id} variant="outline" className="text-xs">
                      {t.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {question.skills && question.skills.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-400">Kỹ năng:</span>
                <div className="flex flex-wrap gap-1.5">
                  {question.skills.map((s) => (
                    <Badge key={s.id} variant="outline" className="text-xs">
                      {s.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
